# Defines trend API routes.
from fastapi import APIRouter

from app.schemas.trend import Trend
from app.utils.response import ApiResponse

router = APIRouter(tags=["trends"])


@router.get("/trends", response_model=ApiResponse[list[Trend]])
def list_trends() -> ApiResponse[list[Trend]]:
    return ApiResponse(
        success=True,
        data=[],
        message="Live YouTube trend data is served by /api/trends/popular-videos and /api/trends/keywords in the Next.js app.",
    )
