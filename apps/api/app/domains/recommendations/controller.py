from __future__ import annotations

from typing import cast

from fastapi import Header, Query
from fastapi.responses import JSONResponse

from app.core.responses import ApiResponse, error_response
from app.schemas.youtube_content import (
    AnalyzeChannelRequest,
    ChannelAnalysisResult,
    ContentPlanResponse,
    GenerateContentPlanRequest,
    PopularVideosResponse,
    RecommendationDetailResponse,
    RecommendContentRequest,
    RecommendOptionsResponse,
    SingleRecommendContentResponse,
    TrendKeywordRange,
    TrendKeywordsResponse,
)
from app.services.auth_service import access_token_from_authorization, get_user_from_access_token
from app.services.database_service import fetch_content_recommendation_detail
from app.services.recommendation_service import create_content_plan, create_recommendation_options, create_single_content_recommendation
from app.services.youtube_content_service import analyze_channel_for_recommendation, get_keyword_trends, get_popular_videos_by_category


async def recommend_content(
    request: RecommendContentRequest,
    authorization: str | None = Header(default=None),
) -> ApiResponse[SingleRecommendContentResponse] | JSONResponse:
    try:
        user = await get_user_from_access_token(access_token_from_authorization(authorization))
        result = await create_single_content_recommendation(request.channel_url, request.category, user.get("id") if user else None, request.options)
        return ApiResponse(success=True, data=result)
    except Exception as error:
        return error_response(error)


async def recommendation_detail(
    recommendation_id: str,
    authorization: str | None = Header(default=None),
) -> ApiResponse[RecommendationDetailResponse] | JSONResponse:
    try:
        user = await get_user_from_access_token(access_token_from_authorization(authorization))
        result = await fetch_content_recommendation_detail(recommendation_id, user.get("id") if user else None)
        return ApiResponse(success=True, data=result)
    except Exception as error:
        return error_response(error)


async def analyze_channel(request: AnalyzeChannelRequest) -> ApiResponse[ChannelAnalysisResult] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await analyze_channel_for_recommendation(request.channel_url))
    except Exception as error:
        return error_response(error)


async def recommendation_options(request: RecommendContentRequest) -> ApiResponse[RecommendOptionsResponse] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await create_recommendation_options(request.channel_url, request.category))
    except Exception as error:
        return error_response(error)


async def content_plan(request: GenerateContentPlanRequest) -> ApiResponse[ContentPlanResponse] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await create_content_plan(request.analysisId, request.option))
    except Exception as error:
        return error_response(error)


async def popular_videos() -> ApiResponse[PopularVideosResponse] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await get_popular_videos_by_category())
    except Exception as error:
        return error_response(error)


async def trend_keywords(range_value: str = Query(default="daily", alias="range")) -> ApiResponse[TrendKeywordsResponse] | JSONResponse:
    try:
        if range_value not in {"daily", "weekly", "monthly"}:
            return JSONResponse(status_code=400, content={"success": False, "message": "range must be one of: daily, weekly, monthly.", "code": "VALIDATION_ERROR"})
        return ApiResponse(success=True, data=await get_keyword_trends(cast(TrendKeywordRange, range_value)))
    except Exception as error:
        return error_response(error)
