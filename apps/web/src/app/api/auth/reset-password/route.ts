import { apiError, apiException, apiSuccess } from "@/app/api/_utils/api";
import { isValidEmail } from "@/app/api/_utils/account";
import { getStringField, readJsonObject } from "@/app/api/_utils/request";
import { getAuthProvider, getAuthProviderUnavailableMessage } from "@/lib/config/auth-provider";
import { getSiteUrlEnv } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);

    if (!body) {
      return apiError("Request body must be a JSON object.", "VALIDATION_ERROR", 400);
    }

    const email = getStringField(body, "email")?.toLowerCase();

    if (!email || !isValidEmail(email)) {
      return apiError("A valid email is required.", "VALIDATION_ERROR", 400);
    }

    const provider = getAuthProvider();

    if (provider === "unavailable") {
      return apiError(getAuthProviderUnavailableMessage(), "AUTH_PROVIDER_UNAVAILABLE", 503);
    }

    if (provider === "json") {
      return apiSuccess({
        emailSent: false,
        authProvider: "json",
      });
    }

    const { siteUrl } = getSiteUrlEnv();
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });

    if (error) {
      return apiError("Failed to send reset password email.", "SUPABASE_ERROR", 500);
    }

    return apiSuccess({
      emailSent: true,
      authProvider: "supabase",
    });
  } catch (error) {
    return apiException(error, request);
  }
}
