// Renders a mock recommendation detail page from route params.
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
      <Link
        href={ROUTES.recommendations}
        className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
      >
        ← 목록으로
      </Link>
      <RecommendationDetail recommendation={recommendation} />
    </div>
  );
}
