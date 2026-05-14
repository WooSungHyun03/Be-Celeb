import { apiException, apiSuccess } from "@/app/api/_utils/api";
import { getPopularVideosByCategory } from "@/lib/server/trends";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const videos = await getPopularVideosByCategory();
    return apiSuccess({ videos });
  } catch (error) {
    return apiException(error, request);
  }
}
