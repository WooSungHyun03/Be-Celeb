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
from app.schemas.admin import AdminCollectionSummary, AdminOverview, AdminSystemStatus, AdminTestResult
from app.services.llm_service import call_local_llm
from app.services.youtube_service import get_channel_info, get_recent_videos

UTC = timezone.utc
DAILY_COLLECTION_JOB_NAME = "collect-daily-videos"
DAILY_COLLECTION_SCHEDULE_TEXT = "Every day 06:00 KST"
ONE_DAY = timedelta(days=1)
DEFAULT_LIMIT = 50
MAX_LIMIT = 100
DAILY_COLLECTION_CONCURRENCY = 4
COLLECTION_PROGRESS_UPDATE_SECONDS = 5
logger = get_logger(__name__)
VIDEO_ANALYSIS_SKIP_CODES = {
    "YOUTUBE_REQUIRES_COOKIES",
    "YOUTUBE_COOKIE_FILE_UNAVAILABLE",
    "YOUTUBE_UNAVAILABLE_FOR_ANALYSIS",
    "YOUTUBE_AUDIO_ANALYSIS_DISABLED",
}


def _now() -> datetime:
    return datetime.now(UTC)


def _iso(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


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


def _parse_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)
    except ValueError:
        return None


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


async def _start_collection_log(started_at: str) -> str | None:
    try:
        rows = await _post(
            "collection_logs",
            {
                "job_name": DAILY_COLLECTION_JOB_NAME,
                "started_at": started_at,
                "status": "running",
                "summary": {},
            },
        )
        row = _first_row(rows)
        return row.get("id") if isinstance(row.get("id"), str) else None
    except Exception:
        return None


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


