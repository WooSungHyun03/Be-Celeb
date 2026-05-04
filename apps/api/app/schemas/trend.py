# Defines trend schemas for FastAPI responses.
from typing import Literal

from pydantic import BaseModel

Platform = Literal["instagram-reels", "tiktok", "youtube-shorts"]
TrendCategory = Literal["mukbang", "ai-video", "dance", "beauty", "fashion", "daily"]
TrendDirection = Literal["rising", "stable", "watch"]


class Trend(BaseModel):
    id: str
    title: str
    description: str
    category: TrendCategory
    platforms: list[Platform]
    score: int
    growth_rate: int
    direction: TrendDirection
    tags: list[str]
    predicted_peak: str
    created_at: str
