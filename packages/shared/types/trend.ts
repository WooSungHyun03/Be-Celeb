// Defines shared trend contracts for frontend and backend coordination.
export type SharedPlatform = "youtube";

export type SharedTrendCategory = "mukbang" | "ai-video" | "dance" | "beauty" | "fashion" | "daily";

export type SharedTrend = {
  id: string;
  title: string;
  category: SharedTrendCategory;
  platforms: SharedPlatform[];
  score: number;
};


