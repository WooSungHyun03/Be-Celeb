from __future__ import annotations

from datetime import date
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.exceptions import BadRequestException, BackendApiError, missing_env
from app.domains.calendar.schemas import CalendarEventPayload, CalendarEventUpdatePayload

CALENDAR_EVENT_SELECT = (
    "id,user_id,favorite_id,production_item_id,title,description,scheduled_date,start_date,end_date,"
    "start_time,end_time,status,color,platform,metadata,created_at,updated_at"
)
CALENDAR_EVENT_LEGACY_SELECT = (
    "id,user_id,favorite_id,title,description,scheduled_date,start_time,end_time,status,platform,metadata,created_at,updated_at"
)
CALENDAR_EVENT_NEW_COLUMNS = {"production_item_id", "start_date", "end_date", "color"}


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


def _is_missing_column_error(error: Exception) -> bool:
    text = str(error)
    return "42703" in text or "does not exist" in text


def _legacy_event_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in payload.items() if key not in CALENDAR_EVENT_NEW_COLUMNS}


def _validate_date(value: str, field: str) -> str:
    try:
        date.fromisoformat(value)
    except ValueError:
        raise BadRequestException(f"{field} must be YYYY-MM-DD.", "VALIDATION_ERROR")
    return value


def _date_or_none(value: Any) -> date | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _validate_date_range(start_date: str, end_date: str | None) -> tuple[str, str | None]:
    start = date.fromisoformat(_validate_date(start_date, "startDate"))
    if not end_date:
        return start_date, None
    end = date.fromisoformat(_validate_date(end_date, "endDate"))
    if end < start:
        raise BadRequestException("endDate must be the same as or after startDate.", "VALIDATION_ERROR")
    return start_date, end_date


def _production_item_id_from_event(row: dict[str, Any]) -> str | None:
    production_item_id = row.get("production_item_id")
    if isinstance(production_item_id, str) and production_item_id:
        return production_item_id
    metadata = row.get("metadata")
    if isinstance(metadata, dict):
        value = metadata.get("productionItemId")
        return value if isinstance(value, str) and value else None
    return None


