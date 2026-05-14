import { NextResponse } from "next/server";
import { collectDailyInfluencerVideos } from "@/lib/server/daily-collector";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getCronSecret() {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return null;
  }

  return secret;
}

function isAuthorized(request: Request) {
  const secret = getCronSecret();

  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");

  return authorization === `Bearer ${secret}` || cronSecret === secret;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Daily YouTube collection failed.";
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ ok: false, message: "Unauthorized collection request." }, { status: 401 });
    }

    const result = await collectDailyInfluencerVideos();

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: toErrorMessage(error),
      },
      { status: 502 },
    );
  }
}
