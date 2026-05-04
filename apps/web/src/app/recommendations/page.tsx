// Renders the mock recommendation list page.
import { RecommendationList } from "@/components/recommendation/RecommendationList";
import { mockRecommendations } from "@/mocks/mockRecommendations";

export default function RecommendationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink">추천 결과</h1>
        <p className="mt-2 text-slate-600">사용자 계정 유형에 맞춘 mock 콘텐츠 아이디어입니다.</p>
      </div>
      <RecommendationList recommendations={mockRecommendations} title="All mock recommendations" />
    </div>
  );
}
