import { apiError, apiException, apiSuccess } from "@/app/api/_utils/api";
import { isValidPassword } from "@/app/api/_utils/account";
import { getStringField, readJsonObject } from "@/app/api/_utils/request";
import { getAuthProvider, getAuthProviderUnavailableMessage } from "@/lib/config/auth-provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const body = await readJsonObject(request);

    if (!body) {
      return apiError("Request body must be a JSON object.", "VALIDATION_ERROR", 400);
    }

    const password = getStringField(body, "password");

    if (!password || !isValidPassword(password)) {
      return apiError("Password must be at least 8 characters.", "VALIDATION_ERROR", 400);
    }

    const provider = getAuthProvider();

    if (provider === "unavailable") {
      return apiError(getAuthProviderUnavailableMessage(), "AUTH_PROVIDER_UNAVAILABLE", 503);
    }

    if (provider === "json") {
      return apiError("Password reset links are unavailable in JSON development auth.", "AUTH_PROVIDER_UNAVAILABLE", 503);
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return apiError("Recovery session required.", "UNAUTHORIZED", 401);
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      return apiError("Failed to update password.", "SUPABASE_ERROR", 500);
    }

    return apiSuccess(null);
  } catch (error) {
    return apiException(error, request);
  }
}
