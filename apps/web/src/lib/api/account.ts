// Account API validation and Supabase row mapping helpers.
import type { User } from "@supabase/supabase-js";

export const PROFILE_SELECT =
  "user_id,nickname,instagram_username,avatar_url,onboarding_completed,is_deleted,deleted_at,created_at,updated_at";
export const USER_PLAN_SELECT =
  "user_id,plan_name,monthly_recommendation_limit,monthly_recommendation_used,renews_at";
export const CREATOR_PROFILE_SELECT =
  "user_id,instagram_experience,categories,follower_range,upload_frequency,content_goal,preferred_style,onboarding_completed";

export type ProfileRow = {
  user_id: string;
  nickname: string;
  instagram_username: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export type UserPlanRow = {
  user_id: string;
  plan_name: string;
  monthly_recommendation_limit: number;
  monthly_recommendation_used: number;
  renews_at: string | null;
};

export type CreatorProfileRow = {
  user_id: string;
  instagram_experience: string | null;
  categories: string[] | null;
  follower_range: string | null;
  upload_frequency: string | null;
  content_goal: string | null;
  preferred_style: string | null;
  onboarding_completed: boolean;
};

export type SupabaseErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string) {
  return password.length >= 8;
}

export function isValidNickname(nickname: string) {
  return nickname.length >= 2 && nickname.length <= 30;
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email ?? null,
  };
}

export function toPublicProfile(row: ProfileRow) {
  return {
    userId: row.user_id,
    nickname: row.nickname,
    instagramUsername: row.instagram_username,
    avatarUrl: row.avatar_url,
    onboardingCompleted: row.onboarding_completed,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at,
  };
}

export function toPublicPlan(row: UserPlanRow | null) {
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    planName: row.plan_name,
    monthlyRecommendationLimit: row.monthly_recommendation_limit,
    monthlyRecommendationUsed: row.monthly_recommendation_used,
    renewsAt: row.renews_at,
  };
}

export function toPublicOnboarding(row: CreatorProfileRow | null) {
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    instagramExperience: row.instagram_experience,
    categories: row.categories ?? [],
    followerRange: row.follower_range,
    uploadFrequency: row.upload_frequency,
    contentGoal: row.content_goal,
    preferredStyle: row.preferred_style,
    onboardingCompleted: row.onboarding_completed,
  };
}

export function isNoRowsError(error: SupabaseErrorLike | null) {
  return error?.code === "PGRST116";
}

export function isDuplicateError(error: SupabaseErrorLike | null) {
  return error?.code === "23505" || error?.message?.toLowerCase().includes("duplicate") === true;
}

export function isDeletedProfile(profile: Pick<ProfileRow, "is_deleted"> | null | undefined) {
  return profile?.is_deleted === true;
}

export function authErrorLooksLikeDuplicateEmail(error: SupabaseErrorLike) {
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("already") || message.includes("registered") || message.includes("exists");
}
