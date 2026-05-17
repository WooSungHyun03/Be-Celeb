import { RecommendationResultClient } from "@/components/dashboard/RecommendationResultClient";

type RecommendationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecommendationDetailPage({ params }: RecommendationDetailPageProps) {
  const { id } = await params;

  return <RecommendationResultClient recommendationId={id} />;
}
