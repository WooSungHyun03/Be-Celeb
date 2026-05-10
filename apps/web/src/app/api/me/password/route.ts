import { apiError, apiException, apiSuccess } from "@/app/api/_utils/api";
import { isValidPassword, requireActiveUser } from "@/app/api/_utils/account";
import { getStringField, readJsonObject } from "@/app/api/_utils/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const body = await readJsonObject(request);

    if (!body) {
      return apiError("Request body must be a JSON object.", "VALIDATION_ERROR", 400);
    }

    const currentPassword = getStringField(body, "currentPassword");
    const newPassword = getStringField(body, "newPassword");

    if (!currentPassword || !newPassword) {
      return apiError("Current password and new password are required.", "VALIDATION_ERROR", 400);
    }

    if (!isValidPassword(newPassword)) {
      return apiError("New password must be at least 8 characters.", "VALIDATION_ERROR", 400);
    }

    const supabase = await createSupabaseServerClient();
    const auth = await requireActiveUser(supabase);

    if (auth.response || !auth.user) {
      return auth.response;
    }

    if (!auth.user.email) {
      return apiError("User email is required to confirm password.", "VALIDATION_ERROR", 400);
    }

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: auth.user.email,
      password: currentPassword,
    });

    if (reauthError) {
      return apiError("Current password is incorrect.", "UNAUTHORIZED", 401);
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      return apiError("Failed to update password.", "SUPABASE_ERROR", 500);
    }

    return apiSuccess(null);
  } catch (error) {
    return apiException(error, request);
  }
}
