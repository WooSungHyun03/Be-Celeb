# Defines protected account and per-user channel setting endpoints.
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse

from app.core.errors import BackendApiError
from app.schemas.account import ChannelSettingsPayload, FavoritePayload, FavoriteType
from app.services.account_service import delete_account, get_user_channel_settings, upsert_user_channel_settings
from app.services.auth_service import access_token_from_authorization, require_user_from_access_token
from app.services.favorites_service import create_favorite, delete_favorite, delete_favorite_by_target, list_favorites
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


@router.get("/favorites", response_model=None)
async def favorites(
    favorite_type: str | None = Query(default=None, alias="type"),
    target_id: str | None = Query(default=None, alias="targetId"),
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await list_favorites(user["id"], favorite_type, target_id))
    except Exception as error:
        return error_response(error)


@router.post("/favorites", response_model=None)
async def add_favorite(
    payload: FavoritePayload,
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await create_favorite(user["id"], payload))
    except Exception as error:
        return error_response(error)


@router.delete("/favorites/by-target/{favorite_type}/{target_id}", response_model=None)
async def remove_favorite_by_target(
    favorite_type: FavoriteType,
    target_id: str,
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await delete_favorite_by_target(user["id"], favorite_type, target_id))
    except Exception as error:
        return error_response(error)


@router.delete("/favorites/{favorite_id}", response_model=None)
async def remove_favorite(
    favorite_id: str,
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await delete_favorite(user["id"], favorite_id))
    except Exception as error:
        return error_response(error)
