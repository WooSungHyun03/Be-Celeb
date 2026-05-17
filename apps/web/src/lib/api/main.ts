import { getApiUrl } from "@/lib/client/api";

export type ServiceStats = {
  totalUsers: number;
  totalRecommendations: number;
  activeTrendsCount: number;
};

export type ServiceContent = {
  section: string;
  title: string;
  description: string;
  sortOrder: number;
};

export type TrendSummary = {
  id: string;
  title: string;
  description: string;
  category: string;
  platforms: string[];
  score: number;
  growthRate: number;
  direction: "rising" | "stable" | "watch" | string;
  tags: string[];
  predictedPeak?: string | null;
  createdAt?: string | null;
};

export type SampleRecommendation = {
  id: string;
  title: string;
  summary: string;
  category: string;
  platforms: string[];
  priority: "high" | "medium" | "low" | string;
  expectedScore: number;
  hookText: string;
  contentPlan: string[];
  hashtags: string[];
  reason: string;
  steps: string[];
  relatedTrendIds: string[];
  isSaved: boolean;
};

export type MainPageData = {
  stats: ServiceStats;
  serviceContents: ServiceContent[];
  popularTrends: TrendSummary[];
  sampleRecommendation: SampleRecommendation | null;
};

export async function getMainPageData() {
  const response = await fetch(getApiUrl("/api/v1/main"), {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Failed to load main page data: ${response.status}`);
  }

  return (await response.json()) as MainPageData;
}
