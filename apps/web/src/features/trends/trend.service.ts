// Provides mock trend service methods until real trend data pipelines are connected.
import { mockTrends } from "@/mocks/mockTrends";
import type { Trend } from "@/types/trend";

export async function getMockTrends(): Promise<Trend[]> {
  // TODO: Replace with Supabase trend query or FastAPI trend analysis result.
  return mockTrends;
}

export async function getMockTrendById(id: string): Promise<Trend | undefined> {
  // TODO: Replace with DB lookup by trend id.
  return mockTrends.find((trend) => trend.id === id);
}
