# Provides protected Supabase-backed admin operations for the Render API.
from __future__ import annotations

import asyncio
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.errors import BackendApiError, missing_env
from app.core.logging import get_logger
from app.domains.shop.service import check_naver_shopping_connection
from app.domains.video_analysis.service import create_video_analysis_from_youtube_video
from app.schemas.admin import AdminCollectionSummary, AdminOverview, AdminSystemStatus, AdminTestResult, AdminYoutubeBackfillSummary
from app.services.llm_service import call_local_llm
from app.services.youtube_service import get_channel_info, get_channel_videos_page, get_recent_videos

UTC = timezone.utc
DAILY_COLLECTION_JOB_NAME = "collect-daily-videos"
YOUTUBE_BACKFILL_JOB_NAME = "youtube-backfill"
DATA_CLEANUP_JOB_NAME = "cleanup-old-data"
DAILY_COLLECTION_SCHEDULE_TEXT = "Every day 06:00 KST"
ONE_DAY = timedelta(days=1)
DEFAULT_LIMIT = 50
MAX_LIMIT = 100
DAILY_COLLECTION_CONCURRENCY = 4
DAILY_COLLECTION_CHANNEL_LIMIT = 20
DAILY_COLLECTION_VIDEOS_PER_CHANNEL = 8
DAILY_COLLECTION_TIME_BUDGET_SECONDS = 50
DAILY_COLLECTION_CHANNEL_TIMEOUT_SECONDS = 45
DAILY_COLLECTION_LOCK_TTL_MINUTES = 30
DAILY_COLLECTION_ANALYSIS_BATCH_SIZE = 50
YOUTUBE_BACKFILL_CHANNEL_BATCH_SIZE = 5
YOUTUBE_BACKFILL_CONCURRENCY = 1
YOUTUBE_BACKFILL_PAGES_PER_CHANNEL = 3
YOUTUBE_BACKFILL_TIME_BUDGET_SECONDS = 55
YOUTUBE_BACKFILL_LOCK_TTL_MINUTES = 30
YOUTUBE_BACKFILL_MAX_RANGE_DAYS = 31
COLLECTION_PROGRESS_UPDATE_SECONDS = 5
COLLECTION_DETAIL_SAMPLE_LIMIT = 20
CLEANUP_BATCH_SIZE = 200
CLEANUP_JOB_LOG_RETENTION_DAYS = 30
CLEANUP_ADMIN_AUDIT_RETENTION_DAYS = 180
CLEANUP_INFLUENCER_VIDEO_RETENTION_DAYS = 180
CLEANUP_VIDEO_ANALYSIS_RETENTION_DAYS = 30
CLEANUP_RECOMMENDATION_OPTIONS_RETENTION_DAYS = 30
CLEANUP_GROWTH_SNAPSHOTS_RETENTION_DAYS = 400
logger = get_logger(__name__)
VIDEO_ANALYSIS_SKIP_CODES = {
    "SUBTITLE_ANALYSIS_DISABLED",
}


def _now() -> datetime:
    return datetime.now(UTC)


