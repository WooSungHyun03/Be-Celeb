# Defines recommendation API routes for live generation.
from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.schemas.recommendation import (
    GeneratedRecommendationPayload,
    Recommendation,
    RecommendationGenerateRequest,
)
from app.core.errors import MissingConfigurationError
from app.services.openai_service import generate_openai_recommendation
from app.services.rule_engine_service import calculate_rule_based_result
from app.utils.response import ApiResponse

router = APIRouter(tags=["recommendations"])


@router.get("/recommendations", response_model=ApiResponse[list[Recommendation]])
def list_recommendations() -> ApiResponse[list[Recommendation]]:
    return ApiResponse(
        success=True,
        data=[],
        message="Stored recommendation listing is handled by the Next.js/Supabase layer.",
    )


@router.post("/recommendations/generate", response_model=ApiResponse[GeneratedRecommendationPayload])
def generate_recommendation(
    request: RecommendationGenerateRequest,
) -> ApiResponse[GeneratedRecommendationPayload]:
    rule_result = calculate_rule_based_result(request)

    try:
        recommendation = generate_openai_recommendation(request, rule_result)
    except MissingConfigurationError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    payload = GeneratedRecommendationPayload(
        recommendation=recommendation,
        ruleBasedResult=rule_result,
        model=get_settings().openai_model,
    )

    return ApiResponse(success=True, data=payload)
