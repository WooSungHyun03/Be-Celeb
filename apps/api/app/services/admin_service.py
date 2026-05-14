# Provides protected Supabase-backed admin operations for the Render API.
from __future__ import annotations

import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.errors import BackendApiError, missing_env
from app.schemas.admin import AdminCollectionSummary, AdminOverview, AdminSystemStatus, AdminTestResult
from app.services.llm_service import call_local_llm
from app.services.youtube_service import get_channel_info, get_recent_videos

UTC = timezone.utc
DAILY_COLLECTION_JOB_NAME = "collect-daily-videos"
DAILY_COLLECTION_SCHEDULE_TEXT = "Every day 06:00 KST"
ONE_DAY = timedelta(days=1)
DEFAULT_LIMIT = 50
MAX_LIMIT = 100


def _now() -> datetime:
    return datetime.now(UTC)


def _iso(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


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
    channels = await _get("influencer_channels", {"select": "id,category_id"})
    videos = await _get("influencer_videos", {"select": "id,category_id"})
    channel_counts = Counter(row.get("category_id") for row in channels if isinstance(row, dict))
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
    channel_count = await _count("influencer_channels", {"category_id": f"eq.{category_id}"})
    video_count = await _count("influencer_videos", {"category_id": f"eq.{category_id}"})
    if channel_count or video_count:
        raise BackendApiError(
            f"Category is still linked to {channel_count} channel(s) and {video_count} video(s).",
            409,
            "CATEGORY_IN_USE",
        )
    rows = await _delete("creator_categories", {"id": f"eq.{category_id}"})
    await _audit("delete_category", "creator_categories", category_id)
    return {"deleted": len(rows) if isinstance(rows, list) else 0}


def _channel_row(row: dict[str, Any], categories: dict[str, str], video_counts: Counter[str], last_collected: dict[str, str | None]) -> dict[str, Any]:
    channel_id = row.get("id")
    return {
        "id": channel_id,
        "categoryId": row.get("category_id"),
        "category": categories.get(row.get("category_id"), "미분류"),
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
    params: dict[str, Any] = {
        "select": "id,category_id,youtube_channel_id,channel_title,channel_url,description,thumbnail_url,is_active,created_at,updated_at,last_collected_at",
        "order": "created_at.desc",
    }
    if category_id:
        params["category_id"] = f"eq.{category_id}"
    if is_active is not None:
        params["is_active"] = f"eq.{str(is_active).lower()}"
    if search:
        q = search.replace("*", "").strip()
        params["or"] = f"(channel_title.ilike.*{q}*,channel_url.ilike.*{q}*,youtube_channel_id.ilike.*{q}*)"

    rows = await _get("influencer_channels", params, limit=limit, offset=offset)
    channels = [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    categories = await _category_name_by_id()
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
        "channels": [_channel_row(row, categories, video_counts, last_collected) for row in channels],
        "limit": limit,
        "offset": offset,
    }


async def create_admin_influencer_channel(payload: dict[str, Any]) -> dict[str, Any]:
    row_payload = {
        "category_id": payload["category_id"],
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
    await _audit("create_influencer_channel", "influencer_channels", row.get("id"), row_payload)
    return {"channel": row}


async def update_admin_influencer_channel(channel_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    row_payload = _clean_update(
        {
            "category_id": payload.get("category_id"),
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
    await _audit("update_influencer_channel", "influencer_channels", channel_id, row_payload)
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


def _video_row(row: dict[str, Any], categories: dict[str, str], channels: dict[str, str]) -> dict[str, Any]:
    video_id = row.get("youtube_video_id")
    return {
        "id": row.get("id"),
        "youtubeVideoId": video_id,
        "youtubeUrl": f"https://www.youtube.com/watch?v={video_id}" if isinstance(video_id, str) else None,
        "categoryId": row.get("category_id"),
        "category": categories.get(row.get("category_id"), "미분류"),
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
    params: dict[str, Any] = {
        "select": "id,category_id,influencer_channel_id,youtube_channel_id,youtube_video_id,published_at,title,description,thumbnails,tags,view_count,like_count,comment_count,raw,collected_at,created_at",
        "order": f"{safe_sort}.{safe_order}.nullslast",
    }
    if category_id:
        params["category_id"] = f"eq.{category_id}"
    if channel_id:
        params["influencer_channel_id"] = f"eq.{channel_id}"
    if date_from:
        params["published_at"] = f"gte.{date_from}"
    if date_to:
        params["published_at"] = f"lte.{date_to}"
    if search:
        q = search.replace("*", "").strip()
        params["or"] = f"(title.ilike.*{q}*,description.ilike.*{q}*,youtube_video_id.ilike.*{q}*)"

    rows = await _get("influencer_videos", params, limit=limit, offset=offset)
    videos = [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    categories = await _category_name_by_id()
    channels = await _channel_title_by_id()
    return {
        "videos": [_video_row(row, categories, channels) for row in videos],
        "limit": limit,
        "offset": offset,
    }


async def get_admin_video(video_id: str) -> dict[str, Any]:
    rows = await _get("influencer_videos", {"select": "*", "id": f"eq.{video_id}", "limit": "1"})
    row = _first_row(rows, "Video not found.")
    return {"video": _video_row(row, await _category_name_by_id(), await _channel_title_by_id())}


async def update_admin_video(video_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    row_payload = _clean_update(
        {
            "title": _trim(payload.get("title")),
            "description": _trim(payload.get("description")),
            "tags": payload.get("tags"),
        }
    )
    rows = await _patch("influencer_videos", row_payload, {"id": f"eq.{video_id}"})
    row = _first_row(rows)
    await _audit("update_video", "influencer_videos", video_id, row_payload)
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
    errors: list[dict[str, Any]] = []
    videos_found = 0
    videos_upserted = 0

    try:
        for row in channels:
            try:
                channel_input = row.get("channel_url") or row.get("youtube_channel_id")
                if not isinstance(channel_input, str) or not channel_input.strip():
                    raise BackendApiError("Influencer channel is missing a YouTube URL or id.", 400, "VALIDATION_ERROR")

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
                videos_found += len(last_day_videos)
                if not last_day_videos:
                    continue

                upsert_rows = [
                    {
                        "category_id": row.get("category_id"),
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
                await _post(
                    "influencer_videos?on_conflict=youtube_video_id",
                    upsert_rows,
                    prefer="resolution=merge-duplicates,return=minimal",
                )
                videos_upserted += len(upsert_rows)
            except Exception as error:
                errors.append(
                    {
                        "category": category_names.get(row.get("category_id")),
                        "channelId": row.get("youtube_channel_id"),
                        "channelUrl": row.get("channel_url"),
                        "message": str(error),
                    }
                )

        summary = AdminCollectionSummary(
            collectedAt=started_at,
            windowStart=_iso(window_start),
            windowEnd=started_at,
            categoriesChecked=len(categories),
            channelsChecked=len(channels),
            videosFoundLast24h=videos_found,
            videosUpserted=videos_upserted,
            errors=errors,
        )
        await _finish_collection_log(
            log_id,
            "partial_success" if errors else "success",
            summary.model_dump(mode="json"),
            f"{len(errors)} channel(s) failed." if errors else None,
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


async def danger_delete_videos_by_category(category_id: str, confirm: str) -> dict[str, Any]:
    if confirm != "DELETE":
        raise BackendApiError('Type "DELETE" to confirm this danger action.', 400, "VALIDATION_ERROR")
    rows = await _delete("influencer_videos", {"category_id": f"eq.{category_id}"})
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
