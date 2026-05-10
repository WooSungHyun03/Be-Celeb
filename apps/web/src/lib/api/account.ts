// Account API validation and Supabase row mapping helpers.
import type { User } from "@supabase/supabase-js";

export const PROFILE_SELECT = "user_id,nickname,display_name,phone,status,onboarding_completed";
export const USER_PLAN_SELECT = "user_id,plan_code,status,started_at";
export const CREATOR_PROFILE_SELECT = "user_id,category,platforms,goals,onboarding_status";

export type ProfileRow = {
  user_id: string;
  nickname: string | null;
  display_name: string | null;
  phone: string | null;
  status: string | null;
  onboarding_completed: boolean | null;
};

export type UserPlanRow = {
  user_id: string;
  plan_code: string | null;
  status: string | null;
  started_at: string | null;
};

export type CreatorProfileRow = {
  user_id: string;
  category: string | null;
  platforms: string[] | null;
  goals: string[] | null;
  onboarding_status: string | null;
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
    displayName: row.display_name,
    phone: row.phone,
    status: row.status,
    onboardingCompleted: row.onboarding_completed ?? false,
  };
}

export function toPublicPlan(row: UserPlanRow | null) {
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    planCode: row.plan_code,
    status: row.status,
    startedAt: row.started_at,
  };
}

export function toPublicOnboarding(row: CreatorProfileRow | null) {
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    category: row.category,
    platforms: row.platforms ?? [],
    goals: row.goals ?? [],
    status: row.onboarding_status,
  };
}

export function isNoRowsError(error: SupabaseErrorLike | null) {
  return error?.code === "PGRST116";
}

export function isDuplicateError(error: SupabaseErrorLike | null) {
  return error?.code === "23505" || error?.message?.toLowerCase().includes("duplicate") === true;
}

export function isInactiveStatus(status: string | null | undefined) {
  return status === "inactive" || status === "deactivated" || status === "deleted";
}

export function authErrorLooksLikeDuplicateEmail(error: SupabaseErrorLike) {
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("already") || message.includes("registered") || message.includes("exists");
}
