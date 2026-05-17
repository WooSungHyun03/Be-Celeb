import { RecommendationResultClient } from "@/components/dashboard/RecommendationResultClient";

type DashboardRecommendationResultPageProps = {
  params: Promise<{ recommendationId: string }>;
};

export default async function DashboardRecommendationResultPage({ params }: DashboardRecommendationResultPageProps) {
  const { recommendationId } = await params;

  return <RecommendationResultClient recommendationId={recommendationId} />;
}
