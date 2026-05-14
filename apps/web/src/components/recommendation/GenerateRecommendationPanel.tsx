import Link from "next/link";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { ROUTES } from "@/constants/routes";

export function GenerateRecommendationPanel() {
  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-violet-700">AI 추천 생성</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">YouTube 채널 링크로 다음 콘텐츠 만들기</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            실제 추천 생성은 채널 분석, 카테고리 추론, 인플루언서 영상 조회, LLM 추천 생성을 한 번에 처리하는 대시보드에서 실행합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={ROUTES.dashboard}>
            <Button>대시보드에서 생성</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
