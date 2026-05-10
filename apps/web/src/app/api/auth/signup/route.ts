<<<<<<< HEAD
import { apiError, apiException, apiSuccess, logApiError } from "@/app/api/_utils/api";
=======
import { apiError, apiException, apiSuccess } from "@/lib/api/responses";
>>>>>>> d16f7371cbc515473b9a4164bc9decd97a69134b
import {
  authErrorLooksLikeDuplicateEmail,
  CREATOR_PROFILE_SELECT,
  isDuplicateError,
  isValidEmail,
  isValidNickname,
  isValidPassword,
  PROFILE_SELECT,
<<<<<<< HEAD
  toAuthUserPayload,
  type CreatorProfileRow,
  type ProfileRow,
  type UserPlanRow,
  USER_PLAN_SELECT,
} from "@/app/api/_utils/account";
import { getStringField, readJsonObject } from "@/app/api/_utils/request";
import { getAuthProvider, getAuthProviderUnavailableMessage } from "@/lib/config/auth-provider";
import {
  createDevUser,
  DevAuthStoreError,
  setDevAuthCookie,
  toDevAuthUser,
} from "@/lib/config/dev-auth-store";
import { createSupabaseServerClient, getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function deleteAuthUserAfterSignupFailure(userId: string, request: Request, message: string) {
  const { error } = await getSupabaseServiceRoleClient().auth.admin.deleteUser(userId);

  if (error) {
    await logApiError({
      request,
      userId,
      code: "SUPABASE_ERROR",
      message: `${message}; compensation deleteUser failed: ${error.message}`,
    });
    return;
  }

  await logApiError({
    request,
    userId,
    code: "SUPABASE_ERROR",
    message,
  });
}
=======
  toPublicProfile,
  toPublicUser,
} from "@/lib/api/account";
import { getStringField, readJsonObject } from "@/lib/api/request";
import { createSupabaseServerClient, getSupabaseServiceRoleClient } from "@/lib/supabase/server";

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
    const nickname = getStringField(body, "nickname");

    if (!email || !isValidEmail(email)) {
      return apiError("A valid email is required.", "VALIDATION_ERROR", 400);
    }

    if (!password || !isValidPassword(password)) {
      return apiError("Password must be at least 8 characters.", "VALIDATION_ERROR", 400);
    }

    if (!nickname || !isValidNickname(nickname)) {
      return apiError("Nickname must be between 2 and 30 characters.", "VALIDATION_ERROR", 400);
    }

<<<<<<< HEAD
    const provider = getAuthProvider();

    if (provider === "unavailable") {
      return apiError(getAuthProviderUnavailableMessage(), "AUTH_PROVIDER_UNAVAILABLE", 503);
    }

    if (provider === "json") {
      try {
        const devUser = await createDevUser({ email, password, nickname });
        const response = apiSuccess(
          {
            user: toDevAuthUser(devUser),
            authProvider: "json",
          },
          201,
        );

        setDevAuthCookie(response, devUser.id);
        return response;
      } catch (error) {
        if (error instanceof DevAuthStoreError) {
          const code = error.code === "DUPLICATE_EMAIL" || error.code === "DUPLICATE_NICKNAME"
            ? error.code
            : "VALIDATION_ERROR";
          return apiError(error.message, code, error.status);
        }

        throw error;
      }
    }

=======
>>>>>>> d16f7371cbc515473b9a4164bc9decd97a69134b
    const serviceRoleClient = getSupabaseServiceRoleClient();
    const { data: existingNickname, error: nicknameLookupError } = await serviceRoleClient
      .from("profiles")
      .select("user_id")
      .eq("nickname", nickname)
      .maybeSingle();

    if (nicknameLookupError) {
      return apiError("Failed to check nickname availability.", "SUPABASE_ERROR", 500);
    }

    if (existingNickname) {
      return apiError("Nickname is already in use.", "DUPLICATE_NICKNAME", 409);
    }

    const supabase = await createSupabaseServerClient();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
<<<<<<< HEAD
        data: { nickname },
=======
        data: {
          nickname,
        },
