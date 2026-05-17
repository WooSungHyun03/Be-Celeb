from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.trend import *  # noqa: F403
from app.schemas.youtube_content import PopularVideosResponse, TrendKeywordsResponse

TrendRange = Literal["daily", "weekly", "monthly"]


class NaverTrendTopKeyword(BaseModel):
    keyword: str
    ratio: float
    trendDelta: float


class NaverTrendSeriesPoint(BaseModel):
    period: str

    model_config = ConfigDict(extra="allow")


class NaverTrendKeywordsResponse(BaseModel):
    category: str
    range: TrendRange
    topKeywords: list[NaverTrendTopKeyword]
    seriesKeywords: list[str] = Field(default_factory=list)
    series: list[NaverTrendSeriesPoint]


class CombinedTrendTag(BaseModel):
    keyword: str
    count: int
    views: int


class CombinedTrendVideo(BaseModel):
    youtubeVideoId: str
    title: str
    youtubeUrl: str
    thumbnailUrl: str | None = None
    viewCount: int | None = None
    publishedAt: str | None = None
    tags: list[str] = Field(default_factory=list)


class CombinedTrendKeywordScore(BaseModel):
    keyword: str
    score: float
    youtubeCount: int
    youtubeViews: int
    naverRatio: float


class CombinedTrendYoutubeBlock(BaseModel):
    topTags: list[CombinedTrendTag]
    topVideos: list[CombinedTrendVideo]


class CombinedTrendNaverBlock(BaseModel):
    topKeywords: list[NaverTrendTopKeyword]
    seriesKeywords: list[str] = Field(default_factory=list)
    series: list[NaverTrendSeriesPoint]


class CombinedTrendScoreBlock(BaseModel):
    keywords: list[CombinedTrendKeywordScore]


class CombinedTrendsResponse(BaseModel):
    category: str
    range: TrendRange
    youtube: CombinedTrendYoutubeBlock
    naver: CombinedTrendNaverBlock
    combined: CombinedTrendScoreBlock


class NaverCollectionSummary(BaseModel):
    ok: bool = True
    scheduledTime: str = "Every day 06:00 KST"
    collectedAt: str
    startDate: str
    endDate: str
    timeUnit: str = "date"
    categoriesChecked: int
    groupsChecked: int
    pointsUpserted: int
    errors: list[dict[str, Any]] = Field(default_factory=list)


class NaverKeywordGroupPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    category_id: str | None = Field(default=None, alias="categoryId")
    category_name: str = Field(alias="categoryName", min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=120)
    keywords: list[str] = Field(min_length=1)
    is_active: bool = Field(default=True, alias="isActive")


class NaverKeywordGroupUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    category_id: str | None = Field(default=None, alias="categoryId")
    category_name: str | None = Field(default=None, alias="categoryName", min_length=1, max_length=80)
    title: str | None = Field(default=None, min_length=1, max_length=120)
    keywords: list[str] | None = Field(default=None, min_length=1)
    is_active: bool | None = Field(default=None, alias="isActive")


__all__ = [
    "CombinedTrendsResponse",
    "NaverCollectionSummary",
    "NaverKeywordGroupPayload",
    "NaverKeywordGroupUpdatePayload",
    "NaverTrendKeywordsResponse",
    "PopularVideosResponse",
    "TrendKeywordsResponse",
    "TrendRange",
]
