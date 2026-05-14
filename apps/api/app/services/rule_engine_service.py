# Provides rule-based scoring for recommendation generation.
from app.schemas.recommendation import RecommendationGenerateRequest, RuleBasedRecommendationResult


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
        "Deterministic starter score; production scoring can be backed by data-design/rule-base.json.",
    ]

    return RuleBasedRecommendationResult(
        score=score,
        category_fit=category_fit,
        platform_fit=platform_fit,
        notes=notes,
    )
