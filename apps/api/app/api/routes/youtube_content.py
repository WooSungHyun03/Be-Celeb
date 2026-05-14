# Defines Next API-compatible routes served by the Render FastAPI backend.
from typing import cast

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.core.errors import BackendApiError
from app.schemas.youtube_content import (
    AnalyzeChannelRequest,
    ChannelAnalysisResult,
    ContentPlanResponse,
    GenerateContentPlanRequest,
    PopularVideosResponse,
    RecommendOptionsResponse,
    RecommendContentRequest,
    RecommendationApiResult,
    TrendKeywordRange,
    TrendKeywordsResponse,
)
from app.services.recommendation_service import create_content_plan, create_recommendation_options
from app.services.youtube_content_service import (
    analyze_channel_for_recommendation,
    get_keyword_trends,
    get_popular_videos_by_category,
    recommend_content,
)
from app.utils.response import ApiResponse

router = APIRouter(prefix="/api", tags=["youtube-content"])


def error_response(error: Exception) -> JSONResponse:
    if isinstance(error, BackendApiError):
        return JSONResponse(
            status_code=error.status_code,
            content={
                "success": False,
                "message": str(error),
                "code": error.code,
            },
        )

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error.",
            "code": "INTERNAL_SERVER_ERROR",
        },
    )


@router.post("/recommend-options", response_model=ApiResponse[RecommendOptionsResponse])
async def create_recommendation_options_route(
    request: RecommendContentRequest,
) -> ApiResponse[RecommendOptionsResponse] | JSONResponse:
    try:
        result = await create_recommendation_options(request.channel_url, request.category)
        return ApiResponse(success=True, data=result)
    except Exception as error:
        return error_response(error)


@router.post("/generate-content-plan", response_model=ApiResponse[ContentPlanResponse])
async def create_content_plan_route(
    request: GenerateContentPlanRequest,
) -> ApiResponse[ContentPlanResponse] | JSONResponse:
    try:
        result = await create_content_plan(request.analysisId, request.option)
        return ApiResponse(success=True, data=result)
    except Exception as error:
        return error_response(error)


@router.post("/recommend-content", response_model=ApiResponse[RecommendationApiResult])
async def create_content_recommendation(
    request: RecommendContentRequest,
) -> ApiResponse[RecommendationApiResult] | JSONResponse:
    try:
        result = await recommend_content(request.channel_url, request.category)
        return ApiResponse(success=True, data=result)
    except Exception as error:
        return error_response(error)


@router.post("/analyze-channel", response_model=ApiResponse[ChannelAnalysisResult])
async def analyze_channel(
    request: AnalyzeChannelRequest,
) -> ApiResponse[ChannelAnalysisResult] | JSONResponse:
    try:
        result = await analyze_channel_for_recommendation(request.channel_url)
        return ApiResponse(success=True, data=result)
    except Exception as error:
        return error_response(error)


@router.get("/trends/popular-videos", response_model=ApiResponse[PopularVideosResponse])
async def get_popular_videos() -> ApiResponse[PopularVideosResponse] | JSONResponse:
    try:
        result = await get_popular_videos_by_category()
        return ApiResponse(success=True, data=result)
    except Exception as error:
        return error_response(error)


@router.get("/trends/keywords", response_model=ApiResponse[TrendKeywordsResponse])
async def get_trend_keywords(
    range_value: str = Query(default="daily", alias="range"),
) -> ApiResponse[TrendKeywordsResponse] | JSONResponse:
    try:
        if range_value not in {"daily", "weekly", "monthly"}:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "range must be one of: daily, weekly, monthly.",
                    "code": "VALIDATION_ERROR",
                },
            )

        result = await get_keyword_trends(cast(TrendKeywordRange, range_value))
        return ApiResponse(success=True, data=result)
    except Exception as error:
        return error_response(error)
