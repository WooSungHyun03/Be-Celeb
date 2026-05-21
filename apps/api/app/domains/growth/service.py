from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.exceptions import BackendApiError, missing_env
from app.services.account_service import get_user_channel_settings, save_user_channel_settings_metadata
from app.services.youtube_service import get_channel_info, get_recent_videos


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
        "channelUrl": row.get("channel_url"),
        "subscriberCount": _as_int(row.get("subscriber_count")),
        "viewCount": _as_int(row.get("view_count")),
        "videoCount": _as_int(row.get("video_count")),
        "recentVideoStats": row.get("recent_video_stats") if isinstance(row.get("recent_video_stats"), list) else [],
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
        "title": value.get("title") if isinstance(value.get("title"), str) else "",
        "publishedAt": value.get("publishedAt") if isinstance(value.get("publishedAt"), str) else None,
        "viewCount": _as_int(value.get("viewCount")),
        "likeCount": _as_int(value.get("likeCount")),
        "commentCount": _as_int(value.get("commentCount")),
        "collectedAt": collected_at,
    }


def _deltas(latest: dict[str, Any] | None, previous: dict[str, Any] | None) -> dict[str, int]:
    if not latest or not previous:
        return {"subscriberCount": 0, "viewCount": 0, "videoCount": 0}
    return {
        "subscriberCount": _as_int(latest.get("subscriberCount")) - _as_int(previous.get("subscriberCount")),
        "viewCount": _as_int(latest.get("viewCount")) - _as_int(previous.get("viewCount")),
        "videoCount": _as_int(latest.get("videoCount")) - _as_int(previous.get("videoCount")),
    }


async def _snapshots(user_id: str, limit: int = 12) -> list[dict[str, Any]]:
    rows = await _request(
        "GET",
        "channel_growth_snapshots",
        params={
            "select": "id,youtube_channel_id,channel_url,subscriber_count,view_count,video_count,recent_video_stats,collected_at,created_at",
            "user_id": f"eq.{user_id}",
            "order": "collected_at.desc",
            "limit": str(limit),
        },
    )
    return [_snapshot_from_row(row) for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []


async def _today_snapshot_id(user_id: str, youtube_channel_id: str) -> str | None:
    now = datetime.now(timezone.utc)
    start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
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


async def _refresh_settings_snapshot(user_id: str, settings: dict[str, Any]) -> dict[str, Any]:
    channel = await get_channel_info(str(settings["channelUrl"]))
    recent_videos = await get_recent_videos(channel)
    recent_stats = [
        {
            "youtubeVideoId": video.youtubeVideoId,
            "title": video.title,
            "publishedAt": video.publishedAt,
            "viewCount": video.viewCount or 0,
            "likeCount": video.likeCount or 0,
            "commentCount": video.commentCount or 0,
        }
        for video in recent_videos[:8]
    ]
    payload = {
        "user_id": user_id,
        "youtube_channel_id": channel.youtubeChannelId,
        "channel_url": settings["channelUrl"],
        "subscriber_count": channel.subscriberCount,
        "view_count": channel.viewCount,
        "video_count": channel.videoCount,
        "recent_video_stats": recent_stats,
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }
    snapshot_id = await _today_snapshot_id(user_id, channel.youtubeChannelId)
    if snapshot_id:
        rows = await _request(
            "PATCH",
            "channel_growth_snapshots",
            params={"id": f"eq.{snapshot_id}"},
            payload=payload,
            prefer="return=representation",
        )
    else:
        rows = await _request(
            "POST",
            "channel_growth_snapshots",
            payload=payload,
            prefer="return=representation",
        )
    if not isinstance(rows, list) or not rows:
        raise BackendApiError("Growth snapshot upsert did not return a row.", 502, "SUPABASE_ERROR")
    await save_user_channel_settings_metadata(user_id, str(settings["channelUrl"]), str(settings.get("category") or "일상"), channel)
    return rows[0]


async def get_growth_report(user_id: str) -> dict[str, Any]:
    settings_result = await get_user_channel_settings(user_id)
    settings = settings_result.get("settings") if isinstance(settings_result, dict) else None
    snapshots = await _snapshots(user_id)
    latest = snapshots[0] if snapshots else None
    previous = snapshots[1] if len(snapshots) > 1 else None
    return {
        "hasChannelSettings": bool(settings),
        "settings": settings,
        "latest": latest,
        "previous": previous,
        "deltas": _deltas(latest, previous),
        "trend": list(reversed(snapshots)),
    }


async def get_growth_video_report(user_id: str, youtube_video_id: str) -> dict[str, Any]:
    snapshots = await _snapshots(user_id, limit=90)
    points: list[dict[str, Any]] = []
    latest_video: dict[str, Any] | None = None
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
        }

    await _refresh_settings_snapshot(user_id, settings)
    return await get_growth_report(user_id)


async def refresh_all_growth_reports() -> dict[str, Any]:
    rows = await _request(
        "GET",
        "user_channel_settings",
        params={
            "select": "user_id,channel_url,category",
            "channel_url": "not.is.null",
        },
    )
    settings_rows = [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    refreshed = 0
    failed: list[dict[str, str]] = []
    for row in settings_rows:
        user_id = row.get("user_id")
        channel_url = row.get("channel_url")
        if not isinstance(user_id, str) or not isinstance(channel_url, str) or not channel_url.strip():
            continue
        try:
            await _refresh_settings_snapshot(
                user_id,
                {
                    "channelUrl": channel_url,
                    "category": row.get("category") if isinstance(row.get("category"), str) else "일상",
                },
            )
            refreshed += 1
        except Exception as error:
            failed.append({"userId": user_id, "message": str(error)})
    return {"total": len(settings_rows), "refreshed": refreshed, "failed": failed}
