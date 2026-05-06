// Renders the mock recommendation list page.
import { RecommendationList } from "@/components/recommendation/RecommendationList";
import { mockRecommendations } from "@/mocks/mockRecommendations";

export default function RecommendationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-semibold text-ink">콘텐츠 추천</h1>
        <p className="mt-3 text-base text-slate-600">당신의 계정 유형과 목표에 맞춘 최적화된 콘텐츠 전략을 제안받으세요.</p>
      </div>
      <RecommendationList recommendations={mockRecommendations} title="추천하는 콘텐츠 전략" />
    </div>
  );
}
