// Provides mock recommendation service methods until rule/AI engines are connected.
import { mockRecommendations } from "@/mocks/mockRecommendations";
import type { Recommendation } from "@/types/recommendation";
import type { TrendCategory } from "@/types/trend";

export async function getMockRecommendations(category?: TrendCategory): Promise<Recommendation[]> {
  // TODO: Replace with rule engine and AI recommendation service results.
  if (!category) {
    return mockRecommendations;
  }

  return mockRecommendations.filter((recommendation) => recommendation.category === category);
}