>>>>>>> d16f7371cbc515473b9a4164bc9decd97a69134b
      },
    });

    if (signUpError) {
      if (authErrorLooksLikeDuplicateEmail(signUpError)) {
        return apiError("Email is already in use.", "DUPLICATE_EMAIL", 409);
      }

      return apiError("Failed to create user.", "SUPABASE_ERROR", 500);
    }

    const user = signUpData.user;

    if (!user) {
      return apiError("Failed to create user.", "SUPABASE_ERROR", 500);
    }

    const identities = user.identities ?? [];

    if (Array.isArray(identities) && identities.length === 0) {
      return apiError("Email is already in use.", "DUPLICATE_EMAIL", 409);
    }

    const { data: profile, error: profileError } = await serviceRoleClient
      .from("profiles")
<<<<<<< HEAD
      .upsert({
        user_id: user.id,
        nickname,
        instagram_username: null,
        avatar_url: null,
        onboarding_completed: false,
        is_deleted: false,
      }, { onConflict: "user_id" })
      .select(PROFILE_SELECT)
      .single<ProfileRow>();

    if (profileError) {
      await deleteAuthUserAfterSignupFailure(user.id, request, `Signup profile insert failed: ${profileError.message}`);

=======
      .insert({
        user_id: user.id,
        nickname,
        display_name: nickname,
        phone: null,
        status: "active",
        onboarding_completed: false,
      })
      .select(PROFILE_SELECT)
      .single();

    if (profileError) {
>>>>>>> d16f7371cbc515473b9a4164bc9decd97a69134b
      if (isDuplicateError(profileError)) {
        return apiError("Nickname is already in use.", "DUPLICATE_NICKNAME", 409);
      }

      return apiError("Failed to create profile.", "SUPABASE_ERROR", 500);
    }

<<<<<<< HEAD
    const { data: plan, error: planError } = await serviceRoleClient
      .from("user_plans")
      .upsert({
        user_id: user.id,
        plan_name: "free",
        monthly_recommendation_limit: 5,
        monthly_recommendation_used: 0,
      }, { onConflict: "user_id" })
      .select(USER_PLAN_SELECT)
      .single<UserPlanRow>();

    if (planError) {
      await deleteAuthUserAfterSignupFailure(user.id, request, `Signup plan insert failed: ${planError.message}`);
      return apiError("Failed to create default plan.", "SUPABASE_ERROR", 500);
    }

    const { data: creatorProfile, error: creatorProfileError } = await serviceRoleClient
      .from("creator_profiles")
      .upsert({
        user_id: user.id,
        categories: [],
        onboarding_completed: false,
      }, { onConflict: "user_id" })
      .select(CREATOR_PROFILE_SELECT)
      .single<CreatorProfileRow>();

    if (creatorProfileError) {
      await deleteAuthUserAfterSignupFailure(
        user.id,
        request,
        `Signup creator profile insert failed: ${creatorProfileError.message}`,
      );
=======
    const startedAt = new Date().toISOString();
    const { error: planError } = await serviceRoleClient.from("user_plans").insert({
      user_id: user.id,
      plan_code: "free",
      status: "active",
      started_at: startedAt,
    });

    if (planError) {
      return apiError("Failed to create default plan.", "SUPABASE_ERROR", 500);
    }

    const { error: creatorProfileError } = await serviceRoleClient
      .from("creator_profiles")
      .insert({
        user_id: user.id,
        category: null,
        platforms: [],
        goals: [],
        onboarding_status: "not_started",
      })
      .select(CREATOR_PROFILE_SELECT)
      .single();

    if (creatorProfileError) {
>>>>>>> d16f7371cbc515473b9a4164bc9decd97a69134b
      return apiError("Failed to create creator profile.", "SUPABASE_ERROR", 500);
    }

    return apiSuccess(
      {
<<<<<<< HEAD
        user: toAuthUserPayload(user, profile, plan, creatorProfile),
        authProvider: "supabase",
=======
        user: toPublicUser(user),
        profile: toPublicProfile(profile),
>>>>>>> d16f7371cbc515473b9a4164bc9decd97a69134b
      },
      201,
    );
  } catch (error) {
<<<<<<< HEAD
    return apiException(error, request);
=======
    return apiException(error);
>>>>>>> d16f7371cbc515473b9a4164bc9decd97a69134b
  }
}
