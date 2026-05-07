// Defines recommendation-related TypeScript contracts for the web app.
import type { Platform, TrendCategory } from "@/types/trend";

export type RecommendationPriority = "high" | "medium" | "low";

export type Recommendation = {
  id: string;
  title: string;
  summary: string;
  category: TrendCategory;
  platforms: Platform[];
  priority: RecommendationPriority;
  score: number;
  hook: string;
  outline: string[];
  hashtags: string[];
  reason: string;
  steps: string[];
  relatedTrendIds: string[];
  isSaved: boolean;
};
