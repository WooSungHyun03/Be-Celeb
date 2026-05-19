from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.exceptions import BackendApiError, BadRequestException, NotFoundException, missing_env
from app.domains.production_board.schemas import (
    ProductionBoardChecklistCreatePayload,
    ProductionBoardChecklistUpdatePayload,
    ProductionBoardCreatePayload,
    ProductionBoardMemoUpdatePayload,
    ProductionBoardStatusUpdatePayload,
)
from app.services.database_service import fetch_content_recommendation_detail

PRODUCTION_BOARD_SELECT = (
    "id,user_id,favorite_id,recommendation_id,title,hook,reason,hashtags,storyboard,category,"
    "status,priority,memo,due_date,upload_scheduled_at,created_at,updated_at"
)
CHECKLIST_SELECT = "id,board_item_id,user_id,text,is_done,sort_order,created_at,updated_at"
PRODUCTION_BOARD_STATUSES = ("idea", "script", "filming", "editing", "uploaded")


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
        "checklistTotal": row.get("checklist_total") if isinstance(row.get("checklist_total"), int) else 0,
        "checklistDone": row.get("checklist_done") if isinstance(row.get("checklist_done"), int) else 0,
        "dueDate": row.get("due_date"),
        "uploadScheduledAt": row.get("upload_scheduled_at"),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


