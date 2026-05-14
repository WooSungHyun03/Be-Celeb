// Renders the recommendation list page.
import Link from "next/link";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { GenerateRecommendationPanel } from "@/components/recommendation/GenerateRecommendationPanel";
import { ROUTES } from "@/constants/routes";

export default function RecommendationsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="콘텐츠 추천"
        description="YouTube 채널 링크를 분석해 다음 업로드 아이디어, 훅, 구성안, 해시태그를 생성합니다."
      />
      <GenerateRecommendationPanel />
      <EmptyState
        title="저장된 추천 목록이 아직 없습니다"
        description="추천 결과는 대시보드에서 생성한 뒤 Supabase 저장이 완료되면 표시할 수 있습니다."
        action={
          <Link href={ROUTES.dashboard}>
            <Button>추천 생성하기</Button>
          </Link>
        }
      />
    </div>
  );
}



