// Defines user profile contracts for onboarding and recommendation mocks.
import type { Platform, TrendCategory } from "@/types/trend";

export type CreatorGoal = "growth" | "conversion" | "branding" | "community";

export type UserProfile = {
  id: string;
  displayName: string;
  handle: string;
  primaryCategory: TrendCategory;
  platforms: Platform[];
  goals: CreatorGoal[];
  followerRange: string;
};
