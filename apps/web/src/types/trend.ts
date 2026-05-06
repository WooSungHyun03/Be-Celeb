// Defines trend-related TypeScript contracts for the web app.
export type Platform = "instagram-reels" | "tiktok" | "youtube-shorts";

export type TrendCategory = "mukbang" | "ai-video" | "dance" | "beauty" | "fashion" | "daily";

export type TrendDirection = "rising" | "stable" | "watch";

export type Trend = {
  id: string;
  title: string;
  description: string;
  category: TrendCategory;
  platforms: Platform[];
  score: number;
  growthRate: number;
  direction: TrendDirection;
  tags: string[];
  predictedPeak: string;
  createdAt: string;
};
