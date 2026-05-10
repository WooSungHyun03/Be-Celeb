import { apiError, apiException, apiSuccess } from "@/lib/api/responses";
import {
  authErrorLooksLikeDuplicateEmail,
  CREATOR_PROFILE_SELECT,
  isDuplicateError,
  isValidEmail,
  isValidNickname,
  isValidPassword,
  PROFILE_SELECT,
  toPublicProfile,
  toPublicUser,
} from "@/lib/api/account";
import { getStringField, readJsonObject } from "@/lib/api/request";
import { createSupabaseServerClient, getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
        data: {
          nickname,
        },
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
      if (isDuplicateError(profileError)) {
        return apiError("Nickname is already in use.", "DUPLICATE_NICKNAME", 409);
      }

      return apiError("Failed to create profile.", "SUPABASE_ERROR", 500);
    }

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
      return apiError("Failed to create creator profile.", "SUPABASE_ERROR", 500);
    }

    return apiSuccess(
      {
        user: toPublicUser(user),
        profile: toPublicProfile(profile),
      },
      201,
    );
  } catch (error) {
    return apiException(error);
  }
}