def _event_from_row(row: dict[str, Any]) -> dict[str, Any]:
    start_date = row.get("start_date") or row.get("scheduled_date")
    end_date = row.get("end_date") or start_date
    return {
        "id": row.get("id"),
        "userId": row.get("user_id"),
        "favoriteId": row.get("favorite_id"),
        "productionItemId": _production_item_id_from_event(row),
        "title": row.get("title"),
        "description": row.get("description"),
        "scheduledDate": row.get("scheduled_date") or start_date,
        "startDate": start_date,
        "endDate": end_date,
        "startTime": row.get("start_time"),
        "endTime": row.get("end_time"),
        "status": row.get("status"),
        "color": row.get("color"),
        "platform": row.get("platform"),
        "metadata": row.get("metadata") if isinstance(row.get("metadata"), dict) else {},
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


async def list_calendar_events(user_id: str, start: str | None = None, end: str | None = None) -> dict[str, Any]:
    params: dict[str, Any] = {
        "select": CALENDAR_EVENT_SELECT,
        "user_id": f"eq.{user_id}",
        "order": "start_date.asc,start_time.asc.nullslast,created_at.asc",
    }
    if end:
        params["start_date"] = f"lte.{_validate_date(end, 'end')}"
    if start:
        _validate_date(start, "start")

    try:
        rows = await _request("GET", "calendar_events", params=params)
    except BackendApiError as error:
        if not _is_missing_column_error(error):
            raise
        legacy_params: dict[str, Any] = {
            "select": CALENDAR_EVENT_LEGACY_SELECT,
            "user_id": f"eq.{user_id}",
            "order": "scheduled_date.asc,start_time.asc.nullslast,created_at.asc",
        }
        if start and end:
            legacy_params["and"] = f"(scheduled_date.gte.{_validate_date(start, 'start')},scheduled_date.lte.{_validate_date(end, 'end')})"
        elif start:
            legacy_params["scheduled_date"] = f"gte.{_validate_date(start, 'start')}"
        elif end:
            legacy_params["scheduled_date"] = f"lte.{_validate_date(end, 'end')}"
        rows = await _request("GET", "calendar_events", params=legacy_params)
    filtered_rows: list[dict[str, Any]] = []
    range_start = _date_or_none(start)
    range_end = _date_or_none(end)
    for row in rows if isinstance(rows, list) else []:
        if not isinstance(row, dict):
            continue
        event_start = _date_or_none(row.get("start_date") or row.get("scheduled_date"))
        event_end = _date_or_none(row.get("end_date") or row.get("start_date") or row.get("scheduled_date"))
        if range_start and event_end and event_end < range_start:
            continue
        if range_end and event_start and event_start > range_end:
            continue
        filtered_rows.append(row)
    return {"events": [_event_from_row(row) for row in filtered_rows]}


async def create_calendar_event(user_id: str, payload: CalendarEventPayload) -> dict[str, Any]:
    start_date = payload.start_date or payload.scheduled_date
    if not start_date:
        raise BadRequestException("startDate is required.", "VALIDATION_ERROR")
    start_date, end_date = _validate_date_range(start_date, payload.end_date)
    metadata = payload.metadata or {}
    if payload.production_item_id:
        metadata = {**metadata, "source": metadata.get("source") or "production-board", "productionItemId": payload.production_item_id}
    row_payload = {
        "user_id": user_id,
        "favorite_id": payload.favorite_id,
        "production_item_id": payload.production_item_id,
        "title": payload.title.strip(),
        "description": payload.description,
        "scheduled_date": start_date,
        "start_date": start_date,
        "end_date": end_date or start_date,
        "start_time": payload.start_time,
        "end_time": payload.end_time,
        "status": payload.status,
        "color": payload.color,
        "platform": payload.platform,
        "metadata": metadata,
    }
    try:
        rows = await _request("POST", "calendar_events", payload=row_payload, prefer="return=representation")
    except BackendApiError as error:
        if not _is_missing_column_error(error):
            raise
        rows = await _request(
            "POST",
            "calendar_events",
            payload=_legacy_event_payload(row_payload),
            prefer="return=representation",
        )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Calendar event insert did not return a row.", 502, "SUPABASE_ERROR")
    await _sync_production_item_from_event(user_id, row)
    return {"event": _event_from_row(row)}


async def update_calendar_event(user_id: str, event_id: str, payload: CalendarEventUpdatePayload) -> dict[str, Any]:
    raw = payload.model_dump(by_alias=False, exclude_unset=True)
    patch: dict[str, Any] = {}
    for payload_key, column in (
        ("favorite_id", "favorite_id"),
        ("production_item_id", "production_item_id"),
        ("description", "description"),
        ("start_time", "start_time"),
        ("end_time", "end_time"),
        ("status", "status"),
        ("color", "color"),
        ("platform", "platform"),
        ("metadata", "metadata"),
    ):
        if payload_key in raw:
            patch[column] = raw.get(payload_key)
    if "title" in raw:
        title = raw.get("title")
        patch["title"] = title.strip() if isinstance(title, str) else title
    start_date = raw.get("start_date") or raw.get("scheduled_date")
    if isinstance(start_date, str):
        validated_start, validated_end = _validate_date_range(start_date, raw.get("end_date"))
        patch["scheduled_date"] = validated_start
        patch["start_date"] = validated_start
        patch["end_date"] = validated_end or validated_start
    elif "end_date" in raw:
        end_date = raw.get("end_date")
        patch["end_date"] = _validate_date(end_date, "endDate") if isinstance(end_date, str) and end_date else None
    if not patch:
        raise BadRequestException("No fields to update.", "VALIDATION_ERROR")
    try:
        rows = await _request(
            "PATCH",
            "calendar_events",
            params={"id": f"eq.{event_id}", "user_id": f"eq.{user_id}"},
            payload=patch,
            prefer="return=representation",
        )
    except BackendApiError as error:
        if not _is_missing_column_error(error):
            raise
        legacy_patch = _legacy_event_payload(patch)
        if "start_date" in patch and "scheduled_date" not in legacy_patch:
            legacy_patch["scheduled_date"] = patch["start_date"]
        rows = await _request(
            "PATCH",
            "calendar_events",
            params={"id": f"eq.{event_id}", "user_id": f"eq.{user_id}"},
            payload=legacy_patch,
            prefer="return=representation",
        )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Calendar event not found.", 404, "NOT_FOUND")
    await _sync_production_item_from_event(user_id, row)
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


async def _sync_production_item_from_event(user_id: str, event_row: dict[str, Any]) -> None:
    production_item_id = _production_item_id_from_event(event_row)
    if not production_item_id:
        return
    metadata = event_row.get("metadata")
    if isinstance(metadata, dict) and metadata.get("source") != "production-board":
        return
    start_date = event_row.get("start_date") or event_row.get("scheduled_date")
    end_date = event_row.get("end_date") or start_date
    try:
        await _request(
            "PATCH",
            "production_board_items",
            params={"id": f"eq.{production_item_id}", "user_id": f"eq.{user_id}"},
            payload={
                "calendar_event_id": event_row.get("id"),
                "shoot_start_date": start_date,
                "shoot_end_date": end_date,
            },
            prefer="return=minimal",
        )
    except Exception:
        return
