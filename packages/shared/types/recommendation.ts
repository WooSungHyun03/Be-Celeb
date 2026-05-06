// Defines shared recommendation contracts for API contract discussions.
import type { SharedPlatform, SharedTrendCategory } from "./trend";

export type SharedRecommendationPriority = "high" | "medium" | "low";

export type SharedRecommendation = {
  id: string;
  title: string;
  category: SharedTrendCategory;
  platforms: SharedPlatform[];
  priority: SharedRecommendationPriority;
};
