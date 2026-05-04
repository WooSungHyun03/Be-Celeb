// Renders the saved recommendations placeholder page.
import { EmptyState } from "@/components/common/EmptyState";
import { RecommendationList } from "@/components/recommendation/RecommendationList";
import { mockRecommendations } from "@/mocks/mockRecommendations";

export default function SavedPage() {
  const savedRecommendations = mockRecommendations.filter((item) => item.isSaved);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink">저장한 콘텐츠</h1>
        <p className="mt-2 text-slate-600">사용자가 저장한 추천 아이디어 mock 영역입니다.</p>
      </div>
      {savedRecommendations.length > 0 ? (
        <RecommendationList recommendations={savedRecommendations} title="Saved mock ideas" />
      ) : (
        <EmptyState title="저장된 콘텐츠가 없습니다" description="TODO: Supabase saved_recommendations 테이블과 연결 예정" />
      )}
    </div>
  );
}
