import { apiError, apiSuccess } from "@/app/api/_utils/api";
import { collectDailyInfluencerVideos } from "@/lib/server/daily-collector";
import { externalApiException } from "@/lib/server/recommendation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET ?? process.env.COLLECT_DAILY_VIDEOS_SECRET;

  if (!secret) {
    return false;
  }

  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.headers.get("x-cron-secret") === secret ||
    request.headers.get("x-admin-secret") === secret
  );
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return apiError("Unauthorized collection request.", "UNAUTHORIZED", 401);
    }

    const result = await collectDailyInfluencerVideos();
    return apiSuccess(result);
  } catch (error) {
    return externalApiException(error, request);
  }
}
