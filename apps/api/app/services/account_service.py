# Provides account deletion and per-user YouTube channel settings operations.
from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings
from app.core.errors import BackendApiError, missing_env
from app.services.youtube_service import get_channel_info


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
        "Content-Type": "application/json",
        "Accept": "application/json",
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


def _to_setting(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if not row:
        return None
    return {
        "id": row.get("id"),
        "userId": row.get("user_id"),
        "channelUrl": row.get("channel_url"),
        "category": row.get("category"),
        "youtubeChannelId": row.get("youtube_channel_id"),
        "channelTitle": row.get("channel_title"),
        "channelThumbnailUrl": row.get("channel_thumbnail_url"),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


async def get_user_channel_settings(user_id: str) -> dict[str, Any]:
    rows = await _request(
        "GET",
        "user_channel_settings",
        params={
            "select": "id,user_id,channel_url,category,youtube_channel_id,channel_title,channel_thumbnail_url,created_at,updated_at",
            "user_id": f"eq.{user_id}",
            "limit": "1",
        },
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    return {"settings": _to_setting(row)}


async def _delete_growth_snapshots(user_id: str) -> None:
    await _request("DELETE", "channel_growth_snapshots", params={"user_id": f"eq.{user_id}"}, prefer="return=minimal")
    await _request("DELETE", "video_growth_snapshots", params={"user_id": f"eq.{user_id}"}, prefer="return=minimal")


def _canonical_channel_url(channel: Any, fallback: str) -> str:
    value = getattr(channel, "channelUrl", None)
    return value.strip() if isinstance(value, str) and value.strip() else fallback.strip()


async def _reset_growth_snapshots_if_channel_changed(user_id: str, channel_url: str, channel: Any) -> None:
    existing_result = await get_user_channel_settings(user_id)
    existing = existing_result.get("settings") if isinstance(existing_result, dict) else None
    existing_channel_id = existing.get("youtubeChannelId") if isinstance(existing, dict) else None
    existing_channel_url = existing.get("channelUrl") if isinstance(existing, dict) else None

    should_reset_growth = (
        isinstance(existing_channel_id, str)
        and existing_channel_id
        and existing_channel_id != channel.youtubeChannelId
    ) or (
        not existing_channel_id
        and isinstance(existing_channel_url, str)
        and existing_channel_url.strip()
        and existing_channel_url.strip() != channel_url.strip()
    )
    if should_reset_growth:
        # Growth reports are channel-specific. When a member switches to a different
        # YouTube channel, old growth snapshots are deleted so charts restart cleanly.
        await _delete_growth_snapshots(user_id)


async def _upsert_channel_settings_row(user_id: str, channel_url: str, category: str, channel: Any) -> dict[str, Any]:
    canonical_channel_url = _canonical_channel_url(channel, channel_url)
    rows = await _request(
        "POST",
        "user_channel_settings?on_conflict=user_id",
        payload={
            "user_id": user_id,
            "channel_url": canonical_channel_url,
            "category": category.strip(),
            "youtube_channel_id": channel.youtubeChannelId,
            "channel_title": channel.channelTitle,
            "channel_thumbnail_url": channel.thumbnailUrl,
        },
        prefer="resolution=merge-duplicates,return=representation",
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Channel settings upsert did not return a row.", 502, "SUPABASE_ERROR")
    return {"settings": _to_setting(row)}


async def upsert_user_channel_settings(user_id: str, channel_url: str, category: str) -> dict[str, Any]:
    if not channel_url.strip():
        raise BackendApiError("YouTube 채널 URL, @handle 또는 channelId를 입력해 주세요.", 400, "VALIDATION_ERROR")
    if not category.strip():
        raise BackendApiError("category is required.", 400, "VALIDATION_ERROR")

    channel = await get_channel_info(channel_url)
    await _reset_growth_snapshots_if_channel_changed(user_id, channel_url, channel)
    return await _upsert_channel_settings_row(user_id, channel_url, category, channel)


async def save_user_channel_settings_metadata(user_id: str, channel_url: str, category: str, channel: Any) -> dict[str, Any]:
    await _reset_growth_snapshots_if_channel_changed(user_id, channel_url, channel)
    return await _upsert_channel_settings_row(user_id, channel_url, category, channel)


async def delete_account(user_id: str) -> dict[str, Any]:
    # Keep historical recommendation records anonymized, and cascade owned account rows through auth.users.
    await _request("PATCH", "user_channel_analyses", params={"user_id": f"eq.{user_id}"}, payload={"user_id": None}, prefer="return=minimal")
    await _request("PATCH", "content_recommendations", params={"user_id": f"eq.{user_id}"}, payload={"user_id": None}, prefer="return=minimal")
    await _delete_growth_snapshots(user_id)
    await _request("DELETE", "user_channel_settings", params={"user_id": f"eq.{user_id}"}, prefer="return=minimal")

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.delete(
            f"{_supabase_url()}/auth/v1/admin/users/{user_id}",
            headers=_headers(),
        )

    if response.status_code >= 400:
        raise BackendApiError(
            response.text or "Failed to delete Supabase Auth user.",
            502 if response.status_code >= 500 else response.status_code,
            "SUPABASE_AUTH_ERROR",
        )

    return {"deleted": True}
