import { apiError, apiException, apiSuccess } from "@/app/api/_utils/api";
import { isValidPassword } from "@/app/api/_utils/account";
import { getStringField, readJsonObject } from "@/app/api/_utils/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
