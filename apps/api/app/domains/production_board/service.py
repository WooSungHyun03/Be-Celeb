from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings
from app.core.exceptions import BackendApiError, BadRequestException, NotFoundException, missing_env
from app.domains.production_board.schemas import ProductionBoardCreatePayload
from app.services.database_service import fetch_content_recommendation_detail

PRODUCTION_BOARD_SELECT = (
    "id,user_id,favorite_id,recommendation_id,title,hook,reason,hashtags,storyboard,category,"
    "status,priority,memo,due_date,upload_scheduled_at,created_at,updated_at"
)


class ProductionBoardAlreadyAddedError(BackendApiError):
    def __init__(self, item_id: str):
        super().__init__("이미 제작 보드에 추가된 아이디어입니다.", 409, "ALREADY_ADDED")
        self.item_id = item_id


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


def _as_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str) and item.strip()]


def _item_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "userId": row.get("user_id"),
        "favoriteId": row.get("favorite_id"),
        "recommendationId": row.get("recommendation_id"),
        "title": row.get("title"),
        "hook": row.get("hook"),
        "reason": row.get("reason"),
        "hashtags": _as_string_list(row.get("hashtags")),
        "storyboard": row.get("storyboard"),
        "category": row.get("category"),
        "status": row.get("status"),
        "priority": row.get("priority") or "normal",
        "memo": row.get("memo"),
        "dueDate": row.get("due_date"),
        "uploadScheduledAt": row.get("upload_scheduled_at"),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


def _favorite_recommendation_id(row: dict[str, Any]) -> str | None:
    recommendation_id = row.get("recommendation_id")
    if isinstance(recommendation_id, str) and recommendation_id:
        return recommendation_id
    target_id = row.get("target_id")
    return target_id if isinstance(target_id, str) and target_id else None


async def _find_favorite_by_id(user_id: str, favorite_id: str) -> dict[str, Any]:
    rows = await _request(
        "GET",
        "favorites",
        params={
            "select": "id,user_id,type,target_id,recommendation_id,title,reason,hashtags,storyboard,source,metadata",
            "id": f"eq.{favorite_id}",
            "user_id": f"eq.{user_id}",
            "type": "eq.recommendation",
            "limit": "1",
        },
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise NotFoundException("Favorite recommendation not found.")
    return row


async def _find_favorite_by_recommendation(user_id: str, recommendation_id: str) -> dict[str, Any]:
    rows = await _request(
        "GET",
        "favorites",
        params={
            "select": "id,user_id,type,target_id,recommendation_id,title,reason,hashtags,storyboard,source,metadata",
            "user_id": f"eq.{user_id}",
            "type": "eq.recommendation",
            "target_id": f"eq.{recommendation_id}",
            "limit": "1",
        },
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if row:
        return row

    rows = await _request(
        "GET",
        "favorites",
        params={
            "select": "id,user_id,type,target_id,recommendation_id,title,reason,hashtags,storyboard,source,metadata",
            "user_id": f"eq.{user_id}",
            "type": "eq.recommendation",
            "recommendation_id": f"eq.{recommendation_id}",
            "limit": "1",
        },
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise NotFoundException("Favorite recommendation not found.")
    return row


async def _find_existing_board_item(
    user_id: str,
    *,
    favorite_id: str | None,
    recommendation_id: str | None,
) -> dict[str, Any] | None:
    if recommendation_id:
        rows = await _request(
            "GET",
            "production_board_items",
            params={
                "select": "id,status",
                "user_id": f"eq.{user_id}",
                "recommendation_id": f"eq.{recommendation_id}",
                "limit": "1",
            },
        )
        row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
        if row:
            return row

    if favorite_id:
        rows = await _request(
            "GET",
            "production_board_items",
            params={
                "select": "id,status",
                "user_id": f"eq.{user_id}",
                "favorite_id": f"eq.{favorite_id}",
                "limit": "1",
            },
        )
        row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
        if row:
            return row

    return None


async def list_production_board_items(user_id: str) -> dict[str, Any]:
    rows = await _request(
        "GET",
        "production_board_items",
        params={
            "select": PRODUCTION_BOARD_SELECT,
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
        },
    )
    items = [_item_from_row(row) for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    return {"items": items}


async def add_production_board_item(user_id: str, payload: ProductionBoardCreatePayload) -> dict[str, Any]:
    if not payload.favorite_id and not payload.recommendation_id:
        raise BadRequestException("favoriteId or recommendationId is required.", "VALIDATION_ERROR")

    favorite = (
        await _find_favorite_by_id(user_id, payload.favorite_id)
        if payload.favorite_id
        else await _find_favorite_by_recommendation(user_id, payload.recommendation_id or "")
    )
    recommendation_id = _favorite_recommendation_id(favorite)
    if not recommendation_id:
        raise BackendApiError("Favorite recommendation is missing recommendationId.", 500, "SUPABASE_ERROR")
    if payload.recommendation_id and payload.recommendation_id != recommendation_id:
        raise BadRequestException("favoriteId and recommendationId do not match.", "VALIDATION_ERROR")

    favorite_id = favorite.get("id") if isinstance(favorite.get("id"), str) else payload.favorite_id
    existing = await _find_existing_board_item(
        user_id,
        favorite_id=favorite_id,
        recommendation_id=recommendation_id,
    )
    if existing and isinstance(existing.get("id"), str):
        raise ProductionBoardAlreadyAddedError(existing["id"])

    detail = await fetch_content_recommendation_detail(recommendation_id, user_id)
    row_payload = {
        "user_id": user_id,
        "favorite_id": favorite_id,
        "recommendation_id": recommendation_id,
        "title": detail.recommendation.title,
        "hook": detail.recommendation.hook,
        "reason": detail.recommendation.reason,
        "hashtags": detail.recommendation.hashtags or [],
        "storyboard": [scene.model_dump(mode="json") for scene in detail.recommendation.storyboard],
        "category": detail.selectedCategory,
        "status": "idea",
        "priority": "normal",
    }
    try:
        rows = await _request(
            "POST",
            f"production_board_items?select={PRODUCTION_BOARD_SELECT}",
            payload=row_payload,
            prefer="return=representation",
        )
    except BackendApiError as error:
        if error.status_code == 409:
            existing_after_conflict = await _find_existing_board_item(
                user_id,
                favorite_id=favorite_id,
                recommendation_id=recommendation_id,
            )
            if existing_after_conflict and isinstance(existing_after_conflict.get("id"), str):
                raise ProductionBoardAlreadyAddedError(existing_after_conflict["id"])
        raise
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Production board item insert did not return a row.", 502, "SUPABASE_ERROR")
    return {"item": _item_from_row(row)}
