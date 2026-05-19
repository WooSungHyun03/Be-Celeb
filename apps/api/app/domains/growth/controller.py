from __future__ import annotations

from typing import Any

from fastapi import Header
from fastapi.responses import JSONResponse

from app.core.responses import ApiResponse, error_response
from app.domains.growth.service import get_growth_report, refresh_growth_report
from app.services.auth_service import access_token_from_authorization, require_user_from_access_token


async def growth_report(authorization: str | None = Header(default=None)) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await get_growth_report(user["id"]))
    except Exception as error:
        return error_response(error)


async def refresh_report(authorization: str | None = Header(default=None)) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await refresh_growth_report(user["id"]))
    except Exception as error:
        return error_response(error)
