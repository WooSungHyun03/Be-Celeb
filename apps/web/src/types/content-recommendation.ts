export type CreatorCategoryName =
  | "게임"
  | "운동"
  | "IT"
  | "노래"
  | "OTT"
  | "일상"
  | "뷰티"
  | "스터디"
  | "코미디"
  | "먹방"
  | "춤";

export type CategoryScore = {
  category: CreatorCategoryName;
  score: number;
  matchedKeywords: string[];
};

export type YouTubeThumbnail = {
  url?: string;
  width?: number;
  height?: number;
};

export type YouTubeChannelAnalysis = {
  youtubeChannelId: string;
  channelTitle: string;
  channelUrl: string;
  description: string;
  thumbnailUrl: string | null;
  subscriberCount?: number | null;
  videoCount?: number | null;
  viewCount?: number | null;
  uploadsPlaylistId: string;
  raw: Record<string, unknown>;
};

export type YouTubeVideoAnalysis = {
  youtubeVideoId: string;
  channelId: string;
  publishedAt: string;
  title: string;
  description: string;
  thumbnails: Record<string, YouTubeThumbnail>;
  tags: string[];
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  raw: Record<string, unknown>;
};

export type ChannelAnalysisResult = {
  channel: YouTubeChannelAnalysis;
  recentVideos: YouTubeVideoAnalysis[];
  inferredCategory: CreatorCategoryName;
  categoryScores: CategoryScore[];
};

export type StoryboardScene = {
  scene: number;
  duration: string;
  visual: string;
  dialogue: string;
  caption: string;
  shootingTip: string;
  description?: string;
};

export type RecommendationFieldOptions = {
  reason: boolean;
  hashtags: boolean;
  storyboard: boolean;
  hook: boolean;
  thumbnailIdea?: boolean;
  thumbnail_idea?: boolean;
  uploadTips?: boolean;
  upload_tips?: boolean;
};

export type ContentRecommendation = {
  title: string;
  format: string;
  reason: string;
  whyNotDuplicate: string;
  targetAudience: string;
  hashtags: string[];
  thumbnailIdea: string;
  hook?: string;
  storyboard: StoryboardScene[];
  uploadTips?: string[];
};

export type LlmRecommendationResponse = {
  selectedCategory: string;
  summary: string;
  recommendations: ContentRecommendation[];
};

export type RecommendationApiResult = ChannelAnalysisResult & {
  selectedCategory: CreatorCategoryName;
  influencerVideosUsed: number;
  duplicateVideosExcluded: number;
  llmParseError?: string;
  recommendation: LlmRecommendationResponse;
  persistence: {
    analysisId: string | null;
    recommendationId: string | null;
    error: string | null;
  };
};

export type RecommendationOption = {
  optionId: string;
  ideaTitle: string;
  format: string;
  summary: string;
  reason: string;
  whyNotDuplicate: string;
  expectedAudience: string;
};

export type RecommendOptionsResponse = {
  analysisId: string;
  selectedCategory: CreatorCategoryName;
  inferredCategory: CreatorCategoryName | null;
  channel: {
    youtubeChannelId: string;
    title: string;
    channelUrl?: string | null;
    thumbnailUrl: string | null;
  };
  options: RecommendationOption[];
};

export type ContentPlan = {
  title: string;
  format: string;
  hashtags: string[];
  thumbnailIdea: string;
  targetAudience: string;
  hook: string;
  toneAnalysis?: string | null;
  captionStyle?: string | null;
  flowSummary?: string | null;
  storyboard: StoryboardScene[];
  uploadTips: string[];
};

export type GenerateContentPlanResponse = {
  analysisId: string;
  selectedOptionId: string;
  plan: ContentPlan;
};

export type GenerateContentPlanPayload = {
  analysisId: string;
  option: Pick<RecommendationOption, "optionId" | "ideaTitle" | "format" | "summary">;
};

export type SingleContentRecommendation = {
  title: string;
  format: string;
  hashtags?: string[];
  thumbnailIdea?: string | null;
  targetAudience?: string | null;
  hook?: string | null;
  toneAnalysis?: string | null;
  captionStyle?: string | null;
  flowSummary?: string | null;
  reason?: string | null;
  whyNotDuplicate?: string | null;
  storyboard?: StoryboardScene[];
  uploadTips?: string[];
};

export type SingleRecommendContentResponse = {
  recommendationId: string;
  analysisId: string;
  selectedCategory: CreatorCategoryName;
  channel: {
    youtubeChannelId: string;
    title: string;
    channelUrl?: string | null;
    thumbnailUrl: string | null;
  };
  recommendation: SingleContentRecommendation;
  options?: RecommendationFieldOptions;
};

export type RecommendationDetailResponse = SingleRecommendContentResponse & {
  createdAt?: string | null;
};

export type UserChannelSettings = {
  id: string;
  userId: string;
  channelUrl: string;
  category: CreatorCategoryName | string;
  youtubeChannelId: string | null;
  channelTitle: string | null;
  channelThumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
};
