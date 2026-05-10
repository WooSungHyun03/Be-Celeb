import { apiError, apiException, apiSuccess } from "@/lib/api/responses";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
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
    return apiException(error);
  }
}
