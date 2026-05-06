// Provides a mock creator profile for onboarding and recommendation examples.
import type { UserProfile } from "@/types/user";

export const mockUserProfile: UserProfile = {
  id: "profile-001",
  displayName: "Be Celeb Creator",
  handle: "be_celeb_creator",
  primaryCategory: "ai-video",
  platforms: ["tiktok", "youtube-shorts"],
  goals: ["growth", "branding"],
  followerRange: "1K-10K",
};
