from __future__ import annotations

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
    rows = await _request(
        "POST",
        "channel_growth_snapshots",
        payload={
            "user_id": user_id,
            "youtube_channel_id": channel.youtubeChannelId,
            "channel_url": settings["channelUrl"],
            "subscriber_count": channel.subscriberCount,
            "view_count": channel.viewCount,
            "video_count": channel.videoCount,
            "recent_video_stats": recent_stats,
        },
        prefer="return=representation",
    )
    if not isinstance(rows, list) or not rows:
        raise BackendApiError("Growth snapshot insert did not return a row.", 502, "SUPABASE_ERROR")
    await save_user_channel_settings_metadata(user_id, str(settings["channelUrl"]), str(settings.get("category") or "일상"), channel)
    return await get_growth_report(user_id)
