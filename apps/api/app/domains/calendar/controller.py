from __future__ import annotations

from typing import Any

from fastapi import Header, Query
from fastapi.responses import JSONResponse

from app.core.responses import ApiResponse, error_response
from app.domains.calendar.schemas import CalendarEventPayload, CalendarEventUpdatePayload
from app.domains.calendar.service import create_calendar_event, delete_calendar_event, list_calendar_events, update_calendar_event, get_holidays
from app.services.auth_service import access_token_from_authorization, require_user_from_access_token


async def calendar_events(
    start: str | None = Query(default=None),
    end: str | None = Query(default=None),
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await list_calendar_events(user["id"], start, end))
    except Exception as error:
        return error_response(error)


async def add_calendar_event(
    payload: CalendarEventPayload,
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await create_calendar_event(user["id"], payload))
    except Exception as error:
        return error_response(error)


async def patch_calendar_event(
    event_id: str,
    payload: CalendarEventUpdatePayload,
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await update_calendar_event(user["id"], event_id, payload))
    except Exception as error:
        return error_response(error)


async def remove_calendar_event(
    event_id: str,
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await delete_calendar_event(user["id"], event_id))
    except Exception as error:
        return error_response(error)


async def get_calendar_holidays(
    start: str | None = Query(default=None),
    end: str | None = Query(default=None),
    category: str | None = Query(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        holidays = await get_holidays(start, end, category)
        return ApiResponse(
            success=True,
            data={"holidays": holidays, "total_count": len(holidays)}
        )
    except Exception as error:
        return error_response(error)
