import { apiError, apiException, apiSuccess } from "@/lib/api/responses";
import {
  CREATOR_PROFILE_SELECT,
  isNoRowsError,
  PROFILE_SELECT,
  toPublicOnboarding,
  toPublicPlan,
  toPublicProfile,
  toPublicUser,
  USER_PLAN_SELECT,
  type CreatorProfileRow,
  type ProfileRow,
  type UserPlanRow,
} from "@/lib/api/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return apiError("Authentication required.", "UNAUTHORIZED", 401);
    }

    const [profileResult, planResult, creatorProfileResult] = await Promise.all([
      supabase.from("profiles").select(PROFILE_SELECT).eq("user_id", user.id).maybeSingle<ProfileRow>(),
      supabase.from("user_plans").select(USER_PLAN_SELECT).eq("user_id", user.id).maybeSingle<UserPlanRow>(),
      supabase
        .from("creator_profiles")
        .select(CREATOR_PROFILE_SELECT)
        .eq("user_id", user.id)
        .maybeSingle<CreatorProfileRow>(),
    ]);

    if (profileResult.error) {
      if (isNoRowsError(profileResult.error)) {
        return apiError("Profile not found.", "NOT_FOUND", 404);
      }

      return apiError("Failed to load profile.", "SUPABASE_ERROR", 500);
    }

    if (!profileResult.data) {
      return apiError("Profile not found.", "NOT_FOUND", 404);
    }

    if (planResult.error && !isNoRowsError(planResult.error)) {
      return apiError("Failed to load plan.", "SUPABASE_ERROR", 500);
    }

    if (creatorProfileResult.error && !isNoRowsError(creatorProfileResult.error)) {
      return apiError("Failed to load onboarding status.", "SUPABASE_ERROR", 500);
    }

    return apiSuccess({
      user: toPublicUser(user),
      profile: toPublicProfile(profileResult.data),
      plan: toPublicPlan(planResult.data ?? null),
      onboarding: toPublicOnboarding(creatorProfileResult.data ?? null),
    });
  } catch (error) {
    return apiException(error);
  }
}
