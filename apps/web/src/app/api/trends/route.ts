// Returns mock trend data for frontend integration work.
import { NextResponse } from "next/server";
import { mockTrends } from "@/mocks/mockTrends";
import type { ApiResponse } from "@/types/api";
import type { Trend } from "@/types/trend";

export function GET() {
  // TODO: Replace with Supabase query or FastAPI aggregation response.
  const payload: ApiResponse<Trend[]> = {
    success: true,
    data: mockTrends,
  };

  return NextResponse.json(payload);
}
