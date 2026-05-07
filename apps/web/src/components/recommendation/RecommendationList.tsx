// Renders a list of mock recommendation cards.
import { RecommendationCard } from "@/components/recommendation/RecommendationCard";
import { EmptyState } from "@/components/common/EmptyState";
import type { Recommendation } from "@/types/recommendation";

type RecommendationListProps = {
  title: string;
  recommendations: Recommendation[];
};

export function RecommendationList({ title, recommendations }: RecommendationListProps) {
  return (
    <section className="space-y-4">
      <div className="flex min-h-8 items-center">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
      </div>
      <div className="grid gap-4">
        {recommendations.length > 0 ? recommendations.map((recommendation) => (
          <RecommendationCard key={recommendation.id} recommendation={recommendation} />
        )) : <EmptyState title="추천 콘텐츠가 없습니다" description="추천 생성을 실행하면 결과가 여기에 표시됩니다." />}
      </div>
    </section>
  );
}
