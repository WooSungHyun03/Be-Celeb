# Defines recommendation schemas for FastAPI responses and OpenAI generation.
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.trend import Platform, TrendCategory

RecommendationPriority = Literal["high", "medium", "low"]
Difficulty = Literal["쉬움", "보통", "어려움"]


class Recommendation(BaseModel):
    id: str
    title: str
    summary: str
    category: TrendCategory
    platforms: list[Platform]
    priority: RecommendationPriority
    expected_score: int
    hook_text: str
    content_plan: list[str]
    hashtags: list[str]
    reason: str
    steps: list[str]
    related_trend_ids: list[str]
    is_saved: bool


class RuleBasedRecommendationResult(BaseModel):
    score: int
    category_fit: int
    platform_fit: int
    notes: list[str]


class RecommendationGenerateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_profile: dict[str, object] = Field(default_factory=dict, alias="userProfile")
    trend_data: list[dict[str, object]] = Field(default_factory=list, alias="trendData")


class GeneratedRecommendation(BaseModel):
    title: str
    reason: str
    hookText: str
    contentPlan: list[str]
    hashtags: list[str]
    uploadTime: str
    difficulty: Difficulty
    expectedScore: int


class GeneratedRecommendationPayload(BaseModel):
    recommendation: GeneratedRecommendation
    ruleBasedResult: RuleBasedRecommendationResult
    model: str
