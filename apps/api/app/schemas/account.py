from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ChannelSettingsPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    channel_url: str = Field(alias="channelUrl", min_length=1)
    category: str = Field(min_length=1)


FavoriteType = Literal["trend", "product", "recommendation"]


class FavoritePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    target_type: FavoriteType = Field(default="recommendation", alias="targetType")
    target_id: str | None = Field(default=None, alias="targetId")
    recommendation_id: str | None = Field(default=None, alias="recommendationId")
    title: str | None = None
    reason: str | None = None
    hashtags: list[str] | None = None
    storyboard: list[dict[str, Any]] | None = None
    source: dict[str, Any] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class FavoriteUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str | None = None
    reason: str | None = None
    hashtags: list[str] | None = None
    storyboard: list[dict[str, Any]] | None = None
    source: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None
