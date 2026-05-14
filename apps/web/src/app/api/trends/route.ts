import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types/api";
import type { Trend } from "@/types/trend";

export function GET() {
  const payload: ApiResponse<Trend[]> = {
    success: true,
    data: [],
    message: "Legacy trend list data has been removed. Use /api/trends/popular-videos and /api/trends/keywords for live YouTube trend data.",
  };

  return NextResponse.json(payload);
}
