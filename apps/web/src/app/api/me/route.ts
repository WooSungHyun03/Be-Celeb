<<<<<<< HEAD
import { apiError, apiException, apiSuccess } from "@/app/api/_utils/api";
import {
  CREATOR_PROFILE_SELECT,
  requireActiveUser,
  toAuthCreatorProfile,
  toAuthPlan,
  toAuthProfile,
  toPublicUser,
  USER_PLAN_SELECT,
  type CreatorProfileRow,
  type UserPlanRow,
} from "@/app/api/_utils/account";
import { getAuthProvider, getAuthProviderUnavailableMessage } from "@/lib/config/auth-provider";
import {
  clearDevAuthCookie,
  getDevUserFromCookie,
  softDeleteDevUser,
  toDevAuthUser,
} from "@/lib/config/dev-auth-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const provider = getAuthProvider();

    if (provider === "unavailable") {
      return apiError(getAuthProviderUnavailableMessage(), "AUTH_PROVIDER_UNAVAILABLE", 503);
    }

    if (provider === "json") {
      const devUser = await getDevUserFromCookie();

      if (!devUser) {
        return apiError("Authentication required.", "UNAUTHORIZED", 401);
      }

      if (devUser.profile.is_deleted) {
        return apiError("Account is deleted.", "FORBIDDEN", 403);
      }

      return apiSuccess({
        user: {
          id: devUser.id,
          email: devUser.email,
        },
        profile: devUser.profile,
        plan: devUser.plan,
        creator_profile: devUser.creator_profile,
        authProvider: "json",
      });
    }

    const supabase = await createSupabaseServerClient();
    const auth = await requireActiveUser(supabase);

    if (auth.response || !auth.user || !auth.profile) {
      return auth.response;
    }

    const [planResult, creatorProfileResult] = await Promise.all([
      supabase.from("user_plans").select(USER_PLAN_SELECT).eq("user_id", auth.user.id).maybeSingle<UserPlanRow>(),
      supabase
        .from("creator_profiles")
        .select(CREATOR_PROFILE_SELECT)
        .eq("user_id", auth.user.id)
        .maybeSingle<CreatorProfileRow>(),
    ]);

    if (planResult.error) {
      return apiError("Failed to load plan.", "SUPABASE_ERROR", 500);
    }

    if (creatorProfileResult.error) {
      return apiError("Failed to load creator profile.", "SUPABASE_ERROR", 500);
    }

    return apiSuccess({
      user: toPublicUser(auth.user),
      profile: toAuthProfile(auth.profile),
      plan: planResult.data ? toAuthPlan(planResult.data) : null,
      creator_profile: creatorProfileResult.data ? toAuthCreatorProfile(creatorProfileResult.data) : null,
      authProvider: "supabase",
    });
  } catch (error) {
    return apiException(error, request);
  }
}

export async function DELETE(request: Request) {
  try {
    const provider = getAuthProvider();

    if (provider === "unavailable") {
      return apiError(getAuthProviderUnavailableMessage(), "AUTH_PROVIDER_UNAVAILABLE", 503);
    }

    if (provider === "json") {
      const devUser = await getDevUserFromCookie();

      if (!devUser) {
        return apiError("Authentication required.", "UNAUTHORIZED", 401);
      }

      if (devUser.profile.is_deleted) {
        return apiError("Account is deleted.", "FORBIDDEN", 403);
      }

      const deletedUser = await softDeleteDevUser(devUser.id);
      const response = apiSuccess({
        user: toDevAuthUser(deletedUser),
        authProvider: "json",
      });
      clearDevAuthCookie(response);
      return response;
    }

    const supabase = await createSupabaseServerClient();
    const auth = await requireActiveUser(supabase);

    if (auth.response || !auth.user) {
      return auth.response;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq("user_id", auth.user.id);

    if (updateError) {
      return apiError("Failed to delete account.", "SUPABASE_ERROR", 500);
    }

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      return apiError("Failed to sign out.", "SUPABASE_ERROR", 500);
    }

    return apiSuccess(null);
  } catch (error) {
    return apiException(error, request);
=======
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
>>>>>>> d16f7371cbc515473b9a4164bc9decd97a69134b
  }
}
