// Returns a Vercel health response for the Next.js API layer.
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "be-celeb-web",
  });
}
