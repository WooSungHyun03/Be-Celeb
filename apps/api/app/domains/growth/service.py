from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.exceptions import BackendApiError, missing_env
from app.core.logging import get_logger
from app.services.account_service import get_user_channel_settings, save_user_channel_settings_metadata
from app.services.youtube_service import get_channel_info, get_recent_videos

logger = get_logger(__name__)
RECENT_VIDEO_LIMIT = 8
KST = timezone(timedelta(hours=9))
GROWTH_REPORT_SCHEDULE_TEXT = "Every day 06:00 KST"
GROWTH_REPORT_SCHEDULE_CRON = "0 21 * * *"


def _supabase_url() -> str:
    settings = get_settings()
    if not settings.supabase_url:
        raise missing_env("SUPABASE_URL")
    return settings.supabase_url.rstrip("/").removesuffix("/rest/v1")


def _headers(prefer: str | None = None) -> dict[str, str]:
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise missing_env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


async def _request(method: str, path: str, *, params: dict[str, Any] | None = None, payload: Any | None = None, prefer: str | None = None) -> Any:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.request(
            method,
            f"{_supabase_url()}/rest/v1/{path}",
            headers=_headers(prefer),
            params=params,
            json=payload,
        )
    if response.status_code >= 400:
        raise BackendApiError(
            f"Supabase request failed: {response.text}",
            502 if response.status_code >= 500 else response.status_code,
            "SUPABASE_ERROR",
        )
    return response.json() if response.text else None


def _as_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _snapshot_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "youtubeChannelId": row.get("youtube_channel_id"),
        "channelTitle": row.get("channel_title") if isinstance(row.get("channel_title"), str) else None,
        "channelUrl": row.get("channel_url"),
        "channelThumbnailUrl": row.get("channel_thumbnail_url") if isinstance(row.get("channel_thumbnail_url"), str) else None,
        "subscriberCount": _as_int(row.get("subscriber_count")),
        "viewCount": _as_int(row.get("view_count")),
        "videoCount": _as_int(row.get("video_count")),
        "recentVideoStats": row.get("recent_video_stats") if isinstance(row.get("recent_video_stats"), list) else [],
        "collectedAt": row.get("collected_at"),
        "createdAt": row.get("created_at"),
    }


def _video_snapshot_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "youtubeVideoId": row.get("youtube_video_id"),
        "youtubeChannelId": row.get("youtube_channel_id"),
        "title": row.get("title") if isinstance(row.get("title"), str) else "",
        "thumbnailUrl": row.get("thumbnail_url") if isinstance(row.get("thumbnail_url"), str) else None,
        "publishedAt": row.get("published_at") if isinstance(row.get("published_at"), str) else None,
        "viewCount": _as_int(row.get("view_count")),
        "likeCount": _as_int(row.get("like_count")),
        "commentCount": _as_int(row.get("comment_count")),
        "collectedAt": row.get("collected_at"),
        "createdAt": row.get("created_at"),
    }


def _video_stat_from_value(value: Any, collected_at: str | None) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    video_id = value.get("youtubeVideoId")
    if not isinstance(video_id, str) or not video_id:
        return None
    return {
        "youtubeVideoId": video_id,
        "youtubeChannelId": value.get("youtubeChannelId") if isinstance(value.get("youtubeChannelId"), str) else None,
        "title": value.get("title") if isinstance(value.get("title"), str) else "",
        "thumbnailUrl": value.get("thumbnailUrl") if isinstance(value.get("thumbnailUrl"), str) else None,
        "publishedAt": value.get("publishedAt") if isinstance(value.get("publishedAt"), str) else None,
        "viewCount": _as_int(value.get("viewCount")),
        "likeCount": _as_int(value.get("likeCount")),
        "commentCount": _as_int(value.get("commentCount")),
        "collectedAt": collected_at,
    }


def _best_thumbnail_url(thumbnails: Any) -> str | None:
    if not isinstance(thumbnails, dict):
        return None
    for key in ("maxres", "standard", "high", "medium", "default"):
        item = thumbnails.get(key)
        url = getattr(item, "url", None)
        if isinstance(url, str) and url:
            return url
        if isinstance(item, dict) and isinstance(item.get("url"), str):
            return item["url"]
    return None


def _deltas(latest: dict[str, Any] | None, previous: dict[str, Any] | None) -> dict[str, int]:
    if not latest or not previous:
        return {"subscriberCount": 0, "viewCount": 0, "videoCount": 0}
    return {
        "subscriberCount": _as_int(latest.get("subscriberCount")) - _as_int(previous.get("subscriberCount")),
        "viewCount": _as_int(latest.get("viewCount")) - _as_int(previous.get("viewCount")),
        "videoCount": _as_int(latest.get("videoCount")) - _as_int(previous.get("videoCount")),
    }


