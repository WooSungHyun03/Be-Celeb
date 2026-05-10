// Renders saved recommendations.
import Link from "next/link";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { RecommendationList } from "@/components/recommendation/RecommendationList";
import { ROUTES } from "@/constants/routes";
import { mockRecommendations } from "@/mocks/mockRecommendations";

export default function SavedPage() {
  const savedRecommendations = mockRecommendations.filter((item) => item.isSaved);

  return (
    <div className="space-y-8">
      <PageHeader title="저장한 추천 콘텐츠" description="나중에 다시 실행할 아이디어를 저장하고 빠르게 복사하세요." />
      {savedRecommendations.length > 0 ? (
        <RecommendationList recommendations={savedRecommendations} title="저장한 콘텐츠 전략" />
      ) : (
        <EmptyState
          title="저장된 콘텐츠가 없습니다"
          description="추천 상세 화면에서 저장 버튼을 누르면 여기에 표시됩니다."
          action={<Link href={ROUTES.recommendations}><Button>추천 보러가기</Button></Link>}
        />
      )}
    </div>
  );
}
