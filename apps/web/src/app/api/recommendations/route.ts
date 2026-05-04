// Returns mock recommendation data for frontend integration work.
import { NextResponse } from "next/server";
import { mockRecommendations } from "@/mocks/mockRecommendations";
import type { ApiResponse } from "@/types/api";
import type { Recommendation } from "@/types/recommendation";

export function GET() {
  // TODO: Replace with rule engine, Supabase, or FastAPI recommendation results.
  const payload: ApiResponse<Recommendation[]> = {
    success: true,
    data: mockRecommendations,
  };

  return NextResponse.json(payload);
}
