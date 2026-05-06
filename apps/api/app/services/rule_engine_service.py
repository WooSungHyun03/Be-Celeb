# Provides rule-based scoring for recommendation generation.
from app.repositories.recommendation_repository import list_mock_recommendations
from app.schemas.recommendation import Recommendation, RecommendationGenerateRequest, RuleBasedRecommendationResult


def get_mock_recommendations() -> list[Recommendation]:
    return list_mock_recommendations()


def calculate_rule_based_result(request: RecommendationGenerateRequest) -> RuleBasedRecommendationResult:
    category = str(request.user_profile.get("primaryCategory", ""))
    profile_platforms = request.user_profile.get("platforms", [])
    trend_count = len(request.trend_data)
    category_fit = 30 if category else 10
    platform_fit = 30 if isinstance(profile_platforms, list) and profile_platforms else 10
    trend_score = min(40, trend_count * 10)
    score = min(100, category_fit + platform_fit + trend_score)

    notes = [
        "Base score combines profile category, platform coverage, and trend data count.",
        "TODO: Replace this deterministic starter with data-design/rule-base.json backed scoring.",
    ]

    return RuleBasedRecommendationResult(
        score=score,
        category_fit=category_fit,
        platform_fit=platform_fit,
        notes=notes,
    )
