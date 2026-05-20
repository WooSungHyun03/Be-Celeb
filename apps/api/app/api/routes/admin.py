# Defines protected admin routes for operational management.
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.errors import AppException
from app.domains.trends.schemas import NaverKeywordGroupPayload, NaverKeywordGroupUpdatePayload
from app.domains.trends.service import (
    collect_naver_trends,
    create_naver_keyword_group,
    delete_naver_keyword_group,
    list_naver_collection_logs,
    list_naver_keyword_groups,
    update_naver_keyword_group,
)
from app.schemas.admin import (
    CategoryPayload,
    CategoryUpdatePayload,
    DangerConfirmPayload,
    DangerDeleteVideosByCategoryPayload,
    InfluencerChannelPayload,
    InfluencerChannelUpdatePayload,
    PromptTemplatePayload,
    PromptTemplateUpdatePayload,
    VideoUpdatePayload,
)
from app.services.admin_service import (
    collect_admin_now,
    danger_delete_all_videos,
    create_admin_category,
    create_admin_influencer_channel,
    danger_delete_all_collection_logs,
    danger_delete_inactive_channels,
    danger_delete_videos_by_category,
    delete_admin_category,
    delete_admin_influencer_channel,
    delete_admin_recommendation,
    delete_admin_video,
    get_admin_overview,
    get_admin_system_status,
    get_admin_video,
    list_admin_analyses,
    list_admin_categories,
    list_admin_collection_logs,
    list_admin_influencer_channels,
    list_admin_recommendations,
    list_admin_videos,
    sync_admin_influencer_channel,
    test_admin_llm,
    test_admin_shop,
    test_admin_youtube,
    update_admin_category,
    update_admin_influencer_channel,
    update_admin_video,
)
from app.services.prompt_template_service import (
    activate_prompt_template,
    create_prompt_template,
    delete_prompt_template,
    list_prompt_templates,
    update_prompt_template,
)
from app.utils.response import ApiResponse

router = APIRouter(prefix="/api/admin", tags=["admin"])


def admin_error_response(error: Exception) -> JSONResponse:
    if isinstance(error, AppException):
        return JSONResponse(
            status_code=error.status_code,
            content={"success": False, "message": str(error), "code": error.code},
        )
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error.", "code": "INTERNAL_SERVER_ERROR"},
    )


async def require_admin(
    authorization: str | None = Header(default=None),
    x_admin_secret: str | None = Header(default=None),
) -> None:
    settings = get_settings()
    if not settings.admin_secret:
        raise HTTPException(status_code=500, detail="Missing required environment variable: ADMIN_SECRET")
    expected = settings.admin_secret
    bearer = f"Bearer {expected}"
    if authorization != bearer and x_admin_secret != expected:
        raise HTTPException(status_code=401, detail="Unauthorized admin request.")


AdminAuth = Depends(require_admin)


@router.get("/overview", response_model=None)
async def overview(_: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await get_admin_overview())
    except Exception as error:
        return admin_error_response(error)


@router.get("/categories", response_model=None)
async def categories(_: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await list_admin_categories())
    except Exception as error:
        return admin_error_response(error)


@router.post("/categories", response_model=None)
async def create_category(payload: CategoryPayload, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await create_admin_category(payload.name))
    except Exception as error:
        return admin_error_response(error)


@router.patch("/categories/{category_id}", response_model=None)
async def update_category(category_id: str, payload: CategoryUpdatePayload, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await update_admin_category(category_id, payload.name))
    except Exception as error:
        return admin_error_response(error)


@router.delete("/categories/{category_id}", response_model=None)
async def delete_category(category_id: str, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await delete_admin_category(category_id))
    except Exception as error:
        return admin_error_response(error)


