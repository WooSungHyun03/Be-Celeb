import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types/api";
import type { Recommendation } from "@/types/recommendation";

export function GET() {
  const payload: ApiResponse<Recommendation[]> = {
    success: true,
    data: [],
    message: "Legacy recommendation list data has been removed. Use POST /api/recommend-content for live YouTube recommendations.",
  };

  return NextResponse.json(payload);
}
