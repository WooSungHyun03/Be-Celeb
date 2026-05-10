import type { SupabaseClient, User } from "@supabase/supabase-js";
import { apiError } from "@/app/api/_utils/api";

export const PROFILE_SELECT =
  "user_id,nickname,instagram_username,avatar_url,onboarding_completed,is_deleted,deleted_at,created_at,updated_at";
export const USER_PLAN_SELECT =
  "user_id,plan_name,monthly_recommendation_limit,monthly_recommendation_used,renews_at";
export const CREATOR_PROFILE_SELECT =
  "user_id,instagram_experience,categories,follower_range,upload_frequency,content_goal,preferred_style,onboarding_completed";
export const ADDRESS_SELECT =
  "id,user_id,recipient_name,phone,zipcode,address1,address2,is_default,created_at,updated_at";

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

export type AddressRow = {
  id: string;
  user_id: string;
  recipient_name: string;
  phone: string;
  zipcode: string;
  address1: string;
  address2: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type SupabaseErrorLike = {
  code?: string;
  message?: string;
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

export function isNoRowsError(error: SupabaseErrorLike | null) {
  return error?.code === "PGRST116";
}

export function isDuplicateError(error: SupabaseErrorLike | null) {
  return error?.code === "23505" || error?.message?.toLowerCase().includes("duplicate") === true;
}

export function authErrorLooksLikeDuplicateEmail(error: SupabaseErrorLike) {
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("already") || message.includes("registered") || message.includes("exists");
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email ?? null,
  };
}

export function toAuthProfile(row: ProfileRow) {
  return {
    nickname: row.nickname,
    instagram_username: row.instagram_username,
    avatar_url: row.avatar_url,
    onboarding_completed: row.onboarding_completed,
    is_deleted: row.is_deleted,
    deleted_at: row.deleted_at,
  };
}

export function toAuthPlan(row: UserPlanRow) {
  return {
    plan_name: row.plan_name,
    monthly_recommendation_limit: row.monthly_recommendation_limit,
    monthly_recommendation_used: row.monthly_recommendation_used,
    renews_at: row.renews_at,
  };
}

export function toAuthCreatorProfile(row: CreatorProfileRow) {
  return {
    instagram_experience: row.instagram_experience,
    categories: row.categories ?? [],
    follower_range: row.follower_range,
    upload_frequency: row.upload_frequency,
    content_goal: row.content_goal,
    preferred_style: row.preferred_style,
    onboarding_completed: row.onboarding_completed,
  };
}

export function toAuthUserPayload(
  user: User,
  profile: ProfileRow,
  plan: UserPlanRow,
  creatorProfile: CreatorProfileRow,
) {
  return {
    id: user.id,
    email: user.email ?? null,
    profile: toAuthProfile(profile),
    plan: toAuthPlan(plan),
    creator_profile: toAuthCreatorProfile(creatorProfile),
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

export function toPublicAddress(row: AddressRow) {
  return {
    id: row.id,
    userId: row.user_id,
    recipientName: row.recipient_name,
    phone: row.phone,
    postalCode: row.zipcode,
    address1: row.address1,
    address2: row.address2,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function requireActiveUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      response: apiError("Authentication required.", "UNAUTHORIZED", 401),
      user: null,
      profile: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    return {
      response: apiError("Failed to load profile.", "SUPABASE_ERROR", 500),
      user,
      profile: null,
    };
  }

  if (!profile) {
    return {
      response: apiError("Profile not found.", "NOT_FOUND", 404),
      user,
      profile: null,
    };
  }

  if (profile.is_deleted) {
    return {
      response: apiError("Account is deleted.", "FORBIDDEN", 403),
      user,
      profile,
    };
  }

  return {
    response: null,
    user,
    profile,
  };
}