@router.get("/influencer-channels", response_model=None)
async def influencer_channels(
    category_id: str | None = Query(default=None, alias="categoryId"),
    search: str | None = None,
    is_active: bool | None = Query(default=None, alias="isActive"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: None = AdminAuth,
) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(
            success=True,
            data=await list_admin_influencer_channels(category_id, search, is_active, limit, offset),
        )
    except Exception as error:
        return admin_error_response(error)


@router.post("/influencer-channels", response_model=None)
async def create_influencer_channel(payload: InfluencerChannelPayload, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await create_admin_influencer_channel(payload.model_dump(by_alias=False)))
    except Exception as error:
        return admin_error_response(error)


@router.patch("/influencer-channels/{channel_id}", response_model=None)
async def update_influencer_channel(
    channel_id: str,
    payload: InfluencerChannelUpdatePayload,
    _: None = AdminAuth,
) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(
            success=True,
            data=await update_admin_influencer_channel(channel_id, payload.model_dump(by_alias=False, exclude_unset=True)),
        )
    except Exception as error:
        return admin_error_response(error)


@router.delete("/influencer-channels/{channel_id}", response_model=None)
async def delete_influencer_channel(channel_id: str, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await delete_admin_influencer_channel(channel_id))
    except Exception as error:
        return admin_error_response(error)


@router.post("/influencer-channels/{channel_id}/sync", response_model=None)
async def sync_influencer_channel(channel_id: str, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await sync_admin_influencer_channel(channel_id))
    except Exception as error:
        return admin_error_response(error)


@router.get("/videos", response_model=None)
async def videos(
    category_id: str | None = Query(default=None, alias="categoryId"),
    channel_id: str | None = Query(default=None, alias="channelId"),
    search: str | None = None,
    date_from: str | None = Query(default=None, alias="dateFrom"),
    date_to: str | None = Query(default=None, alias="dateTo"),
    sort_by: str = Query(default="published_at", alias="sortBy"),
    sort_order: str = Query(default="desc", alias="sortOrder"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: None = AdminAuth,
) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(
            success=True,
            data=await list_admin_videos(category_id, channel_id, search, date_from, date_to, sort_by, sort_order, limit, offset),
        )
    except Exception as error:
        return admin_error_response(error)


@router.get("/videos/{video_id}", response_model=None)
async def video_detail(video_id: str, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await get_admin_video(video_id))
    except Exception as error:
        return admin_error_response(error)


@router.patch("/videos/{video_id}", response_model=None)
async def update_video(video_id: str, payload: VideoUpdatePayload, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await update_admin_video(video_id, payload.model_dump(exclude_unset=True)))
    except Exception as error:
        return admin_error_response(error)


@router.delete("/videos/{video_id}", response_model=None)
async def delete_video(video_id: str, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await delete_admin_video(video_id))
    except Exception as error:
        return admin_error_response(error)


@router.post("/collect-now", response_model=None)
async def collect_now(_: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await collect_admin_now())
    except Exception as error:
        return admin_error_response(error)


@router.get("/collection-logs", response_model=None)
async def collection_logs(
    status: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: None = AdminAuth,
) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await list_admin_collection_logs(status, limit, offset))
    except Exception as error:
        return admin_error_response(error)


@router.get("/naver-keyword-groups", response_model=None)
async def naver_keyword_groups(
    category: str | None = None,
    is_active: bool | None = Query(default=None, alias="isActive"),
    _: None = AdminAuth,
) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await list_naver_keyword_groups(category, is_active))
    except Exception as error:
        return admin_error_response(error)


@router.post("/naver-keyword-groups", response_model=None)
async def create_naver_keyword_group_route(
    payload: NaverKeywordGroupPayload,
    _: None = AdminAuth,
) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await create_naver_keyword_group(payload.model_dump(by_alias=False)))
    except Exception as error:
        return admin_error_response(error)


@router.patch("/naver-keyword-groups/{group_id}", response_model=None)
async def update_naver_keyword_group_route(
    group_id: str,
    payload: NaverKeywordGroupUpdatePayload,
    _: None = AdminAuth,
) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await update_naver_keyword_group(group_id, payload.model_dump(by_alias=False, exclude_unset=True)))
    except Exception as error:
        return admin_error_response(error)


