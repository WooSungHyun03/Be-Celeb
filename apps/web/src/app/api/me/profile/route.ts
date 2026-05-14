import { apiError, apiException, apiSuccess } from "@/app/api/_utils/api";
import {
  isDuplicateError,
  isValidNickname,
  PROFILE_SELECT,
  requireActiveUser,
  toPublicProfile,
  type ProfileRow,
} from "@/app/api/_utils/account";
import { getOptionalStringField, readJsonObject, type JsonObject } from "@/app/api/_utils/request";
import { createSupabaseServerClient, getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_PROFILE_FIELDS = new Set(["nickname", "youtube_channel_url", "avatar_url"]);

function hasOnlyAllowedFields(body: JsonObject) {
  return Object.keys(body).every((field) => ALLOWED_PROFILE_FIELDS.has(field));
}

export async function PATCH(request: Request) {
  try {
    const body = await readJsonObject(request);

    if (!body) {
      return apiError("Request body must be a JSON object.", "VALIDATION_ERROR", 400);
    }

    if (!hasOnlyAllowedFields(body)) {
      return apiError("Request contains unsupported profile fields.", "VALIDATION_ERROR", 400);
    }

    const nickname = getOptionalStringField(body, "nickname");
    const youtubeChannelUrl = getOptionalStringField(body, "youtube_channel_url");
    const avatarUrl = getOptionalStringField(body, "avatar_url");
    const updatePayload: Partial<Pick<ProfileRow, "nickname" | "youtube_channel_url" | "avatar_url">> = {};

    if (nickname !== undefined) {
      if (!nickname || !isValidNickname(nickname)) {
        return apiError("Nickname must be between 2 and 30 characters.", "VALIDATION_ERROR", 400);
      }

      updatePayload.nickname = nickname;
    }

    if (youtubeChannelUrl !== undefined) {
      updatePayload.youtube_channel_url = youtubeChannelUrl;
    }

    if (avatarUrl !== undefined) {
      updatePayload.avatar_url = avatarUrl;
    }

    if (Object.keys(updatePayload).length === 0) {
      return apiError("At least one profile field is required.", "VALIDATION_ERROR", 400);
    }

    const supabase = await createSupabaseServerClient();
    const auth = await requireActiveUser(supabase);

    if (auth.response || !auth.user) {
      return auth.response;
    }

    if (updatePayload.nickname && updatePayload.nickname !== auth.profile?.nickname) {
      const { data: existingNickname, error: nicknameLookupError } = await getSupabaseServiceRoleClient()
        .from("profiles")
        .select("user_id")
        .eq("nickname", updatePayload.nickname)
        .neq("user_id", auth.user.id)
        .maybeSingle();

      if (nicknameLookupError) {
        return apiError("Failed to check nickname availability.", "SUPABASE_ERROR", 500);
      }

      if (existingNickname) {
        return apiError("Nickname is already in use.", "DUPLICATE_NICKNAME", 409);
      }
    }

    const { data: profile, error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", auth.user.id)
      .select(PROFILE_SELECT)
      .single<ProfileRow>();

    if (updateError) {
      if (isDuplicateError(updateError)) {
        return apiError("Nickname is already in use.", "DUPLICATE_NICKNAME", 409);
      }

      return apiError("Failed to update profile.", "SUPABASE_ERROR", 500);
    }

    return apiSuccess({ profile: toPublicProfile(profile) });
  } catch (error) {
    return apiException(error, request);
  }
}

