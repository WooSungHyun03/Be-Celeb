// Renders the saved recommendations placeholder page.
import { EmptyState } from "@/components/common/EmptyState";
import { RecommendationList } from "@/components/recommendation/RecommendationList";
import { mockRecommendations } from "@/mocks/mockRecommendations";

export default function SavedPage() {
  const savedRecommendations = mockRecommendations.filter((item) => item.isSaved);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-semibold text-ink">저장한 콘텐츠</h1>
        <p className="mt-3 text-base text-slate-600">나중에 다시 살펴볼 좋은 아이디어를 저장하고 즉시 활용해보세요.</p>
      </div>
      {savedRecommendations.length > 0 ? (
        <RecommendationList recommendations={savedRecommendations} title="저장한 콘텐츠 전략" />
      ) : (
        <EmptyState title="저장된 콘텐츠가 없습니다" description="추천받은 콘텐츠에서 저장 버튼을 누르면 여기에 표시됩니다" />
      )}
    </div>
  );
}
