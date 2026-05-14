import { apiError, apiException, apiSuccess } from "@/app/api/_utils/api";
import { getKeywordTrends } from "@/lib/server/trends";
import type { TrendKeywordRange } from "@/types/youtube-trends";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RANGES = new Set<TrendKeywordRange>(["daily", "weekly", "monthly"]);

function parseRange(request: Request) {
  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "daily";

  return RANGES.has(range as TrendKeywordRange) ? (range as TrendKeywordRange) : null;
}

export async function GET(request: Request) {
  try {
    const range = parseRange(request);

    if (!range) {
      return apiError("range must be one of: daily, weekly, monthly.", "VALIDATION_ERROR", 400);
    }

    const result = await getKeywordTrends(range);
    return apiSuccess(result);
  } catch (error) {
    return apiException(error, request);
  }
}
