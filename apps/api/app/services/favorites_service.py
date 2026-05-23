# Provides per-user favorite operations backed by Supabase.
from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings
from app.core.errors import BackendApiError, missing_env
from app.schemas.account import FavoritePayload, FavoriteType, FavoriteUpdatePayload
from app.services.database_service import fetch_content_recommendation_detail


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


async def _request(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    payload: Any | None = None,
    prefer: str | None = None,
) -> Any:
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


def _to_favorite(row: dict[str, Any]) -> dict[str, Any]:
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    metadata = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
    return {
        "id": row.get("id"),
        "userId": row.get("user_id"),
        "targetType": row.get("type") or "recommendation",
        "targetId": row.get("target_id") or row.get("recommendation_id"),
        "recommendationId": row.get("recommendation_id"),
        "title": row.get("title"),
        "reason": row.get("reason"),
        "hashtags": row.get("hashtags") if isinstance(row.get("hashtags"), list) else [],
        "storyboard": row.get("storyboard") if isinstance(row.get("storyboard"), list) else [],
        "source": source,
        "metadata": metadata or source,
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


async def list_favorites(
    user_id: str,
    favorite_type: str | None = None,
    target_id: str | None = None,
) -> dict[str, Any]:
    params = {
        "select": "id,user_id,type,target_id,recommendation_id,title,reason,hashtags,storyboard,source,metadata,created_at,updated_at",
        "user_id": f"eq.{user_id}",
        "order": "created_at.desc",
    }
    if favorite_type:
        params["type"] = f"eq.{favorite_type}"
    if target_id:
        params["target_id"] = f"eq.{target_id}"

    rows = await _request("GET", "favorites", params=params)
    items = [_to_favorite(row) for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    return {"items": items}


async def create_favorite(user_id: str, payload: FavoritePayload) -> dict[str, Any]:
    target_id = payload.target_id or payload.recommendation_id
    if not target_id:
        raise BackendApiError("targetId or recommendationId is required.", 400, "VALIDATION_ERROR")

    title = payload.title or "즐겨찾기한 콘텐츠"
    reason = payload.reason
    hashtags = payload.hashtags or []
    storyboard = payload.storyboard or []
    source = payload.source or payload.metadata

    if payload.target_type == "recommendation":
        detail = await fetch_content_recommendation_detail(target_id, user_id)
        title = detail.recommendation.title
        reason = detail.recommendation.reason
        hashtags = detail.recommendation.hashtags or []
        storyboard = [scene.model_dump(mode="json") for scene in detail.recommendation.storyboard]
        source = {
            "recommendationId": detail.recommendationId,
            "analysisId": detail.analysisId,
            "selectedCategory": detail.selectedCategory,
            "channel": detail.channel.model_dump(mode="json"),
            "recommendation": detail.recommendation.model_dump(mode="json"),
            "createdAt": detail.createdAt,
        }

    rows = await _request(
        "POST",
        "favorites?on_conflict=user_id,type,target_id",
        payload={
            "user_id": user_id,
            "type": payload.target_type,
            "target_id": target_id,
            "recommendation_id": target_id if payload.target_type == "recommendation" else payload.recommendation_id,
            "title": title,
            "reason": reason,
            "hashtags": hashtags,
            "storyboard": storyboard,
            "source": source,
            "metadata": source,
        },
        prefer="resolution=merge-duplicates,return=representation",
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Favorite upsert did not return a row.", 502, "SUPABASE_ERROR")
    return {"favorite": _to_favorite(row)}


async def update_favorite(user_id: str, favorite_id: str, payload: FavoriteUpdatePayload) -> dict[str, Any]:
    patch = {
        key: value
        for key, value in {
            "title": payload.title,
            "reason": payload.reason,
            "hashtags": payload.hashtags,
            "storyboard": payload.storyboard,
            "source": payload.source,
            "metadata": payload.metadata,
        }.items()
        if value is not None
    }
    if not patch:
        raise BackendApiError("No fields to update.", 400, "VALIDATION_ERROR")

    rows = await _request(
        "PATCH",
        "favorites",
        params={"id": f"eq.{favorite_id}", "user_id": f"eq.{user_id}"},
        payload=patch,
        prefer="return=representation",
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Favorite not found.", 404, "NOT_FOUND")
    return {"favorite": _to_favorite(row)}


async def delete_favorite(user_id: str, favorite_id: str) -> dict[str, Any]:
    rows = await _request(
        "DELETE",
        "favorites",
        params={"id": f"eq.{favorite_id}", "user_id": f"eq.{user_id}"},
        prefer="return=representation",
    )
    if not isinstance(rows, list) or not rows:
        raise BackendApiError("Favorite not found.", 404, "NOT_FOUND")
    return {"deleted": True}


async def delete_favorite_by_target(user_id: str, favorite_type: FavoriteType, target_id: str) -> dict[str, Any]:
    rows = await _request(
        "DELETE",
        "favorites",
        params={"user_id": f"eq.{user_id}", "type": f"eq.{favorite_type}", "target_id": f"eq.{target_id}"},
        prefer="return=representation",
    )
    if not isinstance(rows, list) or not rows:
        raise BackendApiError("Favorite not found.", 404, "NOT_FOUND")
    return {"deleted": True}
