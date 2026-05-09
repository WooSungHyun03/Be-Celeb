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

    const supabase = await createSupabaseServerClient();
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
  }
}
