// Renders saved recommendations.
import Link from "next/link";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ROUTES } from "@/constants/routes";

export default function SavedPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="저장한 추천 콘텐츠" description="나중에 다시 실행할 아이디어를 저장하고 빠르게 복사하세요." />
      <EmptyState
        title="저장된 콘텐츠가 없습니다"
        description="현재 저장 목록은 운영 DB 연동 후 표시됩니다. 먼저 대시보드에서 YouTube 채널 기반 추천을 생성하세요."
        action={
          <Link href={ROUTES.dashboard}>
            <Button>추천 생성하기</Button>
          </Link>
        }
      />
    </div>
  );
}
