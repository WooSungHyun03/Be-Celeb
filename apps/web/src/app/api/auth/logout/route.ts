import { apiError, apiException, apiSuccess } from "@/app/api/_utils/api";
import { getAuthProvider, getAuthProviderUnavailableMessage } from "@/lib/config/auth-provider";
import { clearDevAuthCookie } from "@/lib/config/dev-auth-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const provider = getAuthProvider();

    if (provider === "unavailable") {
      return apiError(getAuthProviderUnavailableMessage(), "AUTH_PROVIDER_UNAVAILABLE", 503);
    }

    if (provider === "json") {
      const response = apiSuccess(null);
      clearDevAuthCookie(response);
      return response;
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return apiError("Authentication required.", "UNAUTHORIZED", 401);
    }

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      return apiError("Failed to sign out.", "SUPABASE_ERROR", 500);
    }

    return apiSuccess(null);
  } catch (error) {
    return apiException(error, request);
  }
}
