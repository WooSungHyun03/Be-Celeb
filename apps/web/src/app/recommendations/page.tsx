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
        description="대시보드에서 추천 결과를 생성하고 저장하면 이곳에서 다시 확인할 수 있습니다."
        action={
          <Link href={ROUTES.dashboard}>
            <Button>추천 생성하기</Button>
          </Link>
        }
      />
    </div>
  );
}
