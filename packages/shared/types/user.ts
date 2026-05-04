// Defines shared user profile contracts for onboarding and personalization.
import type { SharedPlatform, SharedTrendCategory } from "./trend";

export type SharedCreatorGoal = "growth" | "conversion" | "branding" | "community";

export type SharedUserProfile = {
  id: string;
  handle: string;
  primaryCategory: SharedTrendCategory;
  platforms: SharedPlatform[];
  goals: SharedCreatorGoal[];
};
