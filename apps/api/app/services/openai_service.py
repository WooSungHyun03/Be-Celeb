# Calls OpenAI from the FastAPI server to generate content recommendations.
from openai import OpenAI

from app.core.config import get_settings
from app.core.errors import MissingConfigurationError
from app.schemas.recommendation import (
    GeneratedRecommendation,
    RecommendationGenerateRequest,
    RuleBasedRecommendationResult,
)
from app.services.openai_prompts import build_recommendation_prompt


def generate_openai_recommendation(
    request: RecommendationGenerateRequest,
    rule_result: RuleBasedRecommendationResult,
) -> GeneratedRecommendation:
    settings = get_settings()

    if not settings.openai_api_key:
        raise MissingConfigurationError("OPENAI_API_KEY is not configured.")

    client = OpenAI(api_key=settings.openai_api_key)
    response = client.responses.parse(
        model=settings.openai_model,
        input=[
            {
                "role": "system",
                "content": "You are Be Celeb's Korean short-form content strategy assistant.",
            },
            {
                "role": "user",
                "content": build_recommendation_prompt(request, rule_result),
            },
        ],
        text_format=GeneratedRecommendation,
    )

    if response.output_parsed is None:
        raise RuntimeError("OpenAI returned an empty recommendation response.")

    return response.output_parsed
