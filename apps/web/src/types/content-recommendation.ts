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
  description: string;
  caption: string;
};

export type ContentRecommendation = {
  title: string;
  format: string;
  reason: string;
  whyNotDuplicate: string;
  targetAudience: string;
  hashtags: string[];
  thumbnailIdea: string;
  storyboard: StoryboardScene[];
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
