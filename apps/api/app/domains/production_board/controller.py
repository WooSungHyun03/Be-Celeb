from __future__ import annotations

from typing import Any

from fastapi import Header
from fastapi.responses import JSONResponse

from app.core.responses import ApiResponse, error_response
from app.domains.production_board.schemas import (
    ProductionBoardChecklistCreatePayload,
    ProductionBoardChecklistUpdatePayload,
    ProductionBoardCreatePayload,
    ProductionBoardMemoUpdatePayload,
    ProductionBoardStatusUpdatePayload,
)
from app.domains.production_board.service import (
    ProductionBoardAlreadyAddedError,
    add_production_board_item,
    create_production_board_checklist_item,
    delete_production_board_checklist_item,
    list_production_board_items,
    list_production_board_checklist_items,
    update_production_board_checklist_item,
    update_production_board_item_memo,
    update_production_board_item_status,
)
from app.services.auth_service import access_token_from_authorization, require_user_from_access_token


async def production_board_items(authorization: str | None = Header(default=None)) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await list_production_board_items(user["id"]))
    except Exception as error:
        return error_response(error)


async def add_production_board_item_from_favorite(
    payload: ProductionBoardCreatePayload,
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await add_production_board_item(user["id"], payload))
    except ProductionBoardAlreadyAddedError as error:
        return JSONResponse(
            status_code=error.status_code,
            content={
                "success": False,
                "code": error.code,
                "message": str(error),
                "itemId": error.item_id,
            },
        )
    except Exception as error:
        return error_response(error)


async def patch_production_board_item_status(
    item_id: str,
    payload: ProductionBoardStatusUpdatePayload,
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await update_production_board_item_status(user["id"], item_id, payload))
    except Exception as error:
        return error_response(error)


async def patch_production_board_item_memo(
    item_id: str,
    payload: ProductionBoardMemoUpdatePayload,
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await update_production_board_item_memo(user["id"], item_id, payload))
    except Exception as error:
        return error_response(error)


async def production_board_checklist_items(
    item_id: str,
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await list_production_board_checklist_items(user["id"], item_id))
    except Exception as error:
        return error_response(error)


async def add_production_board_checklist_item(
    item_id: str,
    payload: ProductionBoardChecklistCreatePayload,
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await create_production_board_checklist_item(user["id"], item_id, payload))
    except Exception as error:
        return error_response(error)


async def patch_production_board_checklist_item(
    checklist_item_id: str,
    payload: ProductionBoardChecklistUpdatePayload,
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await update_production_board_checklist_item(user["id"], checklist_item_id, payload))
    except Exception as error:
        return error_response(error)


async def remove_production_board_checklist_item(
    checklist_item_id: str,
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await require_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data=await delete_production_board_checklist_item(user["id"], checklist_item_id))
    except Exception as error:
        return error_response(error)
