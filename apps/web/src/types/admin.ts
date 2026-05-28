export type AdminOverview = {
  totalCategories: number;
  totalInfluencerChannels: number;
  activeChannels: number;
  inactiveChannels: number;
  totalVideos: number;
  videosCollectedLast24h: number;
  latestCollectionStatus: string | null;
  latestCollectionFinishedAt: string | null;
  recommendationCount: number;
  recentErrors: Array<Record<string, unknown>>;
};

export type AdminCategory = {
  id: string;
  name: string;
  createdAt?: string | null;
  channelCount: number;
  videoCount: number;
};

export type AdminInfluencerChannel = {
  id: string;
  categoryId: string | null;
  categoryIds: string[];
  category: string;
  categoryNames: string[];
  channelUrl: string | null;
  youtubeChannelId: string | null;
  channelTitle: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  lastCollectedAt: string | null;
  videoCount: number;
};

export type AdminVideo = {
  id: string;
  youtubeVideoId: string;
  youtubeUrl: string | null;
  categoryId: string | null;
  categoryIds: string[];
  category: string;
  categoryNames: string[];
  influencerChannelId: string;
  channel: string;
  youtubeChannelId: string;
  title: string;
  description: string | null;
  thumbnails: Record<string, unknown>;
  thumbnailUrl: string | null;
  tags: string[];
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  publishedAt: string | null;
  collectedAt: string | null;
  raw: Record<string, unknown>;
};

export type AdminCollectionLog = {
  id: string;
  job_name: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  summary: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
};

export type AdminCollectionSummary = {
  ok: boolean;
  scheduledTime: string;
  collectedAt: string;
  windowStart: string;
  windowEnd: string;
  categoriesChecked: number;
  channelsTotal: number;
  channelsChecked: number;
  channelsSkippedByBatchLimit: number;
  channelsSkippedByTimeBudget: number;
  videosFoundLast24h: number;
  videosUpserted: number;
  videosAnalyzed: number;
  videosAnalysisSkipped: number;
  videosAnalysisSkippedByLimit: number;
  videosAnalysisSkippedByYoutube: number;
  videoAnalysisErrorCount: number;
  videoAnalysisSkipReasons: Record<string, number>;
  videoAnalysisSkips: Array<Record<string, unknown>>;
  videoAnalysisErrors: Array<Record<string, unknown>>;
  errors: Array<Record<string, unknown>>;
  durationSeconds: number | null;
  memory: Record<string, unknown>;
  jobSkippedReason: string | null;
};

export type AdminNaverKeywordGroup = {
  id: string;
  categoryId: string | null;
  categoryName: string;
  title: string;
  keywords: string[];
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminNaverCollectionLog = {
  id: string;
  job_name: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  summary: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
};

export type AdminNaverCollectionSummary = {
  ok: boolean;
  scheduledTime: string;
  collectedAt: string;
  startDate: string;
  endDate: string;
  timeUnit: string;
  categoriesChecked: number;
  groupsChecked: number;
  pointsUpserted: number;
  errors: Array<Record<string, unknown>>;
};

export type AdminAnalysis = {
  id: string;
  channel_url: string;
  channel_title: string;
  selected_category: string | null;
  inferred_category: string | null;
  recent_videos: unknown[];
  created_at: string;
};

export type AdminRecommendation = {
  id: string;
  analysis_id: string;
  selected_category: string;
  input_payload: Record<string, unknown>;
  llm_response: Record<string, unknown>;
  created_at: string;
};

export type AdminRecommendationOption = {
  id: string;
  analysis_id: string;
  option_id: string;
  selected_category: string;
  option_payload: Record<string, unknown>;
  raw: Record<string, unknown>;
  created_at: string;
};

export type AdminSystemStatus = {
  environment: string;
  apiBaseUrl: string;
  env: Record<string, boolean>;
  supabaseConnected: boolean;
  health: "ok" | "warning" | "error";
};

export type AdminTestResult = {
  ok: boolean;
  message: string;
  detail?: Record<string, unknown> | null;
};

export type AdminPromptTemplate = {
  id: string;
  name: string;
  type: string;
  systemPrompt: string;
  userPromptTemplate: string;
  isActive: boolean;
  variables: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
};
