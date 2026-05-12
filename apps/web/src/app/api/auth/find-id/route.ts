import { apiError, apiException, apiSuccess, logApiError } from "@/app/api/_utils/api";
import { isValidNickname } from "@/app/api/_utils/account";
import { getStringField, readJsonObject } from "@/app/api/_utils/request";
import { getAuthProvider, getAuthProviderUnavailableMessage } from "@/lib/config/auth-provider";
import { getDevUserByNickname } from "@/lib/config/dev-auth-store";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FindIdResponse = {
  found: boolean;
  emailHint: string | null;
  nickname: string | null;
  authProvider: "supabase" | "json";
};

function maskEmail(email: string) {
  const [local, domain] = email.split("@");

  if (!local || !domain) {
    return null;
  }

  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  const hiddenCount = Math.max(1, Math.min(local.length - visible.length, 4));

  return `${visible}${"*".repeat(hiddenCount)}@${domain}`;
}

function notFoundResponse(authProvider: "supabase" | "json", nickname: string): FindIdResponse {
  return {
    found: false,
    emailHint: null,
    nickname,
    authProvider,
  };
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);

    if (!body) {
      return apiError("Request body must be a JSON object.", "VALIDATION_ERROR", 400);
    }

    const nickname = getStringField(body, "nickname");

    if (!nickname || !isValidNickname(nickname)) {
      return apiError("Nickname must be between 2 and 30 characters.", "VALIDATION_ERROR", 400);
    }

    const provider = getAuthProvider();

    if (provider === "unavailable") {
      return apiError(getAuthProviderUnavailableMessage(), "AUTH_PROVIDER_UNAVAILABLE", 503);
    }

    if (provider === "json") {
      const user = await getDevUserByNickname(nickname);

      if (!user || user.profile.is_deleted) {
        return apiSuccess(notFoundResponse("json", nickname));
      }

      return apiSuccess({
        found: true,
        emailHint: maskEmail(user.email),
        nickname: user.profile.nickname,
        authProvider: "json",
      } satisfies FindIdResponse);
    }

    const serviceRoleClient = getSupabaseServiceRoleClient();
    const { data: profile, error: profileError } = await serviceRoleClient
      .from("profiles")
      .select("user_id,nickname,is_deleted")
      .eq("nickname", nickname)
      .maybeSingle<{ user_id: string; nickname: string; is_deleted: boolean }>();

    if (profileError) {
      console.error("[find-id] profile lookup failed", {
        code: profileError.code,
        message: profileError.message,
      });

      await logApiError({
        request,
        code: "SUPABASE_ERROR",
        message: `Find ID profile lookup failed: ${profileError.message}`,
      });

      return apiError("Failed to find account.", "SUPABASE_ERROR", 500);
    }

    if (!profile || profile.is_deleted) {
      return apiSuccess(notFoundResponse("supabase", nickname));
    }

    const { data: authUser, error: authUserError } = await serviceRoleClient.auth.admin.getUserById(profile.user_id);

    if (authUserError) {
      console.error("[find-id] auth user lookup failed", {
        message: authUserError.message,
      });

      await logApiError({
        request,
        userId: profile.user_id,
        code: "SUPABASE_ERROR",
        message: `Find ID auth user lookup failed: ${authUserError.message}`,
      });

      return apiError("Failed to find account.", "SUPABASE_ERROR", 500);
    }

    const emailHint = authUser.user.email ? maskEmail(authUser.user.email) : null;

    if (!emailHint) {
      return apiSuccess(notFoundResponse("supabase", nickname));
    }

    return apiSuccess({
      found: true,
      emailHint,
      nickname: profile.nickname,
      authProvider: "supabase",
    } satisfies FindIdResponse);
  } catch (error) {
    return apiException(error, request);
  }
}
