import { apiError, apiSuccess } from "@/app/api/_utils/api";
import { getStringField, readJsonObject } from "@/app/api/_utils/request";
import { analyzeChannelForRecommendation, externalApiException } from "@/lib/server/recommendation";

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

    const analysis = await analyzeChannelForRecommendation(channelUrl);
    return apiSuccess(analysis);
  } catch (error) {
    return externalApiException(error, request);
  }
}
