# Defines the mock AI/data analysis route.
from fastapi import APIRouter

from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.services.ai_recommendation_service import analyze_profile_mock
from app.utils.response import ApiResponse

router = APIRouter(tags=["analysis"])


@router.post("/analysis", response_model=ApiResponse[AnalysisResponse])
def analyze_profile(request: AnalysisRequest) -> ApiResponse[AnalysisResponse]:
    # TODO: Replace with AI SDK/OpenAI-backed analysis workflow.
    return ApiResponse(success=True, data=analyze_profile_mock(request))
