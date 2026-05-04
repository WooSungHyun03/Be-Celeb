# Provides mock AI analysis behavior without external API calls.
from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.services.rule_engine_service import get_mock_recommendations


def analyze_profile_mock(request: AnalysisRequest) -> AnalysisResponse:
    # TODO: Migrate callers to /recommendations/generate for OpenAI-backed structured recommendations.
    matching_recommendations = [
        recommendation
        for recommendation in get_mock_recommendations()
        if recommendation.category == request.category
    ]

    return AnalysisResponse(
        summary=f"Mock analysis for {request.category} across {', '.join(request.platforms)}.",
        trend_score=82,
        recommendation_count=len(matching_recommendations),
        source="mock",
    )
