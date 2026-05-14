# Builds prompts for OpenAI recommendation generation in FastAPI.
from app.schemas.recommendation import RecommendationGenerateRequest, RuleBasedRecommendationResult


def build_recommendation_prompt(
    request: RecommendationGenerateRequest,
    rule_result: RuleBasedRecommendationResult,
) -> str:
    return "\n".join(
        [
            "Be Celeb은 숏폼 YouTube 콘텐츠 전략 추천 서비스다.",
            "입력된 userProfile, trendData, ruleBasedResult를 근거로 한국어 추천 JSON을 생성한다.",
            "출력은 GeneratedRecommendation Pydantic schema를 엄격하게 따른다.",
            f"userProfile: {request.user_profile}",
            f"trendData: {request.trend_data}",
            f"ruleBasedResult: {rule_result.model_dump()}",
        ]
    )

