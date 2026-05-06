# Defines mock trend API routes.
from fastapi import APIRouter

from app.schemas.trend import Trend
from app.services.trend_analysis_service import get_mock_trends
from app.utils.response import ApiResponse

router = APIRouter(tags=["trends"])


@router.get("/trends", response_model=ApiResponse[list[Trend]])
def list_trends() -> ApiResponse[list[Trend]]:
    # TODO: Replace with trend analysis pipeline output.
    return ApiResponse(success=True, data=get_mock_trends())
