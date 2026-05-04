# Defines schemas for mock analysis requests and responses.
from pydantic import BaseModel

from app.schemas.trend import Platform, TrendCategory


class AnalysisRequest(BaseModel):
    profile_id: str
    category: TrendCategory
    platforms: list[Platform]


class AnalysisResponse(BaseModel):
    summary: str
    trend_score: int
    recommendation_count: int
    source: str