@router.delete("/naver-keyword-groups/{group_id}", response_model=None)
async def delete_naver_keyword_group_route(group_id: str, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await delete_naver_keyword_group(group_id))
    except Exception as error:
        return admin_error_response(error)


@router.post("/collect-naver-trends", response_model=None)
async def collect_naver_now(_: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await collect_naver_trends())
    except Exception as error:
        return admin_error_response(error)


@router.get("/naver-collection-logs", response_model=None)
async def naver_collection_logs(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: None = AdminAuth,
) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await list_naver_collection_logs(limit, offset))
    except Exception as error:
        return admin_error_response(error)


@router.get("/analyses", response_model=None)
async def analyses(limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0), _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await list_admin_analyses(limit, offset))
    except Exception as error:
        return admin_error_response(error)


@router.get("/recommendations", response_model=None)
async def recommendations(limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0), _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await list_admin_recommendations(limit, offset))
    except Exception as error:
        return admin_error_response(error)


@router.delete("/recommendations/{recommendation_id}", response_model=None)
async def delete_recommendation(recommendation_id: str, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await delete_admin_recommendation(recommendation_id))
    except Exception as error:
        return admin_error_response(error)


@router.get("/system-status", response_model=None)
async def system_status(_: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await get_admin_system_status())
    except Exception as error:
        return admin_error_response(error)


@router.get("/llm-prompts", response_model=None)
async def llm_prompts(_: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await list_prompt_templates())
    except Exception as error:
        return admin_error_response(error)


@router.post("/llm-prompts", response_model=None)
async def create_llm_prompt(payload: PromptTemplatePayload, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await create_prompt_template(payload.model_dump(by_alias=False)))
    except Exception as error:
        return admin_error_response(error)


@router.patch("/llm-prompts/{prompt_id}", response_model=None)
async def update_llm_prompt(
    prompt_id: str,
    payload: PromptTemplateUpdatePayload,
    _: None = AdminAuth,
) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await update_prompt_template(prompt_id, payload.model_dump(by_alias=False, exclude_unset=True)))
    except Exception as error:
        return admin_error_response(error)


@router.delete("/llm-prompts/{prompt_id}", response_model=None)
async def delete_llm_prompt(prompt_id: str, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await delete_prompt_template(prompt_id))
    except Exception as error:
        return admin_error_response(error)


@router.post("/llm-prompts/{prompt_id}/activate", response_model=None)
async def activate_llm_prompt(prompt_id: str, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await activate_prompt_template(prompt_id))
    except Exception as error:
        return admin_error_response(error)


@router.post("/test-youtube", response_model=None)
async def test_youtube(_: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await test_admin_youtube())
    except Exception as error:
        return admin_error_response(error)


@router.post("/test-llm", response_model=None)
async def test_llm(_: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await test_admin_llm())
    except Exception as error:
        return admin_error_response(error)


@router.post("/test-shop", response_model=None)
async def test_shop(_: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await test_admin_shop())
    except Exception as error:
        return admin_error_response(error)


@router.post("/danger/delete-videos-by-category", response_model=None)
async def delete_videos_by_category(
    payload: DangerDeleteVideosByCategoryPayload,
    _: None = AdminAuth,
) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await danger_delete_videos_by_category(payload.category_id, payload.confirm))
    except Exception as error:
        return admin_error_response(error)


@router.post("/danger/delete-all-videos", response_model=None)
async def delete_all_videos(payload: DangerConfirmPayload, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await danger_delete_all_videos(payload.confirm))
    except Exception as error:
        return admin_error_response(error)


@router.post("/danger/delete-all-collection-logs", response_model=None)
async def delete_all_collection_logs(payload: DangerConfirmPayload, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await danger_delete_all_collection_logs(payload.confirm))
    except Exception as error:
        return admin_error_response(error)


@router.post("/danger/delete-inactive-channels", response_model=None)
async def delete_inactive_channels(payload: DangerConfirmPayload, _: None = AdminAuth) -> ApiResponse[Any] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await danger_delete_inactive_channels(payload.confirm))
    except Exception as error:
        return admin_error_response(error)