async def _snapshots(user_id: str, limit: int = 12, youtube_channel_id: str | None = None) -> list[dict[str, Any]]:
    params: dict[str, Any] = {
        "select": "id,youtube_channel_id,channel_title,channel_url,channel_thumbnail_url,subscriber_count,view_count,video_count,recent_video_stats,collected_at,created_at",
        "user_id": f"eq.{user_id}",
        "order": "collected_at.desc",
        "limit": str(limit),
    }
    if youtube_channel_id:
        params["youtube_channel_id"] = f"eq.{youtube_channel_id}"
    rows = await _request(
        "GET",
        "channel_growth_snapshots",
        params=params,
    )
    return [_snapshot_from_row(row) for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []


async def _today_snapshot_id(user_id: str, youtube_channel_id: str) -> str | None:
    start, end = _current_kst_day_window_utc()
    rows = await _request(
        "GET",
        "channel_growth_snapshots",
        params={
            "select": "id",
            "user_id": f"eq.{user_id}",
            "youtube_channel_id": f"eq.{youtube_channel_id}",
            "and": f"(collected_at.gte.{start.isoformat()},collected_at.lt.{end.isoformat()})",
            "order": "collected_at.desc",
            "limit": "1",
        },
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    snapshot_id = row.get("id") if row else None
    return snapshot_id if isinstance(snapshot_id, str) else None


async def _today_video_snapshot_id(user_id: str, youtube_video_id: str) -> str | None:
    start, end = _current_kst_day_window_utc()
    rows = await _request(
        "GET",
        "video_growth_snapshots",
        params={
            "select": "id",
            "user_id": f"eq.{user_id}",
            "youtube_video_id": f"eq.{youtube_video_id}",
            "and": f"(collected_at.gte.{start.isoformat()},collected_at.lt.{end.isoformat()})",
            "order": "collected_at.desc",
            "limit": "1",
        },
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    snapshot_id = row.get("id") if row else None
    return snapshot_id if isinstance(snapshot_id, str) else None


def _current_kst_day_window_utc(now: datetime | None = None) -> tuple[datetime, datetime]:
    current = (now or datetime.now(timezone.utc)).astimezone(KST)
    start_kst = datetime(current.year, current.month, current.day, tzinfo=KST)
    end_kst = start_kst + timedelta(days=1)
    return start_kst.astimezone(timezone.utc), end_kst.astimezone(timezone.utc)


async def _save_video_snapshot(row: dict[str, Any]) -> None:
    snapshot_id = await _today_video_snapshot_id(str(row["user_id"]), str(row["youtube_video_id"]))
    if snapshot_id:
        await _request(
            "PATCH",
            "video_growth_snapshots",
            params={"id": f"eq.{snapshot_id}"},
            payload=row,
            prefer="return=minimal",
        )
        return
    await _request("POST", "video_growth_snapshots", payload=row, prefer="return=minimal")


async def _save_video_snapshots(rows: list[dict[str, Any]]) -> int:
    saved = 0
    for row in rows:
        await _save_video_snapshot(row)
        saved += 1
    return saved


def _canonical_channel_url(channel: Any, fallback: str) -> str:
    value = getattr(channel, "channelUrl", None)
    return value.strip() if isinstance(value, str) and value.strip() else fallback.strip()


async def _save_channel_snapshot(row: dict[str, Any]) -> dict[str, Any]:
    snapshot_id = await _today_snapshot_id(str(row["user_id"]), str(row["youtube_channel_id"]))
    if snapshot_id:
        rows = await _request(
            "PATCH",
            "channel_growth_snapshots",
            params={"id": f"eq.{snapshot_id}"},
            payload=row,
            prefer="return=representation",
        )
        if isinstance(rows, list) and rows and isinstance(rows[0], dict):
            return rows[0]
        raise BackendApiError("Growth snapshot update did not return a row.", 502, "SUPABASE_ERROR")

    try:
        rows = await _request(
            "POST",
            "channel_growth_snapshots",
            payload=row,
            prefer="return=representation",
        )
    except BackendApiError as error:
        if error.status_code != 409:
            raise
        snapshot_id = await _today_snapshot_id(str(row["user_id"]), str(row["youtube_channel_id"]))
        if not snapshot_id:
            raise
        rows = await _request(
            "PATCH",
            "channel_growth_snapshots",
            params={"id": f"eq.{snapshot_id}"},
            payload=row,
            prefer="return=representation",
        )
    if not isinstance(rows, list) or not rows or not isinstance(rows[0], dict):
        raise BackendApiError("Growth snapshot upsert did not return a row.", 502, "SUPABASE_ERROR")
    return rows[0]


async def _create_growth_snapshot(
    user_id: str,
    channel_url: str,
    category: str,
    channel: Any,
    recent_videos: list[Any] | None = None,
) -> dict[str, Any]:
    videos = recent_videos if recent_videos is not None else await get_recent_videos(channel)
    collected_at = datetime.now(timezone.utc).isoformat()
    canonical_channel_url = _canonical_channel_url(channel, channel_url)
    await save_user_channel_settings_metadata(user_id, canonical_channel_url, category, channel)
    recent_stats = [
        {
            "youtubeVideoId": video.youtubeVideoId,
            "youtubeChannelId": channel.youtubeChannelId,
            "title": video.title,
            "thumbnailUrl": _best_thumbnail_url(video.thumbnails),
            "publishedAt": video.publishedAt,
            "viewCount": video.viewCount or 0,
            "likeCount": video.likeCount or 0,
            "commentCount": video.commentCount or 0,
        }
        for video in videos[:RECENT_VIDEO_LIMIT]
    ]
    video_snapshot_rows = [
        {
            "user_id": user_id,
            "youtube_video_id": video.youtubeVideoId,
            "youtube_channel_id": channel.youtubeChannelId,
            "title": video.title,
            "thumbnail_url": _best_thumbnail_url(video.thumbnails),
            "published_at": video.publishedAt,
            "view_count": video.viewCount or 0,
            "like_count": video.likeCount or 0,
            "comment_count": video.commentCount or 0,
            "collected_at": collected_at,
        }
        for video in videos[:RECENT_VIDEO_LIMIT]
    ]
    payload = {
        "user_id": user_id,
        "youtube_channel_id": channel.youtubeChannelId,
        "channel_title": channel.channelTitle,
        "channel_url": canonical_channel_url,
        "channel_thumbnail_url": channel.thumbnailUrl,
        "subscriber_count": channel.subscriberCount or 0,
        "view_count": channel.viewCount or 0,
        "video_count": channel.videoCount or 0,
        "recent_video_stats": recent_stats,
        "collected_at": collected_at,
    }
    row = await _save_channel_snapshot(payload)
    await _save_video_snapshots(video_snapshot_rows)
    return row


async def ensure_initial_growth_snapshot(
    user_id: str,
    channel_url: str,
    category: str,
    channel: Any,
    recent_videos: list[Any] | None = None,
) -> dict[str, Any]:
    canonical_channel_url = _canonical_channel_url(channel, channel_url)
    await save_user_channel_settings_metadata(user_id, canonical_channel_url, category, channel)
    if await _today_snapshot_id(user_id, channel.youtubeChannelId):
        return {"skipped": True, "reason": "already_refreshed_today", "youtubeChannelId": channel.youtubeChannelId}
    return await _create_growth_snapshot(user_id, canonical_channel_url, category, channel, recent_videos)


async def _refresh_settings_snapshot(user_id: str, settings: dict[str, Any]) -> dict[str, Any]:
    existing_channel_id = settings.get("youtubeChannelId")
    if isinstance(existing_channel_id, str) and existing_channel_id and await _today_snapshot_id(user_id, existing_channel_id):
        return {"skipped": True, "reason": "already_refreshed_today", "youtubeChannelId": existing_channel_id}

    channel = await get_channel_info(str(settings["channelUrl"]))
    if await _today_snapshot_id(user_id, channel.youtubeChannelId):
        await save_user_channel_settings_metadata(user_id, str(settings["channelUrl"]), str(settings.get("category") or "일상"), channel)
        return {"skipped": True, "reason": "already_refreshed_today", "youtubeChannelId": channel.youtubeChannelId}

    return await _create_growth_snapshot(user_id, str(settings["channelUrl"]), str(settings.get("category") or "일상"), channel)


async def get_growth_report(user_id: str) -> dict[str, Any]:
    settings_result = await get_user_channel_settings(user_id)
    settings = settings_result.get("settings") if isinstance(settings_result, dict) else None
    youtube_channel_id = settings.get("youtubeChannelId") if isinstance(settings, dict) and isinstance(settings.get("youtubeChannelId"), str) else None
    snapshots = await _snapshots(user_id, youtube_channel_id=youtube_channel_id) if youtube_channel_id else []
    initial_snapshot_status: str | None = None
    initial_snapshot_message: str | None = None
    if isinstance(settings, dict) and settings.get("channelUrl") and not snapshots:
        try:
            initial_snapshot_status = "created"
            await _refresh_settings_snapshot(user_id, settings)
            settings_result = await get_user_channel_settings(user_id)
            settings = settings_result.get("settings") if isinstance(settings_result, dict) else settings
            youtube_channel_id = settings.get("youtubeChannelId") if isinstance(settings, dict) and isinstance(settings.get("youtubeChannelId"), str) else youtube_channel_id
            snapshots = await _snapshots(user_id, youtube_channel_id=youtube_channel_id)
        except Exception as error:
            logger.warning("Initial growth snapshot failed for user_id=%s: %s", user_id, error.__class__.__name__)
            initial_snapshot_status = "failed"
            initial_snapshot_message = "채널 정보를 불러오지 못했습니다. YouTube 채널 URL, @handle 또는 channelId를 확인한 뒤 다시 시도해 주세요."
    latest = snapshots[0] if snapshots else None
    previous = snapshots[1] if len(snapshots) > 1 else None
    return {
        "hasChannelSettings": bool(settings),
        "settings": settings,
        "latest": latest,
        "previous": previous,
        "deltas": _deltas(latest, previous),
        "trend": list(reversed(snapshots)),
        "lastRefreshedAt": latest.get("collectedAt") if latest else None,
        "refreshSchedule": GROWTH_REPORT_SCHEDULE_TEXT,
        "refreshCron": GROWTH_REPORT_SCHEDULE_CRON,
        "initialSnapshotStatus": initial_snapshot_status,
        "initialSnapshotMessage": initial_snapshot_message,
    }


async def get_growth_video_report(user_id: str, youtube_video_id: str) -> dict[str, Any]:
    rows = await _request(
        "GET",
        "video_growth_snapshots",
        params={
            "select": "id,youtube_video_id,youtube_channel_id,title,thumbnail_url,published_at,view_count,like_count,comment_count,collected_at,created_at",
            "user_id": f"eq.{user_id}",
            "youtube_video_id": f"eq.{youtube_video_id}",
            "order": "collected_at.asc",
            "limit": "90",
        },
    )
    points = [_video_snapshot_from_row(row) for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    latest_video = points[-1] if points else None

    if not points:
        snapshots = await _snapshots(user_id, limit=90)
        for snapshot in reversed(snapshots):
            stats = snapshot.get("recentVideoStats")
            if not isinstance(stats, list):
                continue
            for raw_stat in stats:
                stat = _video_stat_from_value(raw_stat, snapshot.get("collectedAt"))
                if not stat or stat["youtubeVideoId"] != youtube_video_id:
                    continue
                points.append(stat)
                latest_video = stat
                break
    return {
        "video": latest_video,
        "trend": points,
    }


async def refresh_growth_report(user_id: str) -> dict[str, Any]:
    settings_result = await get_user_channel_settings(user_id)
    settings = settings_result.get("settings") if isinstance(settings_result, dict) else None
    if not isinstance(settings, dict) or not settings.get("channelUrl"):
        return {
            "hasChannelSettings": False,
            "settings": None,
            "latest": None,
            "previous": None,
            "deltas": {"subscriberCount": 0, "viewCount": 0, "videoCount": 0},
            "trend": [],
            "lastRefreshedAt": None,
            "refreshSchedule": GROWTH_REPORT_SCHEDULE_TEXT,
            "refreshCron": GROWTH_REPORT_SCHEDULE_CRON,
        }

    await _refresh_settings_snapshot(user_id, settings)
    return await get_growth_report(user_id)


async def refresh_all_growth_reports() -> dict[str, Any]:
    rows = await _request(
        "GET",
        "user_channel_settings",
        params={
            "select": "user_id,channel_url,category,youtube_channel_id",
            "channel_url": "not.is.null",
        },
    )
    settings_rows = [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    refreshed = 0
    skipped_today = 0
    failed: list[dict[str, str]] = []
    for row in settings_rows:
        user_id = row.get("user_id")
        channel_url = row.get("channel_url")
        if not isinstance(user_id, str) or not isinstance(channel_url, str) or not channel_url.strip():
            continue
        try:
            result = await _refresh_settings_snapshot(
                user_id,
                {
                    "channelUrl": channel_url,
                    "category": row.get("category") if isinstance(row.get("category"), str) else "일상",
                    "youtubeChannelId": row.get("youtube_channel_id") if isinstance(row.get("youtube_channel_id"), str) else None,
                },
            )
            if result.get("skipped"):
                skipped_today += 1
            else:
                refreshed += 1
        except Exception as error:
            logger.warning("Growth report daily refresh failed for user_id=%s: %s", user_id, error)
            failed.append({"userId": user_id, "message": str(error)})
    return {
        "ok": not failed,
        "scheduledTime": GROWTH_REPORT_SCHEDULE_TEXT,
        "scheduleCron": GROWTH_REPORT_SCHEDULE_CRON,
        "total": len(settings_rows),
        "refreshed": refreshed,
        "skippedToday": skipped_today,
        "errors": failed,
        "failed": failed,
    }
