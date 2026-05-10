// Renders a recommendation detail page from route params.
import Link from "next/link";
import { RecommendationDetail } from "@/components/recommendation/RecommendationDetail";
import { ROUTES } from "@/constants/routes";
import { mockRecommendations } from "@/mocks/mockRecommendations";

type RecommendationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecommendationDetailPage({ params }: RecommendationDetailPageProps) {
  const { id } = await params;
  const recommendation = mockRecommendations.find((item) => item.id === id) ?? mockRecommendations[0];

  return (
    <div className="space-y-8">
      <Link href={ROUTES.recommendations} className="inline-flex text-sm font-semibold text-violet-700 hover:text-violet-800">
        추천 목록으로
      </Link>
      <RecommendationDetail recommendation={recommendation} />
    </div>
  );
}
