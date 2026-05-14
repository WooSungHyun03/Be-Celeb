# Defines protected account and per-user channel setting endpoints.
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse

from app.core.errors import BackendApiError
from app.schemas.account import ChannelSettingsPayload
from app.services.account_service import delete_account, get_user_channel_settings, upsert_user_channel_settings
from app.services.auth_service import access_token_from_authorization, require_user_from_access_token
from app.utils.response import ApiResponse

router = APIRouter(prefix="/api", tags=["account"])


def error_response(error: Exception) -> JSONResponse:
    if isinstance(error, BackendApiError):
        return JSONResponse(status_code=error.status_code, content={"success": False, "message": str(error), "code": error.code})
    return JSONResponse(status_code=500, content={"success": False, "message": "Internal server error.", "code": "INTERNAL_SERVER_ERROR"})


@router.delete("/account", response_model=None)
async def delete_current_account(authorization: str | None = Header(default=None)) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await delete_account(user["id"]))
    except Exception as error:
        return error_response(error)


@router.get("/user/channel-settings", response_model=None)
async def channel_settings(authorization: str | None = Header(default=None)) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await get_user_channel_settings(user["id"]))
    except Exception as error:
        return error_response(error)


@router.put("/user/channel-settings", response_model=None)
async def update_channel_settings(
    payload: ChannelSettingsPayload,
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(
            success=True,
            data=await upsert_user_channel_settings(user["id"], payload.channel_url, payload.category),
        )
    except Exception as error:
        return error_response(error)
