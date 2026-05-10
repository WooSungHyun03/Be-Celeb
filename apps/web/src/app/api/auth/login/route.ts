<<<<<<< HEAD
import { apiError, apiException, apiSuccess } from "@/app/api/_utils/api";
import {
  CREATOR_PROFILE_SELECT,
  isValidEmail,
  PROFILE_SELECT,
  toAuthCreatorProfile,
  toAuthPlan,
  toAuthProfile,
  type CreatorProfileRow,
  type ProfileRow,
  type UserPlanRow,
  USER_PLAN_SELECT,
} from "@/app/api/_utils/account";
import { getStringField, readJsonObject } from "@/app/api/_utils/request";
import { getAuthProvider, getAuthProviderUnavailableMessage } from "@/lib/config/auth-provider";
import {
  DevAuthStoreError,
  setDevAuthCookie,
  toDevAuthUser,
  verifyDevUserLogin,
} from "@/lib/config/dev-auth-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
=======
import { apiError, apiException, apiSuccess } from "@/lib/api/responses";
import {
  isInactiveStatus,
  isValidEmail,
  PROFILE_SELECT,
  toPublicUser,
  type ProfileRow,
} from "@/lib/api/account";
import { getStringField, readJsonObject } from "@/lib/api/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
>>>>>>> d16f7371cbc515473b9a4164bc9decd97a69134b

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);

    if (!body) {
      return apiError("Request body must be a JSON object.", "VALIDATION_ERROR", 400);
    }

    const email = getStringField(body, "email")?.toLowerCase();
    const password = getStringField(body, "password");

    if (!email || !isValidEmail(email) || !password) {
      return apiError("Email and password are required.", "VALIDATION_ERROR", 400);
    }

<<<<<<< HEAD
    const provider = getAuthProvider();

    if (provider === "unavailable") {
      return apiError(getAuthProviderUnavailableMessage(), "AUTH_PROVIDER_UNAVAILABLE", 503);
    }

    if (provider === "json") {
      try {
        const devUser = await verifyDevUserLogin(email, password);

        if (devUser.profile.is_deleted) {
          return apiError("Account is deleted.", "FORBIDDEN", 403);
        }

        const response = apiSuccess({
          user: toDevAuthUser(devUser),
          authProvider: "json",
        });

        setDevAuthCookie(response, devUser.id);
        return response;
      } catch (error) {
        if (error instanceof DevAuthStoreError) {
          return apiError(error.message, error.code === "INVALID_CREDENTIALS" ? "UNAUTHORIZED" : error.code, error.status);
        }

        throw error;
      }
    }

=======
>>>>>>> d16f7371cbc515473b9a4164bc9decd97a69134b
    const supabase = await createSupabaseServerClient();
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

<<<<<<< HEAD
    if (loginError || !loginData.user) {
      return apiError("Invalid email or password.", "UNAUTHORIZED", 401);
    }

    const [profileResult, planResult, creatorProfileResult] = await Promise.all([
      supabase.from("profiles").select(PROFILE_SELECT).eq("user_id", loginData.user.id).maybeSingle<ProfileRow>(),
      supabase.from("user_plans").select(USER_PLAN_SELECT).eq("user_id", loginData.user.id).maybeSingle<UserPlanRow>(),
      supabase
        .from("creator_profiles")
        .select(CREATOR_PROFILE_SELECT)
        .eq("user_id", loginData.user.id)
        .maybeSingle<CreatorProfileRow>(),
    ]);

    if (profileResult.error || planResult.error || creatorProfileResult.error) {
      return apiError("Failed to load account data.", "SUPABASE_ERROR", 500);
    }

    if (!profileResult.data) {
      await supabase.auth.signOut();
      return apiError("Profile not found.", "NOT_FOUND", 404);
    }

    if (profileResult.data.is_deleted) {
      await supabase.auth.signOut();
      return apiError("Account is deleted.", "FORBIDDEN", 403);
    }

    return apiSuccess({
      user: {
        id: loginData.user.id,
        email: loginData.user.email ?? null,
        profile: toAuthProfile(profileResult.data),
        plan: planResult.data ? toAuthPlan(planResult.data) : null,
        creator_profile: creatorProfileResult.data ? toAuthCreatorProfile(creatorProfileResult.data) : null,
      },
      authProvider: "supabase",
    });
  } catch (error) {
    return apiException(error, request);
=======
    if (loginError) {
      return apiError("Invalid email or password.", "UNAUTHORIZED", 401);
    }

    const user = loginData.user;

    if (!user) {
      return apiError("Invalid email or password.", "UNAUTHORIZED", 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("user_id", user.id)
      .maybeSingle<ProfileRow>();

    if (profileError) {
      return apiError("Failed to load profile.", "SUPABASE_ERROR", 500);
    }

    if (isInactiveStatus(profile?.status)) {
      await supabase.auth.signOut();
      return apiError("Account is inactive.", "FORBIDDEN", 403);
    }

    return apiSuccess({
      user: toPublicUser(user),
    });
  } catch (error) {
    return apiException(error);
>>>>>>> d16f7371cbc515473b9a4164bc9decd97a69134b
  }
}
