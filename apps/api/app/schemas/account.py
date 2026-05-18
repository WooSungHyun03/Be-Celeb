from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ChannelSettingsPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    channel_url: str = Field(alias="channelUrl", min_length=1)
    category: str = Field(min_length=1)


FavoriteType = Literal["trend", "product", "recommendation"]


class FavoritePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    target_type: FavoriteType = Field(alias="targetType")
    target_id: str = Field(alias="targetId", min_length=1)
    title: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
