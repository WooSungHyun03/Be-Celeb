// Renders a list of mock recommendation cards.
import { RecommendationCard } from "@/components/recommendation/RecommendationCard";
import type { Recommendation } from "@/types/recommendation";

type RecommendationListProps = {
  title: string;
  recommendations: Recommendation[];
};

export function RecommendationList({ title, recommendations }: RecommendationListProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="grid gap-4">
        {recommendations.map((recommendation) => (
          <RecommendationCard key={recommendation.id} recommendation={recommendation} />
        ))}
      </div>
    </section>
  );
}
