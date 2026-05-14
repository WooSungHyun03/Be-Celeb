import { apiError, apiException, apiSuccess, logApiError } from "@/app/api/_utils/api";
import {
  authErrorLooksLikeDuplicateEmail,
  CREATOR_PROFILE_SELECT,
  isDuplicateError,
  isValidEmail,
  isValidNickname,
  isValidPassword,
  PROFILE_SELECT,
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

function getNicknameLookupFailureMessage(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  const codeSuffix = error.code ? ` Supabase code: ${error.code}.` : "";

  if (error.code === "42P01" || message.includes("relation") || message.includes("does not exist")) {
    return `Supabase profiles table is not ready in production.${codeSuffix}`;
  }

  if (error.code === "PGRST205") {
    return `Supabase profiles table is missing from the production API schema cache. Apply schema.sql or reload the Supabase schema cache.${codeSuffix}`;
  }

  if (error.code === "42703" || message.includes("column")) {
    return `Supabase profiles.nickname column is not ready in production.${codeSuffix}`;
  }

  if (error.code === "42501" || message.includes("permission denied")) {
    return `Supabase profile lookup permission is not configured.${codeSuffix}`;
  }

  if (message.includes("invalid api key") || message.includes("jwt")) {
    return `Supabase service role key is not configured correctly.${codeSuffix}`;
  }

  if (error.code === "PGRST125") {
    return `Supabase URL is not configured correctly. NEXT_PUBLIC_SUPABASE_URL must be the project URL, not a REST endpoint.${codeSuffix}`;
  }

  return `Failed to check nickname availability. Check Supabase environment variables and production schema.${codeSuffix}`;
}

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
            emailVerificationRequired: false,
            email,
          },
          201,
        );

        setDevAuthCookie(response, devUser.id);
        return response;
      } catch (error) {
        if (error instanceof DevAuthStoreError) {
          const code =
            error.code === "DUPLICATE_EMAIL" || error.code === "DUPLICATE_NICKNAME"
              ? error.code
              : "VALIDATION_ERROR";
          return apiError(error.message, code, error.status);
        }

        throw error;
      }
    }

    const serviceRoleClient = getSupabaseServiceRoleClient();
    const { data: existingNickname, error: nicknameLookupError } = await serviceRoleClient
      .from("profiles")
      .select("user_id")
      .eq("nickname", nickname)
      .maybeSingle();

    if (nicknameLookupError) {
      console.error("[signup] nickname lookup failed", {
        code: nicknameLookupError.code,
        message: nicknameLookupError.message,
      });

      await logApiError({
        request,
        code: "SUPABASE_ERROR",
        message: `Signup nickname lookup failed: ${nicknameLookupError.message}`,
      });

      return apiError(getNicknameLookupFailureMessage(nicknameLookupError), "SUPABASE_ERROR", 500);
    }

    if (existingNickname) {
      return apiError("Nickname is already in use.", "DUPLICATE_NICKNAME", 409);
    }

    const supabase = await createSupabaseServerClient();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname },
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
      .upsert(
        {
          user_id: user.id,
          nickname,
          youtube_channel_url: null,
          avatar_url: null,
          onboarding_completed: false,
          is_deleted: false,
          deleted_at: null,
        },
        { onConflict: "user_id" },
      )
      .select(PROFILE_SELECT)
      .single<ProfileRow>();

    if (profileError) {
      await deleteAuthUserAfterSignupFailure(user.id, request, `Signup profile upsert failed: ${profileError.message}`);

      if (isDuplicateError(profileError)) {
        return apiError("Nickname is already in use.", "DUPLICATE_NICKNAME", 409);
      }

      return apiError("Failed to create profile.", "SUPABASE_ERROR", 500);
    }

    const { data: plan, error: planError } = await serviceRoleClient
      .from("user_plans")
      .upsert(
        {
          user_id: user.id,
          plan_name: "free",
          monthly_recommendation_limit: 5,
          monthly_recommendation_used: 0,
          renews_at: null,
        },
        { onConflict: "user_id" },
      )
      .select(USER_PLAN_SELECT)
      .single<UserPlanRow>();

    if (planError) {
      await deleteAuthUserAfterSignupFailure(user.id, request, `Signup plan upsert failed: ${planError.message}`);
      return apiError("Failed to create default plan.", "SUPABASE_ERROR", 500);
    }

    const { data: creatorProfile, error: creatorProfileError } = await serviceRoleClient
      .from("creator_profiles")
      .upsert(
        {
          user_id: user.id,
          categories: [],
          onboarding_completed: false,
        },
        { onConflict: "user_id" },
      )
      .select(CREATOR_PROFILE_SELECT)
      .single<CreatorProfileRow>();

    if (creatorProfileError) {
      await deleteAuthUserAfterSignupFailure(
        user.id,
        request,
        `Signup creator profile upsert failed: ${creatorProfileError.message}`,
      );
      return apiError("Failed to create creator profile.", "SUPABASE_ERROR", 500);
    }

    return apiSuccess(
      {
        user: toAuthUserPayload(user, profile, plan, creatorProfile),
        authProvider: "supabase",
        emailVerificationRequired: !signUpData.session,
        email,
      },
      201,
    );
  } catch (error) {
    return apiException(error, request);
  }
}

