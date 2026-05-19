from __future__ import annotations

from datetime import date
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.exceptions import BadRequestException, BackendApiError, missing_env
from app.domains.calendar.schemas import CalendarEventPayload, CalendarEventUpdatePayload


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


def _validate_date(value: str, field: str) -> str:
    try:
        date.fromisoformat(value)
    except ValueError:
        raise BadRequestException(f"{field} must be YYYY-MM-DD.", "VALIDATION_ERROR")
    return value


def _event_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "userId": row.get("user_id"),
        "favoriteId": row.get("favorite_id"),
        "title": row.get("title"),
        "description": row.get("description"),
        "scheduledDate": row.get("scheduled_date"),
        "startTime": row.get("start_time"),
        "endTime": row.get("end_time"),
        "status": row.get("status"),
        "platform": row.get("platform"),
        "metadata": row.get("metadata") if isinstance(row.get("metadata"), dict) else {},
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


async def list_calendar_events(user_id: str, start: str | None = None, end: str | None = None) -> dict[str, Any]:
    params: dict[str, Any] = {
        "select": "id,user_id,favorite_id,title,description,scheduled_date,start_time,end_time,status,platform,metadata,created_at,updated_at",
        "user_id": f"eq.{user_id}",
        "order": "scheduled_date.asc,start_time.asc.nullslast,created_at.asc",
    }
    if start:
        params["scheduled_date"] = f"gte.{_validate_date(start, 'start')}"
    if end:
        params["scheduled_date"] = f"lte.{_validate_date(end, 'end')}"
    if start and end:
        params["and"] = f"(scheduled_date.gte.{start},scheduled_date.lte.{end})"
        params.pop("scheduled_date", None)

    rows = await _request("GET", "calendar_events", params=params)
    return {"events": [_event_from_row(row) for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []}


async def create_calendar_event(user_id: str, payload: CalendarEventPayload) -> dict[str, Any]:
    row_payload = {
        "user_id": user_id,
        "favorite_id": payload.favorite_id,
        "title": payload.title.strip(),
        "description": payload.description,
        "scheduled_date": _validate_date(payload.scheduled_date, "scheduledDate"),
        "start_time": payload.start_time,
        "end_time": payload.end_time,
        "status": payload.status,
        "platform": payload.platform,
        "metadata": payload.metadata or {},
    }
    rows = await _request("POST", "calendar_events", payload=row_payload, prefer="return=representation")
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Calendar event insert did not return a row.", 502, "SUPABASE_ERROR")
    return {"event": _event_from_row(row)}


async def update_calendar_event(user_id: str, event_id: str, payload: CalendarEventUpdatePayload) -> dict[str, Any]:
    raw = payload.model_dump(by_alias=False, exclude_unset=True)
    patch = {
        "favorite_id": raw.get("favorite_id"),
        "title": raw.get("title").strip() if isinstance(raw.get("title"), str) else raw.get("title"),
        "description": raw.get("description"),
        "scheduled_date": _validate_date(raw["scheduled_date"], "scheduledDate") if isinstance(raw.get("scheduled_date"), str) else raw.get("scheduled_date"),
        "start_time": raw.get("start_time"),
        "end_time": raw.get("end_time"),
        "status": raw.get("status"),
        "platform": raw.get("platform"),
        "metadata": raw.get("metadata"),
    }
    patch = {key: value for key, value in patch.items() if value is not None}
    if not patch:
        raise BadRequestException("No fields to update.", "VALIDATION_ERROR")
    rows = await _request(
        "PATCH",
        "calendar_events",
        params={"id": f"eq.{event_id}", "user_id": f"eq.{user_id}"},
        payload=patch,
        prefer="return=representation",
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Calendar event not found.", 404, "NOT_FOUND")
    return {"event": _event_from_row(row)}


async def delete_calendar_event(user_id: str, event_id: str) -> dict[str, Any]:
    rows = await _request(
        "DELETE",
        "calendar_events",
        params={"id": f"eq.{event_id}", "user_id": f"eq.{user_id}"},
        prefer="return=representation",
    )
    if not isinstance(rows, list) or not rows:
        raise BackendApiError("Calendar event not found.", 404, "NOT_FOUND")
    return {"deleted": True}
