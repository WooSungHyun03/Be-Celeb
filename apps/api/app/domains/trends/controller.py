from __future__ import annotations

from typing import cast

from fastapi import Header, Query
from fastapi.responses import JSONResponse

from app.api.routes.trends import list_trends
from app.core.responses import ApiResponse, error_response
from app.core.security import verify_cron_secret
from app.domains.trends.schemas import CombinedTrendsResponse, NaverCollectionSummary, NaverTrendKeywordsResponse
from app.domains.trends.service import (
    collect_naver_trends,
    get_combined_trends,
    get_keyword_trends,
    get_naver_trend_keywords,
    get_popular_videos_by_category,
    validate_range,
)
from app.schemas.youtube_content import PopularVideosResponse, TrendKeywordRange, TrendKeywordsResponse


async def popular_videos() -> ApiResponse[PopularVideosResponse] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await get_popular_videos_by_category())
    except Exception as error:
        return error_response(error)


async def trend_keywords(range_value: str = Query(default="daily", alias="range")) -> ApiResponse[TrendKeywordsResponse] | JSONResponse:
    try:
        range_name = validate_range(range_value)
        return ApiResponse(success=True, data=await get_keyword_trends(cast(TrendKeywordRange, range_name)))
    except Exception as error:
        return error_response(error)


async def naver_keywords(
    category: str = Query(default="IT"),
    range_value: str = Query(default="daily", alias="range"),
) -> ApiResponse[NaverTrendKeywordsResponse] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await get_naver_trend_keywords(category, validate_range(range_value)))
    except Exception as error:
        return error_response(error)


async def combined_trends(
    category: str = Query(default="IT"),
    range_value: str = Query(default="daily", alias="range"),
) -> ApiResponse[CombinedTrendsResponse] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await get_combined_trends(category, validate_range(range_value)))
    except Exception as error:
        return error_response(error)


async def collect_naver_trends_cron(
    authorization: str | None = Header(default=None),
    x_cron_secret: str | None = Header(default=None),
) -> NaverCollectionSummary | JSONResponse:
    try:
        verify_cron_secret(authorization, x_cron_secret)
        return await collect_naver_trends()
    except Exception as error:
        return error_response(error)


__all__ = [
    "combined_trends",
    "collect_naver_trends_cron",
    "list_trends",
    "naver_keywords",
    "popular_videos",
    "trend_keywords",
]
