// Defines user profile contracts for onboarding and recommendations.
import type { Platform, TrendCategory } from "@/types/trend";

export type CreatorGoal = "growth" | "conversion" | "branding" | "community";

export type UserProfile = {
  id: string;
  displayName: string;
  youtubeChannelHandle: string;
  primaryCategory: TrendCategory;
  platforms: Platform[];
  goals: CreatorGoal[];
  subscriberRange: string;
};


