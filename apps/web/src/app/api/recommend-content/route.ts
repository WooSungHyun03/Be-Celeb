import { apiError, apiSuccess } from "@/app/api/_utils/api";
import { getOptionalStringField, getStringField, readJsonObject } from "@/app/api/_utils/request";
import { CREATOR_CATEGORIES, normalizeCreatorCategory } from "@/lib/categories";
import { externalApiException, recommendContent } from "@/lib/server/recommendation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);

    if (!body) {
      return apiError("Request body must be a JSON object.", "VALIDATION_ERROR", 400);
    }

    const channelUrl = getStringField(body, "channelUrl");

    if (!channelUrl) {
      return apiError("channelUrl is required.", "VALIDATION_ERROR", 400);
    }

    const category = getOptionalStringField(body, "category");

    if (category === undefined && "category" in body) {
      return apiError("category must be a string when provided.", "VALIDATION_ERROR", 400);
    }

    if (category && !normalizeCreatorCategory(category)) {
      return apiError(`category must be one of: ${CREATOR_CATEGORIES.join(", ")}.`, "VALIDATION_ERROR", 400);
    }

    const result = await recommendContent(channelUrl, category);
    return apiSuccess(result);
  } catch (error) {
    return externalApiException(error, request);
  }
}