def _iso(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def _safe_positive_int(value: Any, default: int, minimum: int = 1, maximum: int | None = None) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    parsed = max(minimum, parsed)
    if maximum is not None:
        parsed = min(maximum, parsed)
    return parsed


def _process_memory_mb() -> dict[str, float | None]:
    current_rss: float | None = None
    peak_rss: float | None = None
    try:
        with open("/proc/self/status", "r", encoding="utf-8") as handle:
            for line in handle:
                if line.startswith("VmRSS:"):
                    current_rss = round(int(line.split()[1]) / 1024, 2)
                elif line.startswith("VmHWM:"):
                    peak_rss = round(int(line.split()[1]) / 1024, 2)
    except OSError:
        pass
    if peak_rss is None:
        try:
            import resource

            usage = resource.getrusage(resource.RUSAGE_SELF)
            peak_rss = round(float(usage.ru_maxrss) / 1024, 2)
        except Exception:
            peak_rss = None
    return {"rssMb": current_rss, "peakRssMb": peak_rss}


def _duration_seconds(started: datetime) -> float:
    return round((_now() - started).total_seconds(), 2)


def _append_sample(items: list[dict[str, Any]], item: dict[str, Any], limit: int = COLLECTION_DETAIL_SAMPLE_LIMIT) -> None:
    if len(items) < limit:
        items.append(item)


def _compact_youtube_raw(raw: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {}
    snippet = raw.get("snippet") if isinstance(raw.get("snippet"), dict) else {}
    statistics = raw.get("statistics") if isinstance(raw.get("statistics"), dict) else {}
    return {
        "kind": raw.get("kind"),
        "etag": raw.get("etag"),
        "snippet": {
            "categoryId": snippet.get("categoryId"),
            "defaultLanguage": snippet.get("defaultLanguage"),
            "defaultAudioLanguage": snippet.get("defaultAudioLanguage"),
        },
        "statistics": {
            "viewCount": statistics.get("viewCount"),
            "likeCount": statistics.get("likeCount"),
            "commentCount": statistics.get("commentCount"),
        },
    }


def _is_video_analysis_skip_error(error: Exception) -> bool:
    return isinstance(error, BackendApiError) and error.code in VIDEO_ANALYSIS_SKIP_CODES


def _video_analysis_skip_detail(error: Exception, video: dict[str, Any]) -> dict[str, Any]:
    code = error.code if isinstance(error, BackendApiError) else "UNKNOWN_SKIP_REASON"
    return {
        "youtubeVideoId": video.get("youtube_video_id"),
        "title": video.get("title"),
        "code": code,
        "message": str(error),
    }


def _video_analysis_deferred_detail(video: dict[str, Any], code: str = "VIDEO_ANALYSIS_DEFERRED") -> dict[str, Any]:
    return {
        "youtubeVideoId": video.get("youtube_video_id"),
        "title": video.get("title"),
        "code": code,
        "message": "Video metadata analysis deferred to the next collector run.",
    }


def _normalize_supabase_url() -> str:
    settings = get_settings()
    if not settings.supabase_url:
        raise missing_env("SUPABASE_URL")
    return settings.supabase_url.rstrip("/").removesuffix("/rest/v1")


def _headers(prefer: str | None = None, count: bool = False) -> dict[str, str]:
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise missing_env("SUPABASE_SERVICE_ROLE_KEY")

    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    preferences: list[str] = []
    if count:
        preferences.append("count=exact")
    if prefer:
        preferences.append(prefer)
    if preferences:
        headers["Prefer"] = ",".join(preferences)
    return headers


def _range_headers(offset: int, limit: int) -> dict[str, str]:
    safe_limit = max(1, min(limit, MAX_LIMIT))
    safe_offset = max(0, offset)
    return {"Range": f"{safe_offset}-{safe_offset + safe_limit - 1}"}


async def _request(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    payload: Any | None = None,
    prefer: str | None = None,
    count: bool = False,
    limit: int | None = None,
    offset: int = 0,
) -> tuple[Any, httpx.Headers]:
    headers = _headers(prefer=prefer, count=count)
    if limit is not None:
        headers.update(_range_headers(offset, limit))

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.request(
            method,
            f"{_normalize_supabase_url()}/rest/v1/{path}",
            headers=headers,
            params=params,
            json=payload,
        )

    if response.status_code >= 400:
        raise BackendApiError(
            f"Supabase request failed: {response.text}",
            502 if response.status_code >= 500 else response.status_code,
            "SUPABASE_ERROR",
        )

    if not response.text:
        return None, response.headers
    return response.json(), response.headers


async def _get(path: str, params: dict[str, Any] | None = None, limit: int | None = None, offset: int = 0) -> Any:
    data, _headers_result = await _request("GET", path, params=params, limit=limit, offset=offset)
    return data


async def _post(path: str, payload: Any, prefer: str | None = "return=representation") -> Any:
    data, _headers_result = await _request("POST", path, payload=payload, prefer=prefer)
    return data


async def _patch(path: str, payload: dict[str, Any], params: dict[str, Any], prefer: str | None = "return=representation") -> Any:
    data, _headers_result = await _request("PATCH", path, params=params, payload=payload, prefer=prefer)
    return data


async def _delete(path: str, params: dict[str, Any], prefer: str | None = "return=representation") -> Any:
    data, _headers_result = await _request("DELETE", path, params=params, prefer=prefer)
    return data


def _parse_count(headers: httpx.Headers) -> int:
    content_range = headers.get("content-range", "")
    match = re.search(r"/(\d+|\*)$", content_range)
    if match and match.group(1).isdigit():
        return int(match.group(1))
    return 0


async def _count(path: str, params: dict[str, Any] | None = None) -> int:
    _data, headers = await _request(
        "GET",
        path,
        params={"select": "id", **(params or {})},
        count=True,
        limit=1,
    )
    return _parse_count(headers)


def _first_row(rows: Any, message: str = "Requested row was not found.") -> dict[str, Any]:
    if isinstance(rows, list) and rows and isinstance(rows[0], dict):
        return rows[0]
    raise BackendApiError(message, 404, "NOT_FOUND")


def _trim(value: str | None) -> str | None:
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    return stripped or None


def _clean_update(payload: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in payload.items() if value is not None}


def _unique_strings(values: Any) -> list[str]:
    if isinstance(values, str):
        values = [values]
    if not isinstance(values, list):
        return []

    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        if not isinstance(value, str):
            continue
        normalized = value.strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
    return result


def _category_ids_from_payload(payload: dict[str, Any], *, required: bool = False) -> list[str]:
    category_ids = _unique_strings(payload.get("category_ids") or payload.get("categoryIds"))
    legacy_category = _trim(payload.get("category_id") or payload.get("categoryId"))
    if legacy_category and legacy_category not in category_ids:
        category_ids.insert(0, legacy_category)
    if required and not category_ids:
        raise BackendApiError("At least one category is required.", 400, "VALIDATION_ERROR")
    return category_ids


def _in_filter(values: list[str]) -> str:
    return f"in.({','.join(values)})"


def _text_in_filter(values: list[str]) -> str:
    quoted: list[str] = []
    for value in values:
        if not value:
            continue
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        quoted.append(f'"{escaped}"')
    return f"in.({','.join(quoted)})"


def _parse_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)
    except ValueError:
        return None


def _parse_backfill_boundary(value: Any, *, default: datetime, is_end: bool = False) -> datetime:
    if not isinstance(value, str) or not value.strip():
        return default
    raw = value.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        raw = f"{raw}T23:59:59.999999+00:00" if is_end else f"{raw}T00:00:00+00:00"
    parsed = _parse_datetime(raw)
    if parsed is None:
        raise BackendApiError("startDate/endDate must be ISO-8601 date or datetime strings.", 400, "VALIDATION_ERROR")
    return parsed


def _backfill_window(payload: dict[str, Any]) -> tuple[datetime, datetime]:
    now = _now()
    end = _parse_backfill_boundary(payload.get("end_date") or payload.get("endDate"), default=now, is_end=True)
    start = _parse_backfill_boundary(payload.get("start_date") or payload.get("startDate"), default=end - timedelta(days=30), is_end=False)
    if start >= end:
        raise BackendApiError("startDate must be before endDate.", 400, "VALIDATION_ERROR")
    if (end - start) > timedelta(days=YOUTUBE_BACKFILL_MAX_RANGE_DAYS):
        raise BackendApiError(
            f"YouTube backfill range is limited to {YOUTUBE_BACKFILL_MAX_RANGE_DAYS} days per job.",
            400,
            "VALIDATION_ERROR",
        )
    return start, end


def _best_thumbnail_url(thumbnails: Any) -> str | None:
    if not isinstance(thumbnails, dict):
        return None
    for key in ("maxres", "standard", "high", "medium", "default"):
        item = thumbnails.get(key)
        if isinstance(item, dict) and isinstance(item.get("url"), str):
            return item["url"]
    return None


async def _category_rows() -> list[dict[str, Any]]:
    rows = await _get("creator_categories", {"select": "id,name,created_at", "order": "name.asc"})
    return [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []


async def _category_name_by_id() -> dict[str, str]:
    return {
        row["id"]: row["name"]
        for row in await _category_rows()
        if isinstance(row.get("id"), str) and isinstance(row.get("name"), str)
    }


async def _category_link_counts(table: str, legacy_table: str, category_id: str) -> int:
    try:
        return await _count(table, {"category_id": f"eq.{category_id}"})
    except Exception as error:
        logger.warning("Category link count fallback table=%s: %s", table, error)
        return await _count(legacy_table, {"category_id": f"eq.{category_id}"})


async def _category_links_by_owner(table: str, owner_column: str, owner_ids: list[str]) -> dict[str, list[str]]:
    if not owner_ids:
        return {}
    try:
        rows = await _get(
            table,
            {
                "select": f"{owner_column},category_id",
                owner_column: _in_filter(owner_ids),
            },
        )
    except Exception as error:
        logger.warning("Category link query failed table=%s: %s", table, error)
        return {}

    result: dict[str, list[str]] = defaultdict(list)
    if isinstance(rows, list):
        for row in rows:
            if not isinstance(row, dict):
                continue
            owner_id = row.get(owner_column)
            category_id = row.get("category_id")
            if isinstance(owner_id, str) and isinstance(category_id, str) and category_id not in result[owner_id]:
                result[owner_id].append(category_id)
    return result


async def _sync_category_links(table: str, owner_column: str, owner_id: str, category_ids: list[str]) -> None:
    await _delete(table, {owner_column: f"eq.{owner_id}"}, prefer="return=minimal")
    if not category_ids:
        return
    rows = [{owner_column: owner_id, "category_id": category_id} for category_id in category_ids]
    await _post(
        f"{table}?on_conflict={owner_column},category_id",
        rows,
        prefer="resolution=ignore-duplicates,return=minimal",
    )


async def _sync_channel_categories(channel_id: str, category_ids: list[str]) -> None:
    await _sync_category_links("influencer_channel_categories", "influencer_channel_id", channel_id, category_ids)


async def _sync_video_categories(video_id: str, category_ids: list[str]) -> None:
    await _sync_category_links("influencer_video_categories", "influencer_video_id", video_id, category_ids)


def _category_summary(
    row: dict[str, Any],
    categories: dict[str, str],
    category_ids_by_owner: dict[str, list[str]],
) -> tuple[str | None, list[str], str, list[str]]:
    owner_id = row.get("id")
    category_ids = category_ids_by_owner.get(owner_id, []) if isinstance(owner_id, str) else []
    legacy_category_id = row.get("category_id")
    if isinstance(legacy_category_id, str) and legacy_category_id not in category_ids:
        category_ids = [legacy_category_id, *category_ids]

    category_names = [categories.get(category_id, "미분류") for category_id in category_ids]
    if not category_names:
        category_names = ["미분류"]
    primary_id = category_ids[0] if category_ids else None
    return primary_id, category_ids, ", ".join(category_names), category_names


async def _audit(action: str, target_table: str, target_id: str | None = None, payload: dict[str, Any] | None = None) -> None:
    try:
        await _post(
            "admin_audit_logs",
            {
                "action": action,
                "target_table": target_table,
                "target_id": target_id,
                "payload": payload or {},
            },
            prefer="return=minimal",
        )
    except Exception:
        # Audit logging must not block the operator action.
        return


async def get_admin_overview() -> AdminOverview:
    now = _now()
    last_day = _iso(now - ONE_DAY)
    categories = await _count("creator_categories")
    channels = await _count("influencer_channels")
    active = await _count("influencer_channels", {"is_active": "eq.true"})
    inactive = await _count("influencer_channels", {"is_active": "eq.false"})
    videos = await _count("influencer_videos")
    recent_videos = await _count("influencer_videos", {"collected_at": f"gte.{last_day}"})
    recommendations = await _count("content_recommendations")
    logs = await _get(
        "collection_logs",
        {
            "select": "id,status,finished_at,error_message,summary,created_at",
            "order": "started_at.desc",
            "limit": "10",
        },
    )
    log_rows = [row for row in logs if isinstance(row, dict)] if isinstance(logs, list) else []
    latest = log_rows[0] if log_rows else {}
    recent_errors = [
        {
            "id": row.get("id"),
            "status": row.get("status"),
            "message": row.get("error_message"),
            "createdAt": row.get("created_at"),
        }
        for row in log_rows
        if row.get("status") in {"failed", "partial_success"} or row.get("error_message")
    ]
    return AdminOverview(
        totalCategories=categories,
        totalInfluencerChannels=channels,
        activeChannels=active,
        inactiveChannels=inactive,
        totalVideos=videos,
        videosCollectedLast24h=recent_videos,
        latestCollectionStatus=latest.get("status") if isinstance(latest.get("status"), str) else None,
        latestCollectionFinishedAt=latest.get("finished_at") if isinstance(latest.get("finished_at"), str) else None,
        recommendationCount=recommendations,
        recentErrors=recent_errors,
    )


async def list_admin_categories() -> dict[str, Any]:
    categories = await _category_rows()
    try:
        channel_links = await _get("influencer_channel_categories", {"select": "category_id"})
        channel_counts = Counter(row.get("category_id") for row in channel_links if isinstance(row, dict))
    except Exception as error:
        logger.warning("Falling back to legacy channel category counts: %s", error)
        channels = await _get("influencer_channels", {"select": "id,category_id"})
        channel_counts = Counter(row.get("category_id") for row in channels if isinstance(row, dict))

    try:
        video_links = await _get("influencer_video_categories", {"select": "category_id"})
        video_counts = Counter(row.get("category_id") for row in video_links if isinstance(row, dict))
    except Exception as error:
        logger.warning("Falling back to legacy video category counts: %s", error)
        videos = await _get("influencer_videos", {"select": "id,category_id"})
        video_counts = Counter(row.get("category_id") for row in videos if isinstance(row, dict))
    return {
        "categories": [
            {
                "id": row.get("id"),
                "name": row.get("name"),
                "createdAt": row.get("created_at"),
                "channelCount": channel_counts.get(row.get("id"), 0),
                "videoCount": video_counts.get(row.get("id"), 0),
            }
            for row in categories
        ]
    }


async def create_admin_category(name: str) -> dict[str, Any]:
    normalized = name.strip()
    if not normalized:
        raise BackendApiError("Category name is required.", 400, "VALIDATION_ERROR")
    rows = await _post("creator_categories", {"name": normalized})
    row = _first_row(rows)
    await _audit("create_category", "creator_categories", row.get("id"), {"name": normalized})
    return {"category": row}


async def update_admin_category(category_id: str, name: str) -> dict[str, Any]:
    rows = await _patch("creator_categories", {"name": name.strip()}, {"id": f"eq.{category_id}"})
    row = _first_row(rows)
    await _audit("update_category", "creator_categories", category_id, {"name": name.strip()})
    return {"category": row}


async def delete_admin_category(category_id: str) -> dict[str, Any]:
    channel_count = await _category_link_counts("influencer_channel_categories", "influencer_channels", category_id)
    video_count = await _category_link_counts("influencer_video_categories", "influencer_videos", category_id)
    if channel_count or video_count:
        raise BackendApiError(
            f"Category is still linked to {channel_count} channel(s) and {video_count} video(s).",
            409,
            "CATEGORY_IN_USE",
        )
    rows = await _delete("creator_categories", {"id": f"eq.{category_id}"})
    await _audit("delete_category", "creator_categories", category_id)
    return {"deleted": len(rows) if isinstance(rows, list) else 0}


def _channel_row(
    row: dict[str, Any],
    categories: dict[str, str],
    category_ids_by_channel: dict[str, list[str]],
    video_counts: Counter[str],
    last_collected: dict[str, str | None],
) -> dict[str, Any]:
    channel_id = row.get("id")
    primary_id, category_ids, category_label, category_names = _category_summary(row, categories, category_ids_by_channel)
    return {
        "id": channel_id,
        "categoryId": primary_id,
        "categoryIds": category_ids,
        "category": category_label,
        "categoryNames": category_names,
        "channelUrl": row.get("channel_url"),
        "youtubeChannelId": row.get("youtube_channel_id"),
        "channelTitle": row.get("channel_title"),
        "description": row.get("description"),
        "thumbnailUrl": row.get("thumbnail_url"),
        "isActive": bool(row.get("is_active")),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
        "lastCollectedAt": row.get("last_collected_at") or last_collected.get(channel_id),
        "videoCount": video_counts.get(channel_id, 0),
    }


async def list_admin_influencer_channels(
    category_id: str | None = None,
    search: str | None = None,
    is_active: bool | None = None,
    limit: int = DEFAULT_LIMIT,
    offset: int = 0,
) -> dict[str, Any]:
    fetch_limit = None if category_id else limit
    fetch_offset = 0 if category_id else offset
    params: dict[str, Any] = {
        "select": "id,category_id,youtube_channel_id,channel_title,channel_url,description,thumbnail_url,is_active,created_at,updated_at,last_collected_at",
        "order": "created_at.desc",
    }
    if is_active is not None:
        params["is_active"] = f"eq.{str(is_active).lower()}"
    if search:
        q = search.replace("*", "").strip()
        params["or"] = f"(channel_title.ilike.*{q}*,channel_url.ilike.*{q}*,youtube_channel_id.ilike.*{q}*)"

    rows = await _get("influencer_channels", params, limit=fetch_limit, offset=fetch_offset)
    channels = [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    categories = await _category_name_by_id()
    category_ids_by_channel = await _category_links_by_owner(
        "influencer_channel_categories",
        "influencer_channel_id",
        [row["id"] for row in channels if isinstance(row.get("id"), str)],
    )
    if category_id:
        channels = [
            row
            for row in channels
            if category_id in category_ids_by_channel.get(row.get("id"), [])
            or row.get("category_id") == category_id
        ][offset : offset + limit]
    videos = await _get("influencer_videos", {"select": "influencer_channel_id,collected_at"})
    video_counts: Counter[str] = Counter()
    last_collected: dict[str, str | None] = {}
    if isinstance(videos, list):
        for row in videos:
            if not isinstance(row, dict) or not isinstance(row.get("influencer_channel_id"), str):
                continue
            influencer_channel_id = row["influencer_channel_id"]
            video_counts[influencer_channel_id] += 1
            collected_at = row.get("collected_at")
            if isinstance(collected_at, str) and (last_collected.get(influencer_channel_id) or "") < collected_at:
                last_collected[influencer_channel_id] = collected_at

    return {
        "channels": [_channel_row(row, categories, category_ids_by_channel, video_counts, last_collected) for row in channels],
        "limit": limit,
        "offset": offset,
    }


async def create_admin_influencer_channel(payload: dict[str, Any]) -> dict[str, Any]:
    category_ids = _category_ids_from_payload(payload, required=True)
    row_payload = {
        "category_id": category_ids[0],
        "channel_url": _trim(payload.get("channel_url")),
        "youtube_channel_id": _trim(payload.get("youtube_channel_id")),
        "channel_title": _trim(payload.get("channel_title")),
        "description": _trim(payload.get("description")),
        "thumbnail_url": _trim(payload.get("thumbnail_url")),
        "is_active": bool(payload.get("is_active", True)),
    }
    if not row_payload["channel_url"] and not row_payload["youtube_channel_id"]:
        raise BackendApiError("channelUrl or youtubeChannelId is required.", 400, "VALIDATION_ERROR")
    rows = await _post("influencer_channels", row_payload)
    row = _first_row(rows)
    if isinstance(row.get("id"), str):
        await _sync_channel_categories(row["id"], category_ids)
    await _audit("create_influencer_channel", "influencer_channels", row.get("id"), {**row_payload, "category_ids": category_ids})
    return {"channel": row}


async def update_admin_influencer_channel(channel_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    has_category_update = "category_ids" in payload or "categoryIds" in payload or "category_id" in payload or "categoryId" in payload
    category_ids = _category_ids_from_payload(payload, required=has_category_update)
    row_payload = _clean_update(
        {
            "category_id": category_ids[0] if has_category_update else None,
            "channel_url": _trim(payload.get("channel_url")),
            "youtube_channel_id": _trim(payload.get("youtube_channel_id")),
            "channel_title": _trim(payload.get("channel_title")),
            "description": _trim(payload.get("description")),
            "thumbnail_url": _trim(payload.get("thumbnail_url")),
            "is_active": payload.get("is_active"),
            "updated_at": _iso(_now()),
        }
    )
    rows = await _patch("influencer_channels", row_payload, {"id": f"eq.{channel_id}"})
    row = _first_row(rows)
    if has_category_update:
        await _sync_channel_categories(channel_id, category_ids)
    await _audit("update_influencer_channel", "influencer_channels", channel_id, {**row_payload, "category_ids": category_ids if has_category_update else None})
    return {"channel": row}


async def delete_admin_influencer_channel(channel_id: str) -> dict[str, Any]:
    rows = await _delete("influencer_channels", {"id": f"eq.{channel_id}"})
    await _audit("delete_influencer_channel", "influencer_channels", channel_id)
    return {"deleted": len(rows) if isinstance(rows, list) else 0}


async def sync_admin_influencer_channel(channel_id: str) -> dict[str, Any]:
    rows = await _get(
        "influencer_channels",
        {
            "select": "id,channel_url,youtube_channel_id",
            "id": f"eq.{channel_id}",
            "limit": "1",
        },
    )
    row = _first_row(rows, "Influencer channel not found.")
    channel_input = row.get("channel_url") or row.get("youtube_channel_id")
    if not isinstance(channel_input, str) or not channel_input.strip():
        raise BackendApiError("Channel is missing both channelUrl and youtubeChannelId.", 400, "VALIDATION_ERROR")

    channel = await get_channel_info(channel_input)
    patch = {
        "youtube_channel_id": channel.youtubeChannelId,
        "channel_title": channel.channelTitle,
        "channel_url": row.get("channel_url") or channel.channelUrl,
        "description": channel.description,
        "thumbnail_url": channel.thumbnailUrl,
        "updated_at": _iso(_now()),
    }
    updated = _first_row(await _patch("influencer_channels", patch, {"id": f"eq.{channel_id}"}))
    await _audit("sync_influencer_channel", "influencer_channels", channel_id, patch)
    return {"channel": updated}


def _video_row(
    row: dict[str, Any],
    categories: dict[str, str],
    category_ids_by_video: dict[str, list[str]],
    channels: dict[str, str],
) -> dict[str, Any]:
    video_id = row.get("youtube_video_id")
    primary_id, category_ids, category_label, category_names = _category_summary(row, categories, category_ids_by_video)
    return {
        "id": row.get("id"),
        "youtubeVideoId": video_id,
        "youtubeUrl": f"https://www.youtube.com/watch?v={video_id}" if isinstance(video_id, str) else None,
        "categoryId": primary_id,
        "categoryIds": category_ids,
        "category": category_label,
        "categoryNames": category_names,
        "influencerChannelId": row.get("influencer_channel_id"),
        "channel": channels.get(row.get("influencer_channel_id"), row.get("youtube_channel_id") or "Unknown"),
        "youtubeChannelId": row.get("youtube_channel_id"),
        "title": row.get("title"),
        "description": row.get("description"),
        "thumbnails": row.get("thumbnails") if isinstance(row.get("thumbnails"), dict) else {},
        "thumbnailUrl": _best_thumbnail_url(row.get("thumbnails")),
        "tags": row.get("tags") if isinstance(row.get("tags"), list) else [],
        "viewCount": row.get("view_count"),
        "likeCount": row.get("like_count"),
        "commentCount": row.get("comment_count"),
        "publishedAt": row.get("published_at"),
        "collectedAt": row.get("collected_at"),
        "raw": row.get("raw") if isinstance(row.get("raw"), dict) else {},
    }


async def _channel_title_by_id() -> dict[str, str]:
    rows = await _get("influencer_channels", {"select": "id,channel_title,channel_url,youtube_channel_id"})
    result: dict[str, str] = {}
    if isinstance(rows, list):
        for row in rows:
            if isinstance(row, dict) and isinstance(row.get("id"), str):
                result[row["id"]] = str(row.get("channel_title") or row.get("channel_url") or row.get("youtube_channel_id") or "Unknown")
    return result


async def list_admin_videos(
    category_id: str | None = None,
    channel_id: str | None = None,
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    sort_by: str = "published_at",
    sort_order: str = "desc",
    limit: int = DEFAULT_LIMIT,
    offset: int = 0,
) -> dict[str, Any]:
    safe_sort = sort_by if sort_by in {"published_at", "view_count", "like_count", "comment_count", "collected_at", "created_at"} else "published_at"
    safe_order = "asc" if sort_order == "asc" else "desc"
    fetch_limit = None if category_id else limit
    fetch_offset = 0 if category_id else offset
    params: dict[str, Any] = {
        "select": "id,category_id,influencer_channel_id,youtube_channel_id,youtube_video_id,published_at,title,description,thumbnails,tags,view_count,like_count,comment_count,raw,collected_at,created_at",
        "order": f"{safe_sort}.{safe_order}.nullslast",
    }
    if channel_id:
        params["influencer_channel_id"] = f"eq.{channel_id}"
    if date_from:
        params["published_at"] = f"gte.{date_from}"
    if date_to:
        params["published_at"] = f"lte.{date_to}"
    if search:
        q = search.replace("*", "").strip()
        params["or"] = f"(title.ilike.*{q}*,description.ilike.*{q}*,youtube_video_id.ilike.*{q}*)"

    rows = await _get("influencer_videos", params, limit=fetch_limit, offset=fetch_offset)
    videos = [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    categories = await _category_name_by_id()
    category_ids_by_video = await _category_links_by_owner(
        "influencer_video_categories",
        "influencer_video_id",
        [row["id"] for row in videos if isinstance(row.get("id"), str)],
    )
    if category_id:
        videos = [
            row
            for row in videos
            if category_id in category_ids_by_video.get(row.get("id"), [])
            or row.get("category_id") == category_id
        ][offset : offset + limit]
    channels = await _channel_title_by_id()
    return {
        "videos": [_video_row(row, categories, category_ids_by_video, channels) for row in videos],
        "limit": limit,
        "offset": offset,
    }


async def get_admin_video(video_id: str) -> dict[str, Any]:
    rows = await _get("influencer_videos", {"select": "*", "id": f"eq.{video_id}", "limit": "1"})
    row = _first_row(rows, "Video not found.")
    category_ids_by_video = await _category_links_by_owner("influencer_video_categories", "influencer_video_id", [video_id])
    return {"video": _video_row(row, await _category_name_by_id(), category_ids_by_video, await _channel_title_by_id())}


async def update_admin_video(video_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    has_category_update = "category_ids" in payload or "categoryIds" in payload
    category_ids = _category_ids_from_payload(payload, required=has_category_update)
    row_payload = _clean_update(
        {
            "title": _trim(payload.get("title")),
            "description": _trim(payload.get("description")),
            "tags": payload.get("tags"),
            "category_id": category_ids[0] if has_category_update else None,
        }
    )
    rows = await _patch("influencer_videos", row_payload, {"id": f"eq.{video_id}"})
    row = _first_row(rows)
    if has_category_update:
        await _sync_video_categories(video_id, category_ids)
    await _audit("update_video", "influencer_videos", video_id, {**row_payload, "category_ids": category_ids if has_category_update else None})
    return {"video": row}


async def delete_admin_video(video_id: str) -> dict[str, Any]:
    rows = await _delete("influencer_videos", {"id": f"eq.{video_id}"})
    await _audit("delete_video", "influencer_videos", video_id)
    return {"deleted": len(rows) if isinstance(rows, list) else 0}


async def _start_collection_log(started_at: str, job_name: str = DAILY_COLLECTION_JOB_NAME) -> str | None:
    try:
        rows = await _post(
            "collection_logs",
            {
                "job_name": job_name,
                "started_at": started_at,
                "status": "running",
                "summary": {},
            },
        )
        row = _first_row(rows)
        return row.get("id") if isinstance(row.get("id"), str) else None
    except Exception:
        return None


async def _running_job_log(job_name: str, lock_ttl_minutes: int) -> dict[str, Any] | None:
    started_after = _iso(_now() - timedelta(minutes=max(1, lock_ttl_minutes)))
    try:
        rows = await _get(
            "collection_logs",
            {
                "select": "id,started_at,status",
                "job_name": f"eq.{job_name}",
                "status": "eq.running",
                "started_at": f"gte.{started_after}",
                "order": "started_at.desc",
            },
            limit=1,
        )
    except Exception as error:
        logger.warning("Job running-lock check skipped job=%s: %s", job_name, error)
        return None
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    return row


async def _running_collection_log(lock_ttl_minutes: int) -> dict[str, Any] | None:
    return await _running_job_log(DAILY_COLLECTION_JOB_NAME, lock_ttl_minutes)


async def _finish_collection_log(log_id: str | None, status: str, summary: dict[str, Any], error_message: str | None = None) -> None:
    if not log_id:
        return
    try:
        await _patch(
            "collection_logs",
            {
                "finished_at": _iso(_now()),
                "status": status,
                "summary": summary,
                "error_message": error_message,
            },
            {"id": f"eq.{log_id}"},
            prefer="return=minimal",
        )
    except Exception:
        return


async def _update_collection_progress(log_id: str | None, progress: dict[str, Any]) -> None:
    if not log_id:
        return
    try:
        await _patch(
            "collection_logs",
            {"summary": {"progress": progress}},
            {"id": f"eq.{log_id}"},
            prefer="return=minimal",
        )
    except Exception:
        return


async def _update_job_summary(log_id: str | None, summary: dict[str, Any]) -> None:
    if not log_id:
        return
    try:
        await _patch(
            "collection_logs",
            {"summary": summary},
            {"id": f"eq.{log_id}"},
            prefer="return=minimal",
        )
    except Exception:
        return


def _collection_progress_summary(
    *,
    started_at: str,
    started: datetime,
    channels_total: int,
    channels_done: int,
    videos_found: int,
    videos_upserted: int,
    videos_analyzed: int,
    videos_skipped: int,
    errors_count: int,
    videos_deferred: int = 0,
    pending_video_analysis_count: int = 0,
) -> dict[str, Any]:
    percent = 100 if channels_total == 0 else min(95, int((channels_done / channels_total) * 95))
    stage = "channel_collection"
    message = "채널과 최근 영상 데이터를 수집하는 중입니다."
    if channels_done == 0:
        stage = "preparing"
        message = "수집할 채널 목록을 준비하는 중입니다."
    elif channels_done >= channels_total:
        stage = "finalizing"
        message = "수집 결과를 정리하는 중입니다."
    return {
        "stage": stage,
        "message": message,
        "startedAt": started_at,
        "channelsTotal": channels_total,
        "channelsDone": channels_done,
        "videosFound": videos_found,
        "videosUpserted": videos_upserted,
        "videosAnalyzed": videos_analyzed,
        "videosSkipped": videos_skipped,
        "videosDeferred": videos_deferred,
        "pendingVideoAnalysisCount": pending_video_analysis_count,
        "errors": errors_count,
        "percent": percent,
        "durationSeconds": _duration_seconds(started),
        "memory": _process_memory_mb(),
        "updatedAt": _iso(_now()),
    }


def _category_ids_for_channel_row(row: dict[str, Any], category_ids_by_channel: dict[str, list[str]]) -> list[str]:
    channel_id = row.get("id")
    category_ids = category_ids_by_channel.get(channel_id, []) if isinstance(channel_id, str) else []
    legacy_category_id = row.get("category_id")
    if isinstance(legacy_category_id, str) and legacy_category_id not in category_ids:
        category_ids = [legacy_category_id, *category_ids]
    return category_ids


async def _sync_video_categories_for_youtube_ids(youtube_video_ids: list[str], category_ids: list[str]) -> None:
    if not youtube_video_ids or not category_ids:
        return
    try:
        rows = await _get(
            "influencer_videos",
            {
                "select": "id,youtube_video_id",
                "youtube_video_id": _in_filter(youtube_video_ids),
            },
        )
        video_ids = [row["id"] for row in rows if isinstance(row, dict) and isinstance(row.get("id"), str)] if isinstance(rows, list) else []
        if not video_ids:
            return
        await _delete("influencer_video_categories", {"influencer_video_id": _in_filter(video_ids)}, prefer="return=minimal")
        link_rows = [
            {"influencer_video_id": video_id, "category_id": category_id}
            for video_id in video_ids
            for category_id in category_ids
        ]
        await _post(
            "influencer_video_categories?on_conflict=influencer_video_id,category_id",
            link_rows,
            prefer="resolution=ignore-duplicates,return=minimal",
        )
    except Exception as error:
        logger.warning("Failed to sync video category links after daily collection: %s", error)


def _analysis_deadline_reached(deadline: datetime | None) -> bool:
    return deadline is not None and (deadline - _now()).total_seconds() <= 1.0


async def _pending_video_analysis_candidates(batch_size: int) -> list[dict[str, Any]]:
    safe_batch_size = max(1, min(batch_size, MAX_LIMIT))
    select_columns = "id,youtube_video_id,title,collected_at,published_at"
    try:
        rows = await _get(
            "influencer_videos",
            {
                "select": f"{select_columns},video_analysis!left(id)",
                "youtube_video_id": "not.is.null",
                "video_analysis": "is.null",
                "order": "collected_at.desc.nullslast,published_at.desc",
            },
            limit=safe_batch_size,
        )
        if isinstance(rows, list):
            return [
                {key: value for key, value in row.items() if key != "video_analysis"}
                for row in rows
                if isinstance(row, dict) and isinstance(row.get("youtube_video_id"), str)
            ]
    except Exception as error:
        logger.warning("Pending video analysis anti-join query failed; falling back to candidate scan: %s", error)

    scan_limit = max(safe_batch_size, min(1000, safe_batch_size * 10))
    pending_rows: list[dict[str, Any]] = []
    offset = 0
    while offset < scan_limit and len(pending_rows) < safe_batch_size:
        rows = await _get(
            "influencer_videos",
            {
                "select": select_columns,
                "youtube_video_id": "not.is.null",
                "order": "collected_at.desc.nullslast,published_at.desc",
            },
            limit=MAX_LIMIT,
            offset=offset,
        )
        candidates = [row for row in rows if isinstance(row, dict) and isinstance(row.get("youtube_video_id"), str)] if isinstance(rows, list) else []
        if not candidates:
            break

        youtube_video_ids = []
        seen: set[str] = set()
        for row in candidates:
            youtube_video_id = row.get("youtube_video_id")
            if isinstance(youtube_video_id, str) and youtube_video_id and youtube_video_id not in seen:
                seen.add(youtube_video_id)
                youtube_video_ids.append(youtube_video_id)

        existing_ids: set[str] = set()
        if youtube_video_ids:
            try:
                analysis_rows = await _get(
                    "video_analysis",
                    {
                        "select": "youtube_video_id",
                        "youtube_video_id": _text_in_filter(youtube_video_ids),
                    },
                    limit=len(youtube_video_ids),
                )
                if isinstance(analysis_rows, list):
                    existing_ids = {
                        row["youtube_video_id"]
                        for row in analysis_rows
                        if isinstance(row, dict) and isinstance(row.get("youtube_video_id"), str)
                    }
            except Exception as error:
                logger.warning("Existing video analysis lookup failed; per-item duplicate checks will be used: %s", error)

        for row in candidates:
            youtube_video_id = row.get("youtube_video_id")
            if isinstance(youtube_video_id, str) and youtube_video_id not in existing_ids:
                pending_rows.append(row)
                if len(pending_rows) >= safe_batch_size:
                    break

        if len(candidates) < MAX_LIMIT:
            break
        offset += len(candidates)

    return pending_rows[:safe_batch_size]


async def _analyze_video_rows(video_rows: list[dict[str, Any]], *, deadline: datetime | None = None) -> dict[str, Any]:
    videos_analyzed = 0
    videos_analysis_already_present = 0
    videos_analysis_deferred = 0
    video_analysis_skipped_by_youtube = 0
    video_analysis_error_count = 0
    video_analysis_skips: list[dict[str, Any]] = []
    video_analysis_errors: list[dict[str, Any]] = []
    video_analysis_skip_reasons: Counter[str] = Counter()

    for index, video in enumerate(video_rows):
        if _analysis_deadline_reached(deadline):
            remaining = len(video_rows) - index
            videos_analysis_deferred += remaining
            if remaining > 0:
                _append_sample(video_analysis_skips, _video_analysis_deferred_detail(video, "VIDEO_ANALYSIS_DEFERRED_BY_TIME_BUDGET"))
            break

        youtube_video_id = video.get("youtube_video_id")
        if not isinstance(youtube_video_id, str) or not youtube_video_id:
            continue

        try:
            result = await create_video_analysis_from_youtube_video(
                youtube_video_id,
                influencer_video_id=video.get("id") if isinstance(video.get("id"), str) else None,
                title=video.get("title") if isinstance(video.get("title"), str) else None,
            )
            if result:
                videos_analyzed += 1
            else:
                videos_analysis_already_present += 1
        except Exception as error:
            if _is_video_analysis_skip_error(error):
                logger.info("Video metadata analysis skipped for youtubeVideoId=%s: %s", youtube_video_id, error)
                video_analysis_skipped_by_youtube += 1
                detail = _video_analysis_skip_detail(error, video)
                video_analysis_skip_reasons[str(detail.get("code") or "UNKNOWN_SKIP_REASON")] += 1
                _append_sample(video_analysis_skips, detail)
                continue
            logger.warning("Video metadata analysis failed for youtubeVideoId=%s: %s", youtube_video_id, error)
            video_analysis_error_count += 1
            _append_sample(
                video_analysis_errors,
                {
                    "youtubeVideoId": youtube_video_id,
                    "title": video.get("title"),
                    "message": str(error),
                },
            )

    return {
        "videosAnalyzed": videos_analyzed,
        "videosAnalysisAlreadyPresent": videos_analysis_already_present,
        "videosAnalysisDeferred": videos_analysis_deferred,
        "videosAnalysisSkipped": video_analysis_skipped_by_youtube,
        "videosAnalysisSkippedByLimit": 0,
        "videosAnalysisSkippedByYoutube": video_analysis_skipped_by_youtube,
        "videoAnalysisErrorCount": video_analysis_error_count,
        "videoAnalysisSkipReasons": dict(video_analysis_skip_reasons),
        "videoAnalysisSkips": video_analysis_skips,
        "videoAnalysisErrors": video_analysis_errors,
    }


async def _process_pending_video_analyses(batch_size: int, deadline: datetime) -> dict[str, Any]:
    if _analysis_deadline_reached(deadline):
        return {
            "videosAnalyzed": 0,
            "videosAnalysisAlreadyPresent": 0,
            "videosAnalysisDeferred": 0,
            "videosAnalysisSkipped": 0,
            "videosAnalysisSkippedByLimit": 0,
            "videosAnalysisSkippedByYoutube": 0,
            "videoAnalysisErrorCount": 0,
            "videoAnalysisSkipReasons": {},
            "videoAnalysisSkips": [],
            "videoAnalysisErrors": [],
            "pendingCandidates": 0,
        }

    candidates = await _pending_video_analysis_candidates(batch_size)
    result = await _analyze_video_rows(candidates, deadline=deadline)
    result["pendingCandidates"] = len(candidates)
    return result


def _summary_checkpoint(summary: Any) -> dict[str, Any]:
    if not isinstance(summary, dict):
        return {}
    checkpoint = summary.get("checkpoint")
    if isinstance(checkpoint, dict):
        return checkpoint
    progress = summary.get("progress")
    if isinstance(progress, dict) and isinstance(progress.get("checkpoint"), dict):
        return progress["checkpoint"]
    return {}


async def _latest_youtube_backfill_summary(
    *,
    window_start: datetime | None = None,
    window_end: datetime | None = None,
) -> dict[str, Any] | None:
    try:
        rows = await _get(
            "collection_logs",
            {
                "select": "id,status,summary,started_at",
                "job_name": f"eq.{YOUTUBE_BACKFILL_JOB_NAME}",
                "status": _text_in_filter(["partial", "failed", "running"]),
                "order": "started_at.desc",
            },
            limit=5,
        )
    except Exception as error:
        logger.warning("YouTube backfill checkpoint lookup failed: %s", error)
        return None

    if not isinstance(rows, list):
        return None
    for row in rows:
        if not isinstance(row, dict):
            continue
        summary = row.get("summary")
        if not isinstance(summary, dict):
            continue
        if window_start and summary.get("windowStart") != _iso(window_start):
            continue
        if window_end and summary.get("windowEnd") != _iso(window_end):
            continue
        return summary
    return None


def _backfill_checkpoint(
    *,
    channel_offset: int,
    channel_id: str | None = None,
    page_token: str | None = None,
    completed: bool = False,
) -> dict[str, Any]:
    return {
        "channelOffset": max(0, channel_offset),
        "channelId": channel_id,
        "pageToken": page_token,
        "completed": completed,
    }


def _backfill_progress_summary(
    *,
    started_at: str,
    started: datetime,
    channels_total: int,
    channel_offset: int,
    channels_processed: int,
    pages_scanned: int,
    collected_videos: int,
    skipped_duplicates: int,
    failed_count: int,
    checkpoint: dict[str, Any],
) -> dict[str, Any]:
    percent = 100 if channels_total == 0 else min(95, int((min(channel_offset, channels_total) / channels_total) * 95))
    return {
        "stage": "youtube_backfill",
        "message": "최근 30일 YouTube 누락 영상을 backfill하는 중입니다.",
        "startedAt": started_at,
        "channelsTotal": channels_total,
        "channelOffset": channel_offset,
        "channelsProcessed": channels_processed,
        "pagesScanned": pages_scanned,
        "collectedVideos": collected_videos,
        "skippedDuplicates": skipped_duplicates,
        "failedItems": failed_count,
        "checkpoint": checkpoint,
        "percent": percent,
        "durationSeconds": _duration_seconds(started),
        "memory": _process_memory_mb(),
        "updatedAt": _iso(_now()),
    }


async def _youtube_backfill_channel_row(channel_offset: int) -> dict[str, Any] | None:
    rows = await _get(
        "influencer_channels",
        {
            "select": "id,category_id,youtube_channel_id,channel_url,channel_title,is_active,last_collected_at,created_at",
            "is_active": "eq.true",
            "order": "id.asc",
        },
        limit=1,
        offset=channel_offset,
    )
    return rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None


async def _existing_youtube_video_ids(youtube_video_ids: list[str]) -> set[str]:
    if not youtube_video_ids:
        return set()
    rows = await _get(
        "influencer_videos",
        {
            "select": "youtube_video_id",
            "youtube_video_id": _text_in_filter(youtube_video_ids[:MAX_LIMIT]),
        },
        limit=min(len(youtube_video_ids), MAX_LIMIT),
    )
    return {
        row["youtube_video_id"]
        for row in rows
        if isinstance(row, dict) and isinstance(row.get("youtube_video_id"), str)
    } if isinstance(rows, list) else set()


async def _upsert_backfill_videos(
    videos: list[Any],
    *,
    channel_row: dict[str, Any],
    category_ids: list[str],
    started_at: str,
    dry_run: bool,
) -> dict[str, int]:
    youtube_video_ids = [
        video.youtubeVideoId
        for video in videos
        if isinstance(getattr(video, "youtubeVideoId", None), str) and video.youtubeVideoId
    ]
    existing_ids = await _existing_youtube_video_ids(youtube_video_ids)
    skipped_duplicates = sum(1 for video_id in youtube_video_ids if video_id in existing_ids)
    if dry_run or not videos:
        return {
            "collectedVideos": max(0, len(youtube_video_ids) - skipped_duplicates),
            "videosUpserted": 0,
            "skippedDuplicates": skipped_duplicates,
        }

    upsert_rows = [
        {
            "category_id": category_ids[0],
            "influencer_channel_id": channel_row.get("id"),
            "youtube_channel_id": video.channelId,
            "youtube_video_id": video.youtubeVideoId,
            "published_at": video.publishedAt,
            "title": video.title,
            "description": video.description,
            "thumbnails": {key: item.model_dump(mode="json") for key, item in video.thumbnails.items()},
            "tags": video.tags,
            "view_count": video.viewCount,
            "like_count": video.likeCount,
            "comment_count": video.commentCount,
            "raw": _compact_youtube_raw(video.raw),
            "collected_at": started_at,
        }
        for video in videos
    ]
    await _post(
        "influencer_videos?on_conflict=youtube_video_id&select=id,youtube_video_id,title",
        upsert_rows,
        prefer="resolution=merge-duplicates,return=representation",
    )
    await _sync_video_categories_for_youtube_ids(youtube_video_ids, category_ids)
    return {
        "collectedVideos": len(upsert_rows),
        "videosUpserted": len(upsert_rows),
        "skippedDuplicates": skipped_duplicates,
    }


async def _backfill_channel_window(
    channel_row: dict[str, Any],
    *,
    window_start: datetime,
    window_end: datetime,
    started_at: str,
    page_token: str | None,
    pages_per_channel: int,
    dry_run: bool,
    deadline: datetime,
) -> dict[str, Any]:
    channel_identifier = channel_row.get("youtube_channel_id") or channel_row.get("channel_url") or channel_row.get("id")
    category_ids_by_channel = await _category_links_by_owner(
        "influencer_channel_categories",
        "influencer_channel_id",
        [channel_row["id"]] if isinstance(channel_row.get("id"), str) else [],
    )
    category_ids = _category_ids_for_channel_row(channel_row, category_ids_by_channel)
    if not category_ids:
        raise BackendApiError("Influencer channel has no linked creator categories.", 400, "VALIDATION_ERROR")

    channel_input = channel_row.get("channel_url") or channel_row.get("youtube_channel_id")
    if not isinstance(channel_input, str) or not channel_input.strip():
        raise BackendApiError("Influencer channel is missing a YouTube URL or id.", 400, "VALIDATION_ERROR")

    channel = await get_channel_info(channel_input)
    if not dry_run:
        await _patch(
            "influencer_channels",
            {
                "youtube_channel_id": channel.youtubeChannelId,
                "channel_title": channel.channelTitle,
                "channel_url": channel_row.get("channel_url") or channel.channelUrl,
                "description": channel.description,
                "thumbnail_url": channel.thumbnailUrl,
                "updated_at": started_at,
            },
            {"id": f"eq.{channel_row.get('id')}"},
            prefer="return=minimal",
        )

    pages_scanned = 0
    videos_found = 0
    videos_matched_window = 0
    collected_videos = 0
    videos_upserted = 0
    skipped_duplicates = 0
    next_page_token = page_token
    completed = False

    while pages_scanned < pages_per_channel and not _analysis_deadline_reached(deadline):
        videos, next_token = await get_channel_videos_page(channel, max_results=50, page_token=next_page_token)
        pages_scanned += 1
        videos_found += len(videos)

        window_videos = []
        reached_window_start = False
        for video in videos:
            published_at = _parse_datetime(video.publishedAt)
            if published_at is None:
                continue
            if published_at < window_start:
                reached_window_start = True
                continue
            if published_at <= window_end:
                window_videos.append(video)

        videos_matched_window += len(window_videos)
        upsert_result = await _upsert_backfill_videos(
            window_videos,
            channel_row=channel_row,
            category_ids=category_ids,
            started_at=started_at,
            dry_run=dry_run,
        )
        collected_videos += upsert_result["collectedVideos"]
        videos_upserted += upsert_result["videosUpserted"]
        skipped_duplicates += upsert_result["skippedDuplicates"]

        next_page_token = next_token
        if reached_window_start or not next_page_token:
            completed = True
            next_page_token = None
            break

    if _analysis_deadline_reached(deadline) and not completed:
        next_page_token = next_page_token or page_token

    logger.info(
        "YouTube backfill channel processed channel=%s pages=%s videosFound=%s matched=%s collected=%s duplicates=%s completed=%s memory=%s",
        channel_identifier,
        pages_scanned,
        videos_found,
        videos_matched_window,
        collected_videos,
        skipped_duplicates,
        completed,
        _process_memory_mb(),
    )
    return {
        "pagesScanned": pages_scanned,
        "videosFound": videos_found,
        "videosMatchedWindow": videos_matched_window,
        "collectedVideos": collected_videos,
        "videosUpserted": videos_upserted,
        "skippedDuplicates": skipped_duplicates,
        "completed": completed,
        "nextPageToken": next_page_token,
    }


async def _collect_daily_channel(
    row: dict[str, Any],
    *,
    category_names: dict[Any, Any],
    category_ids_by_channel: dict[str, list[str]],
    window_start: datetime,
    started_at: str,
    semaphore: asyncio.Semaphore,
    max_recent_videos: int,
    deadline: datetime,
) -> dict[str, Any]:
    async with semaphore:
        channel_identifier = row.get("youtube_channel_id") or row.get("channel_url") or row.get("id")
        logger.info("Daily YouTube collection started for channel=%s", channel_identifier)
        try:
            channel_input = row.get("channel_url") or row.get("youtube_channel_id")
            if not isinstance(channel_input, str) or not channel_input.strip():
                raise BackendApiError("Influencer channel is missing a YouTube URL or id.", 400, "VALIDATION_ERROR")
            category_ids = _category_ids_for_channel_row(row, category_ids_by_channel)
            if not category_ids:
                raise BackendApiError("Influencer channel has no linked creator categories.", 400, "VALIDATION_ERROR")

            channel = await get_channel_info(channel_input)
            await _patch(
                "influencer_channels",
                {
                    "youtube_channel_id": channel.youtubeChannelId,
                    "channel_title": channel.channelTitle,
                    "channel_url": row.get("channel_url") or channel.channelUrl,
                    "description": channel.description,
                    "thumbnail_url": channel.thumbnailUrl,
                    "last_collected_at": started_at,
                    "updated_at": started_at,
                },
                {"id": f"eq.{row.get('id')}"},
                prefer="return=minimal",
            )

            recent_videos = await get_recent_videos(channel, max_results=max_recent_videos)
            last_day_videos = [
                video
                for video in recent_videos
                if (published := _parse_datetime(video.publishedAt)) is not None and published >= window_start
            ]
            if not last_day_videos:
                logger.info("Daily YouTube collection finished for channel=%s videosFound=0", channel.youtubeChannelId)
                return {
                    "videosFound": 0,
                    "videosUpserted": 0,
                    "videosAnalyzed": 0,
                    "videosAnalysisAlreadyPresent": 0,
                    "videosAnalysisDeferred": 0,
                    "videosAnalysisSkipped": 0,
                    "videosAnalysisSkippedByLimit": 0,
                    "videosAnalysisSkippedByYoutube": 0,
                    "videoAnalysisErrorCount": 0,
                    "videoAnalysisSkipReasons": {},
                    "videoAnalysisSkips": [],
                    "videoAnalysisErrors": [],
                    "error": None,
                }

            upsert_rows = [
                {
                    "category_id": category_ids[0],
                    "influencer_channel_id": row.get("id"),
                    "youtube_channel_id": channel.youtubeChannelId,
                    "youtube_video_id": video.youtubeVideoId,
                    "published_at": video.publishedAt,
                    "title": video.title,
                    "description": video.description,
                    "thumbnails": {key: item.model_dump(mode="json") for key, item in video.thumbnails.items()},
                    "tags": video.tags,
                    "view_count": video.viewCount,
                    "like_count": video.likeCount,
                    "comment_count": video.commentCount,
                    "raw": _compact_youtube_raw(video.raw),
                    "collected_at": started_at,
                }
                for video in last_day_videos
            ]
            inserted_rows = await _post(
                "influencer_videos?on_conflict=youtube_video_id&select=id,youtube_video_id,title",
                upsert_rows,
                prefer="resolution=merge-duplicates,return=representation",
            )
            inserted_videos = [item for item in inserted_rows if isinstance(item, dict)] if isinstance(inserted_rows, list) else []
            analysis_result = await _analyze_video_rows(inserted_videos, deadline=deadline)
            await _sync_video_categories_for_youtube_ids(
                [video.youtubeVideoId for video in last_day_videos if isinstance(video.youtubeVideoId, str)],
                category_ids,
            )
            logger.info(
                "Daily YouTube collection finished for channel=%s videosFound=%s videosUpserted=%s",
                channel.youtubeChannelId,
                len(last_day_videos),
                len(upsert_rows),
            )
            return {
                "videosFound": len(last_day_videos),
                "videosUpserted": len(upsert_rows),
                **analysis_result,
                "error": None,
            }
        except Exception as error:
            logger.exception("Daily YouTube collection failed for channel=%s", channel_identifier)
            return {
                "videosFound": 0,
                "videosUpserted": 0,
                "videosAnalyzed": 0,
                "videosAnalysisAlreadyPresent": 0,
                "videosAnalysisDeferred": 0,
                "videosAnalysisSkipped": 0,
                "videosAnalysisSkippedByLimit": 0,
                "videosAnalysisSkippedByYoutube": 0,
                "videoAnalysisErrorCount": 0,
                "videoAnalysisSkipReasons": {},
                "videoAnalysisSkips": [],
                "videoAnalysisErrors": [],
                "error": {
                    "category": category_names.get(row.get("category_id")),
                    "categories": [category_names.get(category_id, category_id) for category_id in _category_ids_for_channel_row(row, category_ids_by_channel)],
                    "channelId": row.get("youtube_channel_id"),
                    "channelUrl": row.get("channel_url"),
                    "message": str(error),
                },
            }


async def _collect_daily_channel_with_timeout(
    row: dict[str, Any],
    *,
    category_names: dict[Any, Any],
    category_ids_by_channel: dict[str, list[str]],
    window_start: datetime,
    started_at: str,
    semaphore: asyncio.Semaphore,
    max_recent_videos: int,
    deadline: datetime,
    timeout_seconds: float,
) -> dict[str, Any]:
    try:
        return await asyncio.wait_for(
            _collect_daily_channel(
                row,
                category_names=category_names,
                category_ids_by_channel=category_ids_by_channel,
                window_start=window_start,
                started_at=started_at,
                semaphore=semaphore,
                max_recent_videos=max_recent_videos,
                deadline=deadline,
            ),
            timeout=max(1.0, timeout_seconds),
        )
    except asyncio.TimeoutError:
        logger.warning("Daily YouTube collection timed out for channel=%s", row.get("youtube_channel_id") or row.get("id"))
        return {
            "videosFound": 0,
            "videosUpserted": 0,
            "videosAnalyzed": 0,
            "videosAnalysisAlreadyPresent": 0,
            "videosAnalysisDeferred": 0,
            "videosAnalysisSkipped": 0,
            "videosAnalysisSkippedByLimit": 0,
            "videosAnalysisSkippedByYoutube": 0,
            "videoAnalysisErrorCount": 0,
            "videoAnalysisSkipReasons": {},
            "videoAnalysisSkips": [],
            "videoAnalysisErrors": [],
            "error": {
                "category": category_names.get(row.get("category_id")),
                "categories": [category_names.get(category_id, category_id) for category_id in _category_ids_for_channel_row(row, category_ids_by_channel)],
                "channelId": row.get("youtube_channel_id"),
                "channelUrl": row.get("channel_url"),
                "code": "COLLECTION_CHANNEL_TIMEOUT",
                "message": "Channel collection exceeded the memory-safe per-channel timeout.",
            },
        }


def _video_analysis_warning(
    video_analysis_errors: list[dict[str, Any]],
    deferred_count: int,
    skipped_by_youtube: int,
    skip_reasons: dict[str, int],
    error_count: int = 0,
) -> str | None:
    parts: list[str] = []
    total_errors = error_count or len(video_analysis_errors)
    if total_errors:
        messages = [
            str(error.get("message") or "Unknown video analysis error")
            for error in video_analysis_errors
            if isinstance(error, dict)
        ]
        top_messages = Counter(messages).most_common(3)
        detail = "; ".join(f"{count}x {message[:140]}" for message, count in top_messages)
        suffix = f": {detail}" if detail else ""
        parts.append(f"{total_errors} video analysis item(s) failed{suffix}")
    if deferred_count:
        parts.append(f"{deferred_count} video analysis item(s) deferred for the next collector run.")
    if skipped_by_youtube:
        reason_detail = ", ".join(
            f"{code}: {count}"
            for code, count in sorted(skip_reasons.items())
            if count > 0
        )
        suffix = f" ({reason_detail})" if reason_detail else ""
        parts.append(f"{skipped_by_youtube} video analysis item(s) skipped by analysis policy{suffix}.")
    return " ".join(parts) if parts else None


def _collection_error_message(
    errors: list[dict[str, Any]],
    video_analysis_errors: list[dict[str, Any]],
    video_analysis_warning: str | None,
) -> str | None:
    if not errors and not video_analysis_errors and not video_analysis_warning:
        return None
    parts: list[str] = []
    if errors:
        parts.append(f"{len(errors)} channel(s) failed.")
    if video_analysis_warning:
        parts.append(video_analysis_warning)
    elif video_analysis_errors:
        parts.append(f"{len(video_analysis_errors)} video analysis item(s) failed.")
    return " ".join(parts)


async def collect_admin_now() -> AdminCollectionSummary:
    started = _now()
    started_at = _iso(started)
    window_start = started - ONE_DAY
    settings = get_settings()
    concurrency = _safe_positive_int(settings.daily_collection_concurrency, DAILY_COLLECTION_CONCURRENCY, 1, 4)
    channel_limit = _safe_positive_int(settings.daily_collection_channel_limit, DAILY_COLLECTION_CHANNEL_LIMIT, 1, 100)
    max_recent_videos = _safe_positive_int(settings.daily_collection_videos_per_channel, DAILY_COLLECTION_VIDEOS_PER_CHANNEL, 1, 12)
    time_budget_seconds = _safe_positive_int(settings.daily_collection_time_budget_seconds, DAILY_COLLECTION_TIME_BUDGET_SECONDS, 10, 600)
    channel_timeout_seconds = _safe_positive_int(settings.daily_collection_channel_timeout_seconds, DAILY_COLLECTION_CHANNEL_TIMEOUT_SECONDS, 10, 180)
    lock_ttl_minutes = _safe_positive_int(settings.daily_collection_lock_ttl_minutes, DAILY_COLLECTION_LOCK_TTL_MINUTES, 1, 240)
    analysis_batch_size = _safe_positive_int(settings.daily_collection_analysis_batch_size, DAILY_COLLECTION_ANALYSIS_BATCH_SIZE, 1, MAX_LIMIT)

    running_log = await _running_collection_log(lock_ttl_minutes)
    if running_log:
        logger.warning("Daily YouTube collection skipped because another run is active logId=%s", running_log.get("id"))
        return AdminCollectionSummary(
            ok=False,
            collectedAt=started_at,
            windowStart=_iso(window_start),
            windowEnd=started_at,
            categoriesChecked=0,
            channelsTotal=0,
            channelsChecked=0,
            channelsSkippedByBatchLimit=0,
            channelsSkippedByTimeBudget=0,
            videosFoundLast24h=0,
            videosUpserted=0,
            videosAnalyzed=0,
            videosAnalysisAlreadyPresent=0,
            videosAnalysisDeferred=0,
            videosAnalysisSkipped=0,
            videosAnalysisSkippedByLimit=0,
            videosAnalysisSkippedByYoutube=0,
            pendingVideoAnalysisCount=0,
            videoAnalysisErrorCount=0,
            errors=[
                {
                    "code": "COLLECTION_ALREADY_RUNNING",
                    "message": "Daily YouTube collection is already running.",
                }
            ],
            durationSeconds=_duration_seconds(started),
            memory=_process_memory_mb(),
            jobSkippedReason="COLLECTION_ALREADY_RUNNING",
        )

    log_id = await _start_collection_log(started_at)
    categories = await _category_rows()
    category_names = {row.get("id"): row.get("name") for row in categories}
    channels_total = await _count("influencer_channels", {"is_active": "eq.true"})
    channel_rows = await _get(
        "influencer_channels",
        {
            "select": "id,category_id,youtube_channel_id,channel_url,channel_title,is_active,last_collected_at,created_at",
            "is_active": "eq.true",
            "order": "last_collected_at.asc.nullsfirst,created_at.asc",
        },
        limit=channel_limit,
    )
    channels = [row for row in channel_rows if isinstance(row, dict)] if isinstance(channel_rows, list) else []
    channels_skipped_by_batch_limit = max(0, channels_total - len(channels))
    channels_skipped_by_time_budget = 0
    category_ids_by_channel = await _category_links_by_owner(
        "influencer_channel_categories",
        "influencer_channel_id",
        [row["id"] for row in channels if isinstance(row.get("id"), str)],
    )
    errors: list[dict[str, Any]] = []
    video_analysis_errors: list[dict[str, Any]] = []
    video_analysis_skips: list[dict[str, Any]] = []
    video_analysis_skip_reasons: Counter[str] = Counter()
    videos_found = 0
    videos_upserted = 0
    videos_analyzed = 0
    videos_analysis_already_present = 0
    videos_analysis_deferred = 0
    videos_analysis_skipped = 0
    videos_analysis_skipped_by_limit = 0
    videos_analysis_skipped_by_youtube = 0
    pending_video_analysis_count = 0
    video_analysis_error_count = 0

    try:
        logger.info(
            "Daily YouTube collection started: channelsSelected=%s channelsTotal=%s skippedByChannelLimit=%s concurrency=%s videosPerChannel=%s analysisBatchSize=%s timeBudgetSeconds=%s memory=%s",
            len(channels),
            channels_total,
            channels_skipped_by_batch_limit,
            concurrency,
            max_recent_videos,
            analysis_batch_size,
            time_budget_seconds,
            _process_memory_mb(),
        )
        semaphore = asyncio.Semaphore(concurrency)
        deadline = started + timedelta(seconds=time_budget_seconds)
        await _update_collection_progress(
            log_id,
            _collection_progress_summary(
                started_at=started_at,
                started=started,
                channels_total=len(channels),
                channels_done=0,
                videos_found=0,
                videos_upserted=0,
                videos_analyzed=0,
                videos_skipped=0,
                errors_count=0,
            ),
        )
        try:
            pending_result = await _process_pending_video_analyses(analysis_batch_size, deadline)
        except Exception as error:
            logger.warning("Pending video metadata analysis failed before channel collection; continuing: %s", error)
            pending_result = {
                "videosAnalyzed": 0,
                "videosAnalysisAlreadyPresent": 0,
                "videosAnalysisDeferred": 0,
                "videosAnalysisSkipped": 0,
                "videosAnalysisSkippedByLimit": 0,
                "videosAnalysisSkippedByYoutube": 0,
                "videoAnalysisErrorCount": 0,
                "videoAnalysisSkipReasons": {},
                "videoAnalysisSkips": [],
                "videoAnalysisErrors": [],
                "pendingCandidates": 0,
            }
            video_analysis_error_count += 1
            _append_sample(
                video_analysis_errors,
                {
                    "code": "PENDING_VIDEO_ANALYSIS_FAILED",
                    "message": str(error),
                },
            )
        pending_candidates = int(pending_result.get("pendingCandidates") or 0)
        videos_analyzed += int(pending_result.get("videosAnalyzed") or 0)
        videos_analysis_already_present += int(pending_result.get("videosAnalysisAlreadyPresent") or 0)
        videos_analysis_deferred += int(pending_result.get("videosAnalysisDeferred") or 0)
        videos_analysis_skipped += int(pending_result.get("videosAnalysisSkipped") or 0)
        videos_analysis_skipped_by_limit += int(pending_result.get("videosAnalysisSkippedByLimit") or 0)
        videos_analysis_skipped_by_youtube += int(pending_result.get("videosAnalysisSkippedByYoutube") or 0)
        video_analysis_error_count += int(pending_result.get("videoAnalysisErrorCount") or 0)
        pending_video_analysis_skips = pending_result.get("videoAnalysisSkips")
        if isinstance(pending_video_analysis_skips, list):
            for skip in pending_video_analysis_skips:
                if isinstance(skip, dict):
                    _append_sample(video_analysis_skips, skip)
        pending_skip_reasons = pending_result.get("videoAnalysisSkipReasons")
        if isinstance(pending_skip_reasons, dict):
            video_analysis_skip_reasons.update(
                {
                    str(reason): int(count)
                    for reason, count in pending_skip_reasons.items()
                    if isinstance(count, int)
                }
            )
        pending_video_analysis_errors = pending_result.get("videoAnalysisErrors")
        if isinstance(pending_video_analysis_errors, list):
            for error in pending_video_analysis_errors:
                if isinstance(error, dict):
                    _append_sample(video_analysis_errors, error)
        if pending_candidates:
            logger.info(
                "Pending video metadata analysis processed: candidates=%s analyzed=%s alreadyPresent=%s deferred=%s failed=%s memory=%s",
                pending_candidates,
                pending_result.get("videosAnalyzed") or 0,
                pending_result.get("videosAnalysisAlreadyPresent") or 0,
                pending_result.get("videosAnalysisDeferred") or 0,
                pending_result.get("videoAnalysisErrorCount") or 0,
                _process_memory_mb(),
            )
            await _update_collection_progress(
                log_id,
                _collection_progress_summary(
                    started_at=started_at,
                    started=started,
                    channels_total=len(channels),
                    channels_done=0,
                    videos_found=0,
                    videos_upserted=0,
                    videos_analyzed=videos_analyzed,
                    videos_skipped=videos_analysis_skipped,
                    errors_count=len(errors) + video_analysis_error_count,
                    videos_deferred=videos_analysis_deferred,
                ),
            )
        last_progress_update = _now()
        channels_done = 0
        for batch_start in range(0, len(channels), concurrency):
            if _now() >= deadline:
                channels_skipped_by_time_budget = len(channels) - channels_done
                logger.warning("Daily YouTube collection stopped before timeout: channelsDone=%s channelsRemaining=%s memory=%s", channels_done, channels_skipped_by_time_budget, _process_memory_mb())
                break
            batch = channels[batch_start : batch_start + concurrency]
            seconds_left = max(1.0, (deadline - _now()).total_seconds())
            timeout_seconds = min(float(channel_timeout_seconds), seconds_left)
            channel_tasks = [
                asyncio.create_task(
                    _collect_daily_channel_with_timeout(
                        row,
                        category_names=category_names,
                        category_ids_by_channel=category_ids_by_channel,
                        window_start=window_start,
                        started_at=started_at,
                        semaphore=semaphore,
                        max_recent_videos=max_recent_videos,
                        deadline=deadline,
                        timeout_seconds=timeout_seconds,
                    )
                )
                for row in batch
            ]

            for task in asyncio.as_completed(channel_tasks):
                result = await task
                channels_done += 1
                videos_found += int(result.get("videosFound") or 0)
                videos_upserted += int(result.get("videosUpserted") or 0)
                videos_analyzed += int(result.get("videosAnalyzed") or 0)
                videos_analysis_already_present += int(result.get("videosAnalysisAlreadyPresent") or 0)
                videos_analysis_deferred += int(result.get("videosAnalysisDeferred") or 0)
                videos_analysis_skipped += int(result.get("videosAnalysisSkipped") or 0)
                videos_analysis_skipped_by_limit += int(result.get("videosAnalysisSkippedByLimit") or 0)
                videos_analysis_skipped_by_youtube += int(result.get("videosAnalysisSkippedByYoutube") or 0)
                video_analysis_error_count += int(result.get("videoAnalysisErrorCount") or 0)
                result_video_analysis_skips = result.get("videoAnalysisSkips")
                if isinstance(result_video_analysis_skips, list):
                    for skip in result_video_analysis_skips:
                        if isinstance(skip, dict):
                            _append_sample(video_analysis_skips, skip)
                result_skip_reasons = result.get("videoAnalysisSkipReasons")
                if isinstance(result_skip_reasons, dict):
                    video_analysis_skip_reasons.update(
                        {
                            str(reason): int(count)
                            for reason, count in result_skip_reasons.items()
                            if isinstance(count, int)
                        }
                    )
                result_video_analysis_errors = result.get("videoAnalysisErrors")
                if isinstance(result_video_analysis_errors, list):
                    for error in result_video_analysis_errors:
                        if isinstance(error, dict):
                            _append_sample(video_analysis_errors, error)
                if result.get("error") and isinstance(result["error"], dict):
                    _append_sample(errors, result["error"])
                now = _now()
                if channels_done == len(channels) or (now - last_progress_update).total_seconds() >= COLLECTION_PROGRESS_UPDATE_SECONDS:
                    await _update_collection_progress(
                        log_id,
                        _collection_progress_summary(
                            started_at=started_at,
                            started=started,
                            channels_total=len(channels),
                            channels_done=channels_done,
                            videos_found=videos_found,
                            videos_upserted=videos_upserted,
                            videos_analyzed=videos_analyzed,
                            videos_skipped=videos_analysis_skipped,
                            errors_count=len(errors) + video_analysis_error_count,
                            videos_deferred=videos_analysis_deferred,
                        ),
                    )
                    last_progress_update = now

        try:
            pending_video_analysis_count = len(await _pending_video_analysis_candidates(analysis_batch_size))
        except Exception as error:
            logger.warning("Pending video metadata analysis count lookup failed: %s", error)
            pending_video_analysis_count = 0

        summary = AdminCollectionSummary(
            collectedAt=started_at,
            windowStart=_iso(window_start),
            windowEnd=started_at,
            categoriesChecked=len(categories),
            channelsTotal=channels_total,
            channelsChecked=channels_done,
            channelsSkippedByBatchLimit=channels_skipped_by_batch_limit,
            channelsSkippedByTimeBudget=channels_skipped_by_time_budget,
            videosFoundLast24h=videos_found,
            videosUpserted=videos_upserted,
            videosAnalyzed=videos_analyzed,
            videosAnalysisAlreadyPresent=videos_analysis_already_present,
            videosAnalysisDeferred=videos_analysis_deferred,
            videosAnalysisSkipped=videos_analysis_skipped,
            videosAnalysisSkippedByLimit=videos_analysis_skipped_by_limit,
            videosAnalysisSkippedByYoutube=videos_analysis_skipped_by_youtube,
            pendingVideoAnalysisCount=pending_video_analysis_count,
            videoAnalysisErrorCount=video_analysis_error_count,
            videoAnalysisSkipReasons=dict(video_analysis_skip_reasons),
            videoAnalysisSkips=video_analysis_skips,
            videoAnalysisErrors=video_analysis_errors,
            errors=errors,
            durationSeconds=_duration_seconds(started),
            memory=_process_memory_mb(),
        )
        video_analysis_warning = _video_analysis_warning(
            video_analysis_errors,
            videos_analysis_deferred,
            videos_analysis_skipped_by_youtube,
            dict(video_analysis_skip_reasons),
            video_analysis_error_count,
        )
        await _finish_collection_log(
            log_id,
            "partial_success" if errors or video_analysis_error_count or channels_skipped_by_time_budget or videos_analysis_deferred else "success",
            summary.model_dump(mode="json"),
            _collection_error_message(errors, video_analysis_errors, video_analysis_warning),
        )
        await _audit("collect_now", "collection_logs", log_id, summary.model_dump(mode="json"))
        logger.info(
            "Daily YouTube collection finished: channelsDone=%s/%s channelsSkippedByBatchLimit=%s channelsSkippedByTimeBudget=%s channelErrors=%s videosFound=%s videosUpserted=%s analyzed=%s alreadyPresent=%s deferred=%s pendingNextWindow=%s skipped=%s videoAnalysisErrors=%s durationSeconds=%s memory=%s",
            channels_done,
            channels_total,
            channels_skipped_by_batch_limit,
            channels_skipped_by_time_budget,
            len(errors),
            videos_found,
            videos_upserted,
            videos_analyzed,
            videos_analysis_already_present,
            videos_analysis_deferred,
            pending_video_analysis_count,
            videos_analysis_skipped,
            video_analysis_error_count,
            summary.durationSeconds,
            summary.memory,
        )
        return summary
    except Exception as error:
        await _finish_collection_log(log_id, "failed", {}, str(error))
        raise


async def backfill_youtube_videos(payload: dict[str, Any]) -> AdminYoutubeBackfillSummary:
    started = _now()
    started_at = _iso(started)
    settings = get_settings()
    dry_run = bool(payload.get("dry_run") if "dry_run" in payload else payload.get("dryRun", False))
    resume = bool(payload.get("resume", True))
    explicit_window = any(
        payload.get(key)
        for key in ("start_date", "startDate", "end_date", "endDate")
    )
    window_start, window_end = _backfill_window(payload)
    channel_limit = _safe_positive_int(
        payload.get("channel_limit") or payload.get("channelLimit") or settings.youtube_backfill_channel_batch_size,
        YOUTUBE_BACKFILL_CHANNEL_BATCH_SIZE,
        1,
        50,
    )
    concurrency = _safe_positive_int(
        payload.get("concurrency") or settings.youtube_backfill_concurrency,
        YOUTUBE_BACKFILL_CONCURRENCY,
        1,
        1,
    )
    pages_per_channel = _safe_positive_int(
        payload.get("pages_per_channel") or payload.get("pagesPerChannel") or settings.youtube_backfill_pages_per_channel,
        YOUTUBE_BACKFILL_PAGES_PER_CHANNEL,
        1,
        10,
    )
    time_budget_seconds = _safe_positive_int(
        payload.get("time_budget_seconds") or payload.get("timeBudgetSeconds") or settings.youtube_backfill_time_budget_seconds,
        YOUTUBE_BACKFILL_TIME_BUDGET_SECONDS,
        10,
        180,
    )
    lock_ttl_minutes = _safe_positive_int(settings.youtube_backfill_lock_ttl_minutes, YOUTUBE_BACKFILL_LOCK_TTL_MINUTES, 1, 240)

    running_log = await _running_job_log(YOUTUBE_BACKFILL_JOB_NAME, lock_ttl_minutes)
    if running_log:
        logger.warning("YouTube backfill skipped because another run is active logId=%s", running_log.get("id"))
        return AdminYoutubeBackfillSummary(
            ok=False,
            jobId=str(running_log.get("id")) if running_log.get("id") else None,
            status="running",
            dryRun=dry_run,
            startedAt=started_at,
            finishedAt=_iso(_now()),
            windowStart=_iso(window_start),
            windowEnd=_iso(window_end),
            durationSeconds=_duration_seconds(started),
            memory=_process_memory_mb(),
            jobSkippedReason="YOUTUBE_BACKFILL_ALREADY_RUNNING",
        )

    resume_summary: dict[str, Any] | None = None
    if resume and not dry_run:
        resume_summary = await _latest_youtube_backfill_summary(
            window_start=window_start if explicit_window else None,
            window_end=window_end if explicit_window else None,
        )
        if resume_summary and not explicit_window:
            previous_start = _parse_datetime(str(resume_summary.get("windowStart") or ""))
            previous_end = _parse_datetime(str(resume_summary.get("windowEnd") or ""))
            if previous_start and previous_end:
                window_start, window_end = previous_start, previous_end

    channels_total = await _count("influencer_channels", {"is_active": "eq.true"})
    checkpoint = _summary_checkpoint(resume_summary)
    channel_offset = _safe_positive_int(checkpoint.get("channelOffset"), 0, 0, channels_total) if checkpoint else 0
    page_token = checkpoint.get("pageToken") if isinstance(checkpoint.get("pageToken"), str) else None
    checkpoint_channel_id = checkpoint.get("channelId") if isinstance(checkpoint.get("channelId"), str) else None

    channels_processed = int(resume_summary.get("channelsProcessed") or 0) if resume_summary else 0
    pages_scanned = int(resume_summary.get("pagesScanned") or 0) if resume_summary else 0
    videos_found = int(resume_summary.get("videosFound") or 0) if resume_summary else 0
    videos_matched_window = int(resume_summary.get("videosMatchedWindow") or 0) if resume_summary else 0
    collected_videos = int(resume_summary.get("collectedVideos") or 0) if resume_summary else 0
    skipped_duplicates = int(resume_summary.get("skippedDuplicates") or 0) if resume_summary else 0
    videos_analyzed = int(resume_summary.get("videosAnalyzed") or 0) if resume_summary else 0
    videos_analysis_already_present = int(resume_summary.get("videosAnalysisAlreadyPresent") or 0) if resume_summary else 0
    videos_analysis_deferred = int(resume_summary.get("videosAnalysisDeferred") or 0) if resume_summary else 0
    failed_items = [
        item for item in resume_summary.get("failedItems", []) if isinstance(item, dict)
    ] if resume_summary else []

    log_id = await _start_collection_log(started_at, YOUTUBE_BACKFILL_JOB_NAME)
    deadline = started + timedelta(seconds=time_budget_seconds)
    processed_this_run = 0
    status = "running"
    error_message: str | None = None

    logger.info(
        "YouTube backfill started: dryRun=%s resume=%s channelsTotal=%s channelOffset=%s channelLimit=%s concurrency=%s pagesPerChannel=%s windowStart=%s windowEnd=%s timeBudgetSeconds=%s memory=%s",
        dry_run,
        resume,
        channels_total,
        channel_offset,
        channel_limit,
        concurrency,
        pages_per_channel,
        _iso(window_start),
        _iso(window_end),
        time_budget_seconds,
        _process_memory_mb(),
    )

    try:
        while channel_offset < channels_total and processed_this_run < channel_limit:
            if _analysis_deadline_reached(deadline):
                break
            channel_row = await _youtube_backfill_channel_row(channel_offset)
            if not channel_row:
                channel_offset = channels_total
                break

            channel_id = channel_row.get("id") if isinstance(channel_row.get("id"), str) else None
            active_page_token = page_token if checkpoint_channel_id == channel_id else None
            try:
                result = await _backfill_channel_window(
                    channel_row,
                    window_start=window_start,
                    window_end=window_end,
                    started_at=started_at,
                    page_token=active_page_token,
                    pages_per_channel=pages_per_channel,
                    dry_run=dry_run,
                    deadline=deadline,
                )
                pages_scanned += int(result.get("pagesScanned") or 0)
                videos_found += int(result.get("videosFound") or 0)
                videos_matched_window += int(result.get("videosMatchedWindow") or 0)
                collected_videos += int(result.get("collectedVideos") or 0)
                skipped_duplicates += int(result.get("skippedDuplicates") or 0)

                if result.get("completed"):
                    channel_offset += 1
                    channels_processed += 1
                    processed_this_run += 1
                    page_token = None
                    checkpoint_channel_id = None
                else:
                    page_token = result.get("nextPageToken") if isinstance(result.get("nextPageToken"), str) else None
                    checkpoint_channel_id = channel_id
                    break
            except Exception as error:
                logger.warning("YouTube backfill channel failed channelId=%s: %s", channel_id, error)
                _append_sample(
                    failed_items,
                    {
                        "channelId": channel_id,
                        "youtubeChannelId": channel_row.get("youtube_channel_id"),
                        "channelUrl": channel_row.get("channel_url"),
                        "message": str(error),
                    },
                )
                channel_offset += 1
                channels_processed += 1
                processed_this_run += 1
                page_token = None
                checkpoint_channel_id = None

            checkpoint = _backfill_checkpoint(
                channel_offset=channel_offset,
                channel_id=checkpoint_channel_id,
                page_token=page_token,
                completed=channel_offset >= channels_total,
            )
            await _update_job_summary(
                log_id,
                {
                    "jobType": YOUTUBE_BACKFILL_JOB_NAME,
                    "status": "running",
                    "dryRun": dry_run,
                    "windowStart": _iso(window_start),
                    "windowEnd": _iso(window_end),
                    "progress": _backfill_progress_summary(
                        started_at=started_at,
                        started=started,
                        channels_total=channels_total,
                        channel_offset=channel_offset,
                        channels_processed=channels_processed,
                        pages_scanned=pages_scanned,
                        collected_videos=collected_videos,
                        skipped_duplicates=skipped_duplicates,
                        failed_count=len(failed_items),
                        checkpoint=checkpoint,
                    ),
                    "checkpoint": checkpoint,
                },
            )

        if not dry_run and not _analysis_deadline_reached(deadline):
            analysis_result = await _process_pending_video_analyses(
                _safe_positive_int(settings.daily_collection_analysis_batch_size, DAILY_COLLECTION_ANALYSIS_BATCH_SIZE, 1, MAX_LIMIT),
                deadline,
            )
            videos_analyzed += int(analysis_result.get("videosAnalyzed") or 0)
            videos_analysis_already_present += int(analysis_result.get("videosAnalysisAlreadyPresent") or 0)
            videos_analysis_deferred += int(analysis_result.get("videosAnalysisDeferred") or 0)
            analysis_errors = analysis_result.get("videoAnalysisErrors")
            if isinstance(analysis_errors, list):
                for item in analysis_errors:
                    if isinstance(item, dict):
                        _append_sample(failed_items, {"type": "video_analysis", **item})

        pending_video_analysis_count = 0
        if not dry_run:
            try:
                pending_video_analysis_count = len(
                    await _pending_video_analysis_candidates(
                        _safe_positive_int(settings.daily_collection_analysis_batch_size, DAILY_COLLECTION_ANALYSIS_BATCH_SIZE, 1, MAX_LIMIT)
                    )
                )
            except Exception as error:
                logger.warning("YouTube backfill pending analysis count lookup failed: %s", error)

        completed = channel_offset >= channels_total
        if completed and not failed_items:
            status = "completed"
        elif completed:
            status = "partial"
        else:
            status = "partial"

        checkpoint = _backfill_checkpoint(
            channel_offset=channel_offset,
            channel_id=checkpoint_channel_id,
            page_token=page_token,
            completed=completed,
        )
        summary = AdminYoutubeBackfillSummary(
            jobId=log_id,
            status=status,
            dryRun=dry_run,
            startedAt=started_at,
            finishedAt=_iso(_now()),
            windowStart=_iso(window_start),
            windowEnd=_iso(window_end),
            channelsTotal=channels_total,
            channelsProcessed=channels_processed,
            channelsRemaining=max(0, channels_total - channel_offset),
            pagesScanned=pages_scanned,
            videosFound=videos_found,
            videosMatchedWindow=videos_matched_window,
            collectedVideos=collected_videos,
            skippedDuplicates=skipped_duplicates,
            videosAnalyzed=videos_analyzed,
            videosAnalysisAlreadyPresent=videos_analysis_already_present,
            videosAnalysisDeferred=videos_analysis_deferred,
            pendingVideoAnalysisCount=pending_video_analysis_count,
            failedItems=failed_items,
            checkpoint=checkpoint,
            durationSeconds=_duration_seconds(started),
            memory=_process_memory_mb(),
        )
        if failed_items:
            error_message = f"{len(failed_items)} YouTube backfill item(s) failed or need retry."
        await _finish_collection_log(log_id, status, summary.model_dump(mode="json"), error_message)
        await _audit("youtube_backfill", "collection_logs", log_id, summary.model_dump(mode="json"))
        logger.info(
            "YouTube backfill finished: status=%s dryRun=%s channelsProcessed=%s/%s remaining=%s pages=%s matched=%s collected=%s duplicates=%s analyzed=%s pending=%s failed=%s durationSeconds=%s memory=%s",
            status,
            dry_run,
            channels_processed,
            channels_total,
            summary.channelsRemaining,
            pages_scanned,
            videos_matched_window,
            collected_videos,
            skipped_duplicates,
            videos_analyzed,
            pending_video_analysis_count,
            len(failed_items),
            summary.durationSeconds,
            summary.memory,
        )
        return summary
    except Exception as error:
        await _finish_collection_log(log_id, "failed", {}, str(error))
        raise


def _cleanup_cutoff(retention_days: int) -> str:
    return _iso(_now() - timedelta(days=max(1, retention_days)))


async def _cleanup_table_by_cutoff(
    *,
    table: str,
    cutoff_column: str,
    retention_days: int,
    batch_size: int,
    filters: dict[str, str] | None = None,
) -> dict[str, Any]:
    cutoff = _cleanup_cutoff(retention_days)
    started = _now()
    try:
        rows = await _get(
            table,
            {
                "select": "id",
                cutoff_column: f"lt.{cutoff}",
                "order": f"{cutoff_column}.asc",
                **(filters or {}),
            },
            limit=batch_size,
        )
        ids = [
            row["id"]
            for row in rows
            if isinstance(row, dict) and isinstance(row.get("id"), str)
        ] if isinstance(rows, list) else []
        deleted = 0
        if ids:
            await _delete(table, {"id": _in_filter(ids)}, prefer="return=minimal")
            deleted = len(ids)
        return {
            "table": table,
            "cutoffColumn": cutoff_column,
            "retentionDays": retention_days,
            "cutoff": cutoff,
            "selected": len(ids),
            "deleted": deleted,
            "durationSeconds": _duration_seconds(started),
            "ok": True,
        }
    except Exception as error:
        logger.warning("Cleanup failed table=%s cutoffColumn=%s: %s", table, cutoff_column, error.__class__.__name__)
        return {
            "table": table,
            "cutoffColumn": cutoff_column,
            "retentionDays": retention_days,
            "cutoff": cutoff,
            "selected": 0,
            "deleted": 0,
            "durationSeconds": _duration_seconds(started),
            "ok": False,
            "error": error.__class__.__name__,
        }


async def cleanup_old_operational_data() -> dict[str, Any]:
    started = _now()
    started_at = _iso(started)
    settings = get_settings()
    lock_ttl_minutes = _safe_positive_int(settings.cleanup_lock_ttl_minutes, DAILY_COLLECTION_LOCK_TTL_MINUTES, 1, 240)
    batch_size = _safe_positive_int(settings.cleanup_batch_size, CLEANUP_BATCH_SIZE, 1, 500)

    running_log = await _running_job_log(DATA_CLEANUP_JOB_NAME, lock_ttl_minutes)
    if running_log:
        logger.warning("DB cleanup skipped because another run is active logId=%s", running_log.get("id"))
        return {
            "ok": False,
            "jobName": DATA_CLEANUP_JOB_NAME,
            "startedAt": started_at,
            "durationSeconds": _duration_seconds(started),
            "jobSkippedReason": "CLEANUP_ALREADY_RUNNING",
            "results": [],
            "totalDeleted": 0,
            "memory": _process_memory_mb(),
        }

    log_id = await _start_collection_log(started_at, DATA_CLEANUP_JOB_NAME)
    logger.info("DB cleanup started: batchSize=%s memory=%s", batch_size, _process_memory_mb())
    cleanup_specs = [
        {
            "table": "collection_logs",
            "cutoff_column": "started_at",
            "retention_days": _safe_positive_int(settings.cleanup_job_logs_retention_days, CLEANUP_JOB_LOG_RETENTION_DAYS, 1, 3650),
            "filters": {"status": "neq.running"},
        },
        {
            "table": "naver_trend_collection_logs",
            "cutoff_column": "started_at",
            "retention_days": _safe_positive_int(settings.cleanup_job_logs_retention_days, CLEANUP_JOB_LOG_RETENTION_DAYS, 1, 3650),
            "filters": {"status": "neq.running"},
        },
        {
            "table": "creator_shop_collection_logs",
            "cutoff_column": "started_at",
            "retention_days": _safe_positive_int(settings.cleanup_job_logs_retention_days, CLEANUP_JOB_LOG_RETENTION_DAYS, 1, 3650),
            "filters": {"status": "neq.running"},
        },
        {
            "table": "admin_audit_logs",
            "cutoff_column": "created_at",
            "retention_days": _safe_positive_int(settings.cleanup_admin_audit_retention_days, CLEANUP_ADMIN_AUDIT_RETENTION_DAYS, 30, 3650),
        },
        {
            "table": "recommendation_options",
            "cutoff_column": "created_at",
            "retention_days": _safe_positive_int(settings.cleanup_recommendation_options_retention_days, CLEANUP_RECOMMENDATION_OPTIONS_RETENTION_DAYS, 7, 3650),
        },
        {
            "table": "video_analysis",
            "cutoff_column": "created_at",
            "retention_days": _safe_positive_int(settings.cleanup_video_analysis_retention_days, CLEANUP_VIDEO_ANALYSIS_RETENTION_DAYS, 7, 3650),
            "filters": {"user_id": "is.null", "analysis_result->>source": "eq.youtube_metadata"},
        },
        {
            "table": "influencer_videos",
            "cutoff_column": "published_at",
            "retention_days": _safe_positive_int(settings.cleanup_influencer_videos_retention_days, CLEANUP_INFLUENCER_VIDEO_RETENTION_DAYS, 30, 3650),
        },
        {
            "table": "video_growth_snapshots",
            "cutoff_column": "collected_at",
            "retention_days": _safe_positive_int(settings.cleanup_growth_snapshots_retention_days, CLEANUP_GROWTH_SNAPSHOTS_RETENTION_DAYS, 90, 3650),
        },
    ]

    results = [
        await _cleanup_table_by_cutoff(
            table=str(spec["table"]),
            cutoff_column=str(spec["cutoff_column"]),
            retention_days=int(spec["retention_days"]),
            batch_size=batch_size,
            filters=spec.get("filters") if isinstance(spec.get("filters"), dict) else None,
        )
        for spec in cleanup_specs
    ]
    total_deleted = sum(int(result.get("deleted") or 0) for result in results)
    failed = [result for result in results if not result.get("ok")]
    summary = {
        "ok": not failed,
        "jobName": DATA_CLEANUP_JOB_NAME,
        "startedAt": started_at,
        "finishedAt": _iso(_now()),
        "durationSeconds": _duration_seconds(started),
        "batchSize": batch_size,
        "results": results,
        "totalDeleted": total_deleted,
        "memory": _process_memory_mb(),
    }
    await _finish_collection_log(
        log_id,
        "partial_success" if failed else "success",
        summary,
        f"{len(failed)} cleanup target(s) failed." if failed else None,
    )
    logger.info(
        "DB cleanup finished: totalDeleted=%s failed=%s durationSeconds=%s memory=%s",
        total_deleted,
        len(failed),
        summary["durationSeconds"],
        summary["memory"],
    )
    return summary


async def list_admin_collection_logs(status: str | None = None, limit: int = DEFAULT_LIMIT, offset: int = 0) -> dict[str, Any]:
    params: dict[str, Any] = {
        "select": "id,job_name,started_at,finished_at,status,summary,error_message,created_at",
        "order": "started_at.desc",
    }
    if status:
        params["status"] = f"eq.{status}"
    rows = await _get("collection_logs", params, limit=limit, offset=offset)
    return {"logs": rows if isinstance(rows, list) else [], "limit": limit, "offset": offset}


async def list_admin_analyses(limit: int = DEFAULT_LIMIT, offset: int = 0) -> dict[str, Any]:
    rows = await _get(
        "user_channel_analyses",
        {
            "select": "id,user_id,channel_url,youtube_channel_id,channel_title,selected_category,inferred_category,channel_data,recent_videos,created_at",
            "order": "created_at.desc",
        },
        limit=limit,
        offset=offset,
    )
    return {"analyses": rows if isinstance(rows, list) else [], "limit": limit, "offset": offset}


async def list_admin_recommendations(limit: int = DEFAULT_LIMIT, offset: int = 0) -> dict[str, Any]:
    recommendations = await _get(
        "content_recommendations",
        {
            "select": "id,user_id,analysis_id,selected_category,input_payload,llm_response,created_at",
            "order": "created_at.desc",
        },
        limit=limit,
        offset=offset,
    )
    options = await _get(
        "recommendation_options",
        {
            "select": "id,analysis_id,option_id,selected_category,option_payload,raw,created_at",
            "order": "created_at.desc",
        },
        limit=limit,
        offset=offset,
    )
    return {
        "contentRecommendations": recommendations if isinstance(recommendations, list) else [],
        "recommendationOptions": options if isinstance(options, list) else [],
        "limit": limit,
        "offset": offset,
    }


async def delete_admin_recommendation(recommendation_id: str) -> dict[str, Any]:
    rows = await _delete("content_recommendations", {"id": f"eq.{recommendation_id}"})
    await _audit("delete_recommendation", "content_recommendations", recommendation_id)
    return {"deleted": len(rows) if isinstance(rows, list) else 0}


async def get_admin_system_status() -> AdminSystemStatus:
    settings = get_settings()
    env = {
        "SUPABASE_URL": bool(settings.supabase_url),
        "SUPABASE_SERVICE_ROLE_KEY": bool(settings.supabase_service_role_key),
        "YOUTUBE_API_KEY": bool(settings.youtube_api_key),
        "NAVER_CLIENT_ID": bool(settings.naver_client_id),
        "NAVER_CLIENT_SECRET": bool(settings.naver_client_secret),
        "NAVER_SHOPPING_CLIENT_ID": bool(settings.naver_shopping_client_id),
        "NAVER_SHOPPING_CLIENT_SECRET": bool(settings.naver_shopping_client_secret),
        "NAVER_SHOPPING_API_CREDENTIALS": bool(
            (settings.naver_shopping_client_id or settings.naver_client_id)
            and (settings.naver_shopping_client_secret or settings.naver_client_secret)
        ),
        "LOCAL_LLM_API_URL": bool(settings.local_llm_api_url),
        "LOCAL_LLM_API_KEY": bool(settings.local_llm_api_key),
        "ADMIN_SECRET": bool(settings.admin_secret),
        "CRON_SECRET": bool(settings.cron_secret),
        "ALLOWED_ORIGINS": bool(settings.allowed_origins),
    }
    supabase_connected = False
    try:
        await _count("creator_categories")
        supabase_connected = True
    except Exception:
        supabase_connected = False
    health = "ok" if supabase_connected and all([env["SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"], env["ADMIN_SECRET"]]) else "warning"
    return AdminSystemStatus(
        environment=settings.fastapi_env,
        apiBaseUrl=settings.api_base_url,
        env=env,
        supabaseConnected=supabase_connected,
        health=health,
    )


async def test_admin_youtube() -> AdminTestResult:
    try:
        channel = await get_channel_info("UC_x5XG1OV2P6uZZ5FSM9Ttw")
        return AdminTestResult(
            ok=True,
            message="YouTube API connection succeeded.",
            detail={"youtubeChannelId": channel.youtubeChannelId, "channelTitle": channel.channelTitle},
        )
    except Exception as error:
        return AdminTestResult(ok=False, message=str(error))


async def test_admin_llm() -> AdminTestResult:
    settings = get_settings()
    if not settings.local_llm_api_url:
        return AdminTestResult(ok=False, message="LOCAL_LLM_API_URL is not configured.")
    try:
        raw = await call_local_llm('Return valid JSON only: {"ok": true, "message": "pong"}', temperature=0.1)
        return AdminTestResult(ok=True, message="Local LLM API connection succeeded.", detail={"sample": raw[:500]})
    except Exception as error:
        return AdminTestResult(ok=False, message=str(error))


async def test_admin_shop() -> AdminTestResult:
    result = await check_naver_shopping_connection()
    return AdminTestResult(ok=bool(result.get("ok")), message=str(result.get("message")), detail=result.get("detail"))


async def danger_delete_videos_by_category(category_id: str, confirm: str) -> dict[str, Any]:
    if confirm != "DELETE":
        raise BackendApiError('Type "DELETE" to confirm this danger action.', 400, "VALIDATION_ERROR")
    video_ids: set[str] = set()
    try:
        links = await _get("influencer_video_categories", {"select": "influencer_video_id", "category_id": f"eq.{category_id}"})
        if isinstance(links, list):
            video_ids.update(row["influencer_video_id"] for row in links if isinstance(row, dict) and isinstance(row.get("influencer_video_id"), str))
    except Exception as error:
        logger.warning("Failed to load video category links for danger delete: %s", error)

    legacy_rows = await _get("influencer_videos", {"select": "id", "category_id": f"eq.{category_id}"})
    if isinstance(legacy_rows, list):
        video_ids.update(row["id"] for row in legacy_rows if isinstance(row, dict) and isinstance(row.get("id"), str))

    if video_ids:
        rows = await _delete("influencer_videos", {"id": _in_filter(sorted(video_ids))})
    else:
        rows = []
    deleted = len(rows) if isinstance(rows, list) else 0
    await _audit("danger_delete_videos_by_category", "influencer_videos", category_id, {"deleted": deleted})
    return {"deleted": deleted}


async def danger_delete_all_videos(confirm: str) -> dict[str, Any]:
    if confirm != "DELETE":
        raise BackendApiError('Type "DELETE" to confirm this danger action.', 400, "VALIDATION_ERROR")
    rows = await _delete("influencer_videos", {"id": "not.is.null"})
    deleted = len(rows) if isinstance(rows, list) else 0
    await _audit("danger_delete_all_videos", "influencer_videos", None, {"deleted": deleted})
    return {"deleted": deleted}


async def danger_delete_all_collection_logs(confirm: str) -> dict[str, Any]:
    if confirm != "DELETE":
        raise BackendApiError('Type "DELETE" to confirm this danger action.', 400, "VALIDATION_ERROR")
    rows = await _delete("collection_logs", {"id": "not.is.null"})
    deleted = len(rows) if isinstance(rows, list) else 0
    await _audit("danger_delete_all_collection_logs", "collection_logs", None, {"deleted": deleted})
    return {"deleted": deleted}


async def danger_delete_inactive_channels(confirm: str) -> dict[str, Any]:
    if confirm != "DELETE":
        raise BackendApiError('Type "DELETE" to confirm this danger action.', 400, "VALIDATION_ERROR")
    rows = await _delete("influencer_channels", {"is_active": "eq.false"})
    deleted = len(rows) if isinstance(rows, list) else 0
    await _audit("danger_delete_inactive_channels", "influencer_channels", None, {"deleted": deleted})
    return {"deleted": deleted}