def _collection_progress_summary(
    *,
    started_at: str,
    channels_total: int,
    channels_done: int,
    videos_found: int,
    videos_upserted: int,
    videos_analyzed: int,
    videos_skipped: int,
    errors_count: int,
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
        "errors": errors_count,
        "percent": percent,
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


async def _collect_daily_channel(
    row: dict[str, Any],
    *,
    category_names: dict[Any, Any],
    category_ids_by_channel: dict[str, list[str]],
    window_start: datetime,
    started_at: str,
    semaphore: asyncio.Semaphore,
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

            recent_videos = await get_recent_videos(channel)
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
                    "videosAnalysisSkipped": 0,
                    "videosAnalysisSkippedByLimit": 0,
                    "videosAnalysisSkippedByYoutube": 0,
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
                    "raw": video.raw,
                    "collected_at": started_at,
                }
                for video in last_day_videos
            ]
            inserted_rows = await _post(
                "influencer_videos?on_conflict=youtube_video_id",
                upsert_rows,
                prefer="resolution=merge-duplicates,return=representation",
            )
            videos_analyzed = 0
            video_analysis_errors: list[dict[str, Any]] = []
            video_analysis_skips: list[dict[str, Any]] = []
            inserted_videos = [item for item in inserted_rows if isinstance(item, dict)] if isinstance(inserted_rows, list) else []
            analysis_limit = max(0, get_settings().video_analysis_max_per_collection)
            video_analysis_skipped_by_limit = max(0, len(inserted_videos) - analysis_limit)
            video_analysis_skipped_by_youtube = 0
            for inserted_video in inserted_videos[:analysis_limit]:
                youtube_video_id = inserted_video.get("youtube_video_id")
                if not isinstance(youtube_video_id, str) or not youtube_video_id:
                    continue
                try:
                    result = await create_video_analysis_from_youtube_video(
                        youtube_video_id,
                        influencer_video_id=inserted_video.get("id") if isinstance(inserted_video.get("id"), str) else None,
                        title=inserted_video.get("title") if isinstance(inserted_video.get("title"), str) else None,
                    )
                    if result:
                        videos_analyzed += 1
                except Exception as error:
                    if _is_video_analysis_skip_error(error):
                        logger.info("Video transcript analysis skipped for youtubeVideoId=%s: %s", youtube_video_id, error)
                        video_analysis_skipped_by_youtube += 1
                        video_analysis_skips.append(_video_analysis_skip_detail(error, inserted_video))
                        continue
                    logger.warning("Video transcript analysis failed for youtubeVideoId=%s: %s", youtube_video_id, error)
                    video_analysis_errors.append(
                        {
                            "youtubeVideoId": youtube_video_id,
                            "title": inserted_video.get("title"),
                            "message": str(error),
                        }
                    )
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
                "videosAnalyzed": videos_analyzed,
                "videosAnalysisSkipped": video_analysis_skipped_by_limit + video_analysis_skipped_by_youtube,
                "videosAnalysisSkippedByLimit": video_analysis_skipped_by_limit,
                "videosAnalysisSkippedByYoutube": video_analysis_skipped_by_youtube,
                "videoAnalysisSkipReasons": dict(Counter(str(item.get("code") or "UNKNOWN_SKIP_REASON") for item in video_analysis_skips)),
                "videoAnalysisSkips": video_analysis_skips,
                "videoAnalysisErrors": video_analysis_errors,
                "error": None,
            }
        except Exception as error:
            logger.exception("Daily YouTube collection failed for channel=%s", channel_identifier)
            return {
                "videosFound": 0,
                "videosUpserted": 0,
                "videosAnalyzed": 0,
                "videosAnalysisSkipped": 0,
                "videosAnalysisSkippedByLimit": 0,
                "videosAnalysisSkippedByYoutube": 0,
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


def _video_analysis_warning(
    video_analysis_errors: list[dict[str, Any]],
    skipped_by_limit: int,
    skipped_by_youtube: int,
    skip_reasons: dict[str, int],
) -> str | None:
    parts: list[str] = []
    if video_analysis_errors:
        messages = [
            str(error.get("message") or "Unknown video analysis error")
            for error in video_analysis_errors
            if isinstance(error, dict)
        ]
        top_messages = Counter(messages).most_common(3)
        detail = "; ".join(f"{count}x {message[:140]}" for message, count in top_messages)
        parts.append(f"{len(video_analysis_errors)} video analysis item(s) failed: {detail}")
    if skipped_by_limit:
        parts.append(f"{skipped_by_limit} video analysis item(s) skipped by per-run analysis limit.")
    if skipped_by_youtube:
        cookie_codes = {"YOUTUBE_REQUIRES_COOKIES", "YOUTUBE_COOKIE_FILE_UNAVAILABLE"}
        cookie_skips = {
            code: count
            for code, count in skip_reasons.items()
            if code in cookie_codes and count > 0
        }
        unavailable_skips = {
            code: count
            for code, count in skip_reasons.items()
            if code not in cookie_codes and code != "YOUTUBE_AUDIO_ANALYSIS_DISABLED" and count > 0
        }
        cookie_total = sum(cookie_skips.values())
        audio_disabled_total = int(skip_reasons.get("YOUTUBE_AUDIO_ANALYSIS_DISABLED") or 0)
        unavailable_total = max(0, skipped_by_youtube - cookie_total - audio_disabled_total)
        if cookie_total:
            reason_detail = ", ".join(f"{code}: {count}" for code, count in sorted(cookie_skips.items()))
            parts.append(
                f"{cookie_total} video analysis item(s) skipped because YouTube cookies were required or unavailable ({reason_detail})."
            )
        if unavailable_total:
            reason_detail = ", ".join(f"{code}: {count}" for code, count in sorted(unavailable_skips.items()))
            suffix = f" ({reason_detail})" if reason_detail else ""
            parts.append(
                f"{unavailable_total} video analysis item(s) skipped because YouTube subtitles were unavailable{suffix}."
            )
        if audio_disabled_total:
            parts.append(
                f"{audio_disabled_total} video analysis item(s) skipped because audio analysis is disabled and public subtitles were unavailable."
            )
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
    log_id = await _start_collection_log(started_at)
    categories = await _category_rows()
    category_names = {row.get("id"): row.get("name") for row in categories}
    channel_rows = await _get(
        "influencer_channels",
        {
            "select": "id,category_id,youtube_channel_id,channel_url,channel_title,is_active",
            "is_active": "eq.true",
            "order": "created_at.asc",
        },
    )
    channels = [row for row in channel_rows if isinstance(row, dict)] if isinstance(channel_rows, list) else []
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
    videos_analysis_skipped = 0
    videos_analysis_skipped_by_limit = 0
    videos_analysis_skipped_by_youtube = 0

    try:
        logger.info("Daily YouTube collection started: channels=%s concurrency=%s", len(channels), DAILY_COLLECTION_CONCURRENCY)
        semaphore = asyncio.Semaphore(DAILY_COLLECTION_CONCURRENCY)
        await _update_collection_progress(
            log_id,
            _collection_progress_summary(
                started_at=started_at,
                channels_total=len(channels),
                channels_done=0,
                videos_found=0,
                videos_upserted=0,
                videos_analyzed=0,
                videos_skipped=0,
                errors_count=0,
            ),
        )
        last_progress_update = _now()
        channel_tasks = [
            asyncio.create_task(
                _collect_daily_channel(
                    row,
                    category_names=category_names,
                    category_ids_by_channel=category_ids_by_channel,
                    window_start=window_start,
                    started_at=started_at,
                    semaphore=semaphore,
                )
            )
            for row in channels
        ]

        channels_done = 0
        for task in asyncio.as_completed(channel_tasks):
            result = await task
            channels_done += 1
            videos_found += int(result.get("videosFound") or 0)
            videos_upserted += int(result.get("videosUpserted") or 0)
            videos_analyzed += int(result.get("videosAnalyzed") or 0)
            videos_analysis_skipped += int(result.get("videosAnalysisSkipped") or 0)
            videos_analysis_skipped_by_limit += int(result.get("videosAnalysisSkippedByLimit") or 0)
            videos_analysis_skipped_by_youtube += int(result.get("videosAnalysisSkippedByYoutube") or 0)
            result_video_analysis_skips = result.get("videoAnalysisSkips")
            if isinstance(result_video_analysis_skips, list):
                video_analysis_skips.extend(skip for skip in result_video_analysis_skips if isinstance(skip, dict))
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
                video_analysis_errors.extend(error for error in result_video_analysis_errors if isinstance(error, dict))
            if result.get("error"):
                errors.append(result["error"])
            now = _now()
            if channels_done == len(channels) or (now - last_progress_update).total_seconds() >= COLLECTION_PROGRESS_UPDATE_SECONDS:
                await _update_collection_progress(
                    log_id,
                    _collection_progress_summary(
                        started_at=started_at,
                        channels_total=len(channels),
                        channels_done=channels_done,
                        videos_found=videos_found,
                        videos_upserted=videos_upserted,
                        videos_analyzed=videos_analyzed,
                        videos_skipped=videos_analysis_skipped,
                        errors_count=len(errors) + len(video_analysis_errors),
                    ),
                )
                last_progress_update = now

        summary = AdminCollectionSummary(
            collectedAt=started_at,
            windowStart=_iso(window_start),
            windowEnd=started_at,
            categoriesChecked=len(categories),
            channelsChecked=len(channels),
            videosFoundLast24h=videos_found,
            videosUpserted=videos_upserted,
            videosAnalyzed=videos_analyzed,
            videosAnalysisSkipped=videos_analysis_skipped,
            videosAnalysisSkippedByLimit=videos_analysis_skipped_by_limit,
            videosAnalysisSkippedByYoutube=videos_analysis_skipped_by_youtube,
            videoAnalysisSkipReasons=dict(video_analysis_skip_reasons),
            videoAnalysisSkips=video_analysis_skips,
            videoAnalysisErrors=video_analysis_errors,
            errors=errors,
        )
        video_analysis_warning = _video_analysis_warning(
            video_analysis_errors,
            videos_analysis_skipped_by_limit,
            videos_analysis_skipped_by_youtube,
            dict(video_analysis_skip_reasons),
        )
        await _finish_collection_log(
            log_id,
            "partial_success" if errors or video_analysis_errors else "success",
            summary.model_dump(mode="json"),
            _collection_error_message(errors, video_analysis_errors, video_analysis_warning),
        )
        await _audit("collect_now", "collection_logs", log_id, summary.model_dump(mode="json"))
        return summary
    except Exception as error:
        await _finish_collection_log(log_id, "failed", {}, str(error))
        raise


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