def _checklist_item_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "boardItemId": row.get("board_item_id"),
        "userId": row.get("user_id"),
        "text": row.get("text"),
        "isDone": bool(row.get("is_done")),
        "sortOrder": row.get("sort_order") if isinstance(row.get("sort_order"), int) else 0,
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
    raw_items = [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    item_ids = [row["id"] for row in raw_items if isinstance(row.get("id"), str)]
    checklist_counts: dict[str, dict[str, int]] = {item_id: {"total": 0, "done": 0} for item_id in item_ids}
    if item_ids:
        checklist_rows = await _request(
            "GET",
            "production_board_checklist_items",
            params={
                "select": "board_item_id,is_done",
                "user_id": f"eq.{user_id}",
                "board_item_id": f"in.({','.join(item_ids)})",
            },
        )
        if isinstance(checklist_rows, list):
            for checklist_row in checklist_rows:
                if not isinstance(checklist_row, dict):
                    continue
                board_item_id = checklist_row.get("board_item_id")
                if not isinstance(board_item_id, str) or board_item_id not in checklist_counts:
                    continue
                checklist_counts[board_item_id]["total"] += 1
                if checklist_row.get("is_done") is True:
                    checklist_counts[board_item_id]["done"] += 1

    for row in raw_items:
        item_id = row.get("id")
        if isinstance(item_id, str):
            row["checklist_total"] = checklist_counts.get(item_id, {}).get("total", 0)
            row["checklist_done"] = checklist_counts.get(item_id, {}).get("done", 0)
    items = [_item_from_row(row) for row in raw_items]
    return {"items": items}


async def _find_board_item_by_id(user_id: str, item_id: str) -> dict[str, Any]:
    rows = await _request(
        "GET",
        "production_board_items",
        params={
            "select": PRODUCTION_BOARD_SELECT,
            "id": f"eq.{item_id}",
            "user_id": f"eq.{user_id}",
            "limit": "1",
        },
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise NotFoundException("Production board item not found.")
    return row


async def update_production_board_item_status(
    user_id: str,
    item_id: str,
    payload: ProductionBoardStatusUpdatePayload,
) -> dict[str, Any]:
    requested_status = payload.status
    if requested_status not in PRODUCTION_BOARD_STATUSES:
        raise BadRequestException("허용되지 않는 제작 보드 상태입니다.", "VALIDATION_ERROR")

    current_row = await _find_board_item_by_id(user_id, item_id)
    current_status = current_row.get("status")
    if requested_status == current_status:
        return {"item": _item_from_row(current_row)}

    rows = await _request(
        "PATCH",
        f"production_board_items?select={PRODUCTION_BOARD_SELECT}",
        params={"id": f"eq.{item_id}", "user_id": f"eq.{user_id}"},
        payload={
            "status": requested_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        prefer="return=representation",
    )
    updated_row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not updated_row:
        updated_row = await _find_board_item_by_id(user_id, item_id)
        if updated_row.get("status") != requested_status:
            raise BackendApiError("상태 변경에 실패했습니다.", 502, "SUPABASE_ERROR")
    return {"item": _item_from_row(updated_row)}


async def update_production_board_item_memo(
    user_id: str,
    item_id: str,
    payload: ProductionBoardMemoUpdatePayload,
) -> dict[str, Any]:
    await _find_board_item_by_id(user_id, item_id)
    memo = payload.memo
    rows = await _request(
        "PATCH",
        f"production_board_items?select={PRODUCTION_BOARD_SELECT}",
        params={"id": f"eq.{item_id}", "user_id": f"eq.{user_id}"},
        payload={
            "memo": memo,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        prefer="return=representation",
    )
    updated_row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not updated_row:
        updated_row = await _find_board_item_by_id(user_id, item_id)
        if updated_row.get("memo") != memo:
            raise BackendApiError("메모 저장에 실패했습니다.", 502, "SUPABASE_ERROR")
    return {"item": _item_from_row(updated_row)}


async def _find_checklist_item_by_id(user_id: str, checklist_item_id: str) -> dict[str, Any]:
    rows = await _request(
        "GET",
        "production_board_checklist_items",
        params={
            "select": CHECKLIST_SELECT,
            "id": f"eq.{checklist_item_id}",
            "user_id": f"eq.{user_id}",
            "limit": "1",
        },
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise NotFoundException("Checklist item not found.")
    return row


async def list_production_board_checklist_items(user_id: str, item_id: str) -> dict[str, Any]:
    await _find_board_item_by_id(user_id, item_id)
    rows = await _request(
        "GET",
        "production_board_checklist_items",
        params={
            "select": CHECKLIST_SELECT,
            "board_item_id": f"eq.{item_id}",
            "user_id": f"eq.{user_id}",
            "order": "sort_order.asc,created_at.asc",
        },
    )
    items = [_checklist_item_from_row(row) for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    return {"items": items}


async def create_production_board_checklist_item(
    user_id: str,
    item_id: str,
    payload: ProductionBoardChecklistCreatePayload,
) -> dict[str, Any]:
    await _find_board_item_by_id(user_id, item_id)
    text = payload.text.strip()
    if not text:
        raise BadRequestException("Checklist text is required.", "VALIDATION_ERROR")

    rows = await _request(
        "GET",
        "production_board_checklist_items",
        params={
            "select": "sort_order",
            "board_item_id": f"eq.{item_id}",
            "user_id": f"eq.{user_id}",
            "order": "sort_order.desc",
            "limit": "1",
        },
    )
    latest_order = rows[0].get("sort_order") if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    sort_order = latest_order + 1 if isinstance(latest_order, int) else 0

    rows = await _request(
        "POST",
        f"production_board_checklist_items?select={CHECKLIST_SELECT}",
        payload={
            "board_item_id": item_id,
            "user_id": user_id,
            "text": text,
            "is_done": False,
            "sort_order": sort_order,
        },
        prefer="return=representation",
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Checklist insert did not return a row.", 502, "SUPABASE_ERROR")
    return {"item": _checklist_item_from_row(row)}


async def update_production_board_checklist_item(
    user_id: str,
    checklist_item_id: str,
    payload: ProductionBoardChecklistUpdatePayload,
) -> dict[str, Any]:
    await _find_checklist_item_by_id(user_id, checklist_item_id)
    raw = payload.model_dump(exclude_unset=True, by_alias=False)
    patch: dict[str, Any] = {}
    if "text" in raw:
        text = raw.get("text")
        if not isinstance(text, str) or not text.strip():
            raise BadRequestException("Checklist text is required.", "VALIDATION_ERROR")
        patch["text"] = text.strip()
    if "is_done" in raw and isinstance(raw.get("is_done"), bool):
        patch["is_done"] = raw["is_done"]
    if not patch:
        raise BadRequestException("No fields to update.", "VALIDATION_ERROR")

    patch["updated_at"] = datetime.now(timezone.utc).isoformat()
    rows = await _request(
        "PATCH",
        f"production_board_checklist_items?select={CHECKLIST_SELECT}",
        params={"id": f"eq.{checklist_item_id}", "user_id": f"eq.{user_id}"},
        payload=patch,
        prefer="return=representation",
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Checklist update did not return a row.", 502, "SUPABASE_ERROR")
    return {"item": _checklist_item_from_row(row)}


async def delete_production_board_checklist_item(user_id: str, checklist_item_id: str) -> dict[str, Any]:
    rows = await _request(
        "DELETE",
        "production_board_checklist_items",
        params={"id": f"eq.{checklist_item_id}", "user_id": f"eq.{user_id}"},
        prefer="return=representation",
    )
    if not isinstance(rows, list) or not rows:
        raise NotFoundException("Checklist item not found.")
    return {"deleted": True}


async def delete_production_board_item(user_id: str, item_id: str) -> dict[str, Any]:
    rows = await _request(
        "DELETE",
        "production_board_items",
        params={"id": f"eq.{item_id}", "user_id": f"eq.{user_id}"},
        prefer="return=representation",
    )
    if not isinstance(rows, list) or not rows:
        raise NotFoundException("Production board item not found.")
    return {"deleted": True}


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
