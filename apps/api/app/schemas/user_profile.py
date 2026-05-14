# Defines user profile schemas for future personalization.
from typing import Literal

from pydantic import BaseModel

from app.schemas.trend import Platform, TrendCategory

CreatorGoal = Literal["growth", "conversion", "branding", "community"]


class UserProfile(BaseModel):
    id: str
    display_name: str
    youtube_channel_handle: str
    primary_category: TrendCategory
    platforms: list[Platform]
    goals: list[CreatorGoal]
    subscriber_range: str


