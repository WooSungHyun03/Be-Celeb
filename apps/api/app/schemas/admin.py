# Defines request and response models for protected admin operations.
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


AdminStatus = Literal["ok", "warning", "error"]


class AdminMetric(BaseModel):
    label: str
    value: int | str
    tone: Literal["default", "success", "warning", "danger"] = "default"


class AdminOverview(BaseModel):
    totalCategories: int
    totalInfluencerChannels: int
    activeChannels: int
    inactiveChannels: int
    totalVideos: int
    videosCollectedLast24h: int
    latestCollectionStatus: str | None = None
    latestCollectionFinishedAt: str | None = None
    recommendationCount: int
    recentErrors: list[dict[str, Any]] = Field(default_factory=list)


class CategoryPayload(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class CategoryUpdatePayload(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class InfluencerChannelPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    category_id: str | None = Field(default=None, alias="categoryId")
    category_ids: list[str] | None = Field(default=None, alias="categoryIds")
    channel_url: str = Field(alias="channelUrl", min_length=1)
    youtube_channel_id: str | None = Field(default=None, alias="youtubeChannelId")
    channel_title: str | None = Field(default=None, alias="channelTitle")
    description: str | None = None
    thumbnail_url: str | None = Field(default=None, alias="thumbnailUrl")
    is_active: bool = Field(default=True, alias="isActive")


class InfluencerChannelUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    category_id: str | None = Field(default=None, alias="categoryId")
    category_ids: list[str] | None = Field(default=None, alias="categoryIds")
    channel_url: str | None = Field(default=None, alias="channelUrl")
    youtube_channel_id: str | None = Field(default=None, alias="youtubeChannelId")
    channel_title: str | None = Field(default=None, alias="channelTitle")
    description: str | None = None
    thumbnail_url: str | None = Field(default=None, alias="thumbnailUrl")
    is_active: bool | None = Field(default=None, alias="isActive")


class VideoUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str | None = None
    description: str | None = None
    tags: list[str] | None = None
    category_ids: list[str] | None = Field(default=None, alias="categoryIds")


class DangerDeleteVideosByCategoryPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    category_id: str = Field(alias="categoryId")
    confirm: str


class DangerConfirmPayload(BaseModel):
    confirm: str


class AdminCollectionSummary(BaseModel):
    ok: bool = True
    scheduledTime: str = "Every day 06:00 KST"
    collectedAt: str
    windowStart: str
    windowEnd: str
    categoriesChecked: int
    channelsChecked: int
    videosFoundLast24h: int
    videosUpserted: int
    videosAnalyzed: int = 0
    videosAnalysisSkipped: int = 0
    videosAnalysisSkippedByLimit: int = 0
    videosAnalysisSkippedByYoutube: int = 0
    videoAnalysisErrors: list[dict[str, Any]] = Field(default_factory=list)
    errors: list[dict[str, Any]] = Field(default_factory=list)


class AdminSystemStatus(BaseModel):
    environment: str
    apiBaseUrl: str
    env: dict[str, bool]
    supabaseConnected: bool
    health: AdminStatus


class AdminTestResult(BaseModel):
    ok: bool
    message: str
    detail: dict[str, Any] | None = None


class PromptTemplatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(min_length=1)
    type: str = "content_recommendation"
    system_prompt: str = Field(alias="systemPrompt", min_length=1)
    user_prompt_template: str = Field(alias="userPromptTemplate", min_length=1)
    is_active: bool = Field(default=False, alias="isActive")
    variables: dict[str, Any] | None = None


class PromptTemplateUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    type: str | None = None
    system_prompt: str | None = Field(default=None, alias="systemPrompt")
    user_prompt_template: str | None = Field(default=None, alias="userPromptTemplate")
    is_active: bool | None = Field(default=None, alias="isActive")
    variables: dict[str, Any] | None = None
