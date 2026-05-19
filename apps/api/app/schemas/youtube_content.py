# Defines compatibility schemas consumed by the Vercel frontend.
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

CreatorCategoryName = Literal[
    "게임",
    "운동",
    "IT",
    "노래",
    "OTT",
    "일상",
    "뷰티",
    "스터디",
    "코미디",
    "먹방",
    "춤",
]
TrendKeywordRange = Literal["daily", "weekly", "monthly"]


class RecommendationFieldOptions(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    reason: bool = True
    hashtags: bool = True
    storyboard: bool = True
    hook: bool = False
    thumbnail_idea: bool = Field(default=False, alias="thumbnailIdea")
    upload_tips: bool = Field(default=False, alias="uploadTips")


class RecommendContentRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    channel_url: str = Field(alias="channelUrl", min_length=1)
    category: str | None = None
    options: RecommendationFieldOptions | None = None


class AnalyzeChannelRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    channel_url: str = Field(alias="channelUrl", min_length=1)


class YouTubeThumbnail(BaseModel):
    url: str | None = None
    width: int | None = None
    height: int | None = None


class CategoryScore(BaseModel):
    category: CreatorCategoryName
    score: int
    matchedKeywords: list[str]


class YouTubeChannelAnalysis(BaseModel):
    youtubeChannelId: str
    channelTitle: str
    channelUrl: str
    description: str
    thumbnailUrl: str | None = None
    subscriberCount: int | None = None
    videoCount: int | None = None
    viewCount: int | None = None
    uploadsPlaylistId: str
    raw: dict[str, Any] = Field(default_factory=dict)


class YouTubeVideoAnalysis(BaseModel):
    youtubeVideoId: str
    channelId: str
    publishedAt: str
    title: str
    description: str
    thumbnails: dict[str, YouTubeThumbnail] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
    viewCount: int | None = None
    likeCount: int | None = None
    commentCount: int | None = None
    raw: dict[str, Any] = Field(default_factory=dict)


class ChannelAnalysisResult(BaseModel):
    channel: YouTubeChannelAnalysis
    recentVideos: list[YouTubeVideoAnalysis]
    inferredCategory: CreatorCategoryName
    categoryScores: list[CategoryScore]


class StoryboardScene(BaseModel):
    scene: int
    duration: str
    visual: str = ""
    dialogue: str = ""
    caption: str = ""
    shootingTip: str = ""
    description: str = ""


class ContentRecommendation(BaseModel):
    title: str
    format: str
    reason: str
    whyNotDuplicate: str
    targetAudience: str
    hashtags: list[str]
    thumbnailIdea: str
    storyboard: list[StoryboardScene]


class LlmRecommendationResponse(BaseModel):
    selectedCategory: str
    summary: str
    recommendations: list[ContentRecommendation]


class PersistenceResult(BaseModel):
    analysisId: str | None = None
    recommendationId: str | None = None
    error: str | None = None


class RecommendationApiResult(ChannelAnalysisResult):
    selectedCategory: CreatorCategoryName
    influencerVideosUsed: int
    duplicateVideosExcluded: int
    llmParseError: str | None = None
    recommendation: LlmRecommendationResponse
    persistence: PersistenceResult


class RecommendationOption(BaseModel):
    optionId: str
    ideaTitle: str
    format: str
    summary: str
    reason: str
    whyNotDuplicate: str
    expectedAudience: str


class RecommendationOptionsChannel(BaseModel):
    youtubeChannelId: str
    title: str
    thumbnailUrl: str | None = None


class RecommendOptionsResponse(BaseModel):
    analysisId: str
    selectedCategory: CreatorCategoryName
    inferredCategory: CreatorCategoryName | None = None
    channel: RecommendationOptionsChannel
    options: list[RecommendationOption]


class GenerateContentPlanOptionInput(BaseModel):
    optionId: str
    ideaTitle: str
    format: str
    summary: str


class GenerateContentPlanRequest(BaseModel):
    analysisId: str
    option: GenerateContentPlanOptionInput


class ContentPlan(BaseModel):
    title: str
    format: str = "YouTube video"
    hashtags: list[str] = Field(default_factory=list)
    thumbnailIdea: str | None = None
    targetAudience: str | None = None
    hook: str | None = None
    storyboard: list[StoryboardScene] = Field(default_factory=list)
    uploadTips: list[str] = Field(default_factory=list)


class ContentPlanResponse(BaseModel):
    analysisId: str
    selectedOptionId: str
    plan: ContentPlan


class SingleContentRecommendation(ContentPlan):
    reason: str | None = None
    whyNotDuplicate: str | None = None


class RecommendationResponseChannel(BaseModel):
    youtubeChannelId: str
    title: str
    channelUrl: str | None = None
    thumbnailUrl: str | None = None


class SingleRecommendContentResponse(BaseModel):
    recommendationId: str
    analysisId: str
    selectedCategory: CreatorCategoryName
    channel: RecommendationResponseChannel
    recommendation: SingleContentRecommendation
    options: RecommendationFieldOptions = Field(default_factory=RecommendationFieldOptions)


class RecommendationDetailResponse(SingleRecommendContentResponse):
    createdAt: str | None = None


class PopularTrendVideo(BaseModel):
    category: str
    youtubeVideoId: str
    title: str
    description: str
    thumbnailUrl: str | None = None
    tags: list[str]
    viewCount: int | None = None
    likeCount: int | None = None
    commentCount: int | None = None
    publishedAt: str | None = None
    youtubeUrl: str


class PopularVideosResponse(BaseModel):
    videos: list[PopularTrendVideo]


class TrendKeywordCount(BaseModel):
    keyword: str
    count: int


class TrendKeywordSeriesPoint(BaseModel):
    period: str

    model_config = ConfigDict(extra="allow")


class TrendKeywordsResponse(BaseModel):
    range: TrendKeywordRange
    topKeywords: list[TrendKeywordCount]
    seriesKeywords: list[str]
    series: list[TrendKeywordSeriesPoint]
