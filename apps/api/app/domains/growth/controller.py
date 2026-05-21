from __future__ import annotations

from typing import Any

from fastapi import Header
from fastapi.responses import JSONResponse

from app.core.responses import ApiResponse, error_response
from app.core.security import verify_cron_secret
from app.domains.growth.service import get_growth_report, get_growth_video_report, refresh_all_growth_reports, refresh_growth_report
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


async def growth_video_report(
    youtube_video_id: str,
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await get_growth_video_report(user["id"], youtube_video_id))
    except Exception as error:
        return error_response(error)


async def refresh_all_reports(
    authorization: str | None = Header(default=None),
    x_cron_secret: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        verify_cron_secret(authorization, x_cron_secret)
        return ApiResponse(success=True, data=await refresh_all_growth_reports())
    except Exception as error:
        return error_response(error)
