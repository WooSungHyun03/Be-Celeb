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
    channelsTotal: int = 0
    channelsChecked: int
    channelsSkippedByBatchLimit: int = 0
    channelsSkippedByTimeBudget: int = 0
    videosFoundLast24h: int
    videosUpserted: int
    videosAnalyzed: int = 0
    videosAnalysisAlreadyPresent: int = 0
    videosAnalysisDeferred: int = 0
    videosAnalysisSkipped: int = 0
    videosAnalysisSkippedByLimit: int = 0
    videosAnalysisSkippedByYoutube: int = 0
    pendingVideoAnalysisCount: int = 0
    videoAnalysisErrorCount: int = 0
    videoAnalysisSkipReasons: dict[str, int] = Field(default_factory=dict)
    videoAnalysisSkips: list[dict[str, Any]] = Field(default_factory=list)
    videoAnalysisErrors: list[dict[str, Any]] = Field(default_factory=list)
    errors: list[dict[str, Any]] = Field(default_factory=list)
    durationSeconds: float | None = None
    memory: dict[str, Any] = Field(default_factory=dict)
    jobSkippedReason: str | None = None


class AdminYoutubeBackfillPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    start_date: str | None = Field(default=None, alias="startDate")
    end_date: str | None = Field(default=None, alias="endDate")
    dry_run: bool = Field(default=False, alias="dryRun")
    resume: bool = True
    channel_limit: int | None = Field(default=None, alias="channelLimit", ge=1, le=50)
    concurrency: int | None = Field(default=None, ge=1, le=1)
    pages_per_channel: int | None = Field(default=None, alias="pagesPerChannel", ge=1, le=10)
    time_budget_seconds: int | None = Field(default=None, alias="timeBudgetSeconds", ge=10, le=180)


class AdminYoutubeBackfillSummary(BaseModel):
    ok: bool = True
    jobId: str | None = None
    jobType: str = "youtube-backfill"
    status: str
    dryRun: bool = False
    startedAt: str
    finishedAt: str | None = None
    windowStart: str
    windowEnd: str
    channelsTotal: int = 0
    channelsProcessed: int = 0
    channelsRemaining: int = 0
    pagesScanned: int = 0
    videosFound: int = 0
    videosMatchedWindow: int = 0
    collectedVideos: int = 0
    skippedDuplicates: int = 0
    videosAnalyzed: int = 0
    videosAnalysisAlreadyPresent: int = 0
    videosAnalysisDeferred: int = 0
    pendingVideoAnalysisCount: int = 0
    failedItems: list[dict[str, Any]] = Field(default_factory=list)
    checkpoint: dict[str, Any] = Field(default_factory=dict)
    durationSeconds: float | None = None
    memory: dict[str, Any] = Field(default_factory=dict)
    jobSkippedReason: str | None = None


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
