// Renders the landing dashboard-style entry page with mock trend data.
import Link from "next/link";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { TrendList } from "@/components/trend/TrendList";
import { RecommendationList } from "@/components/recommendation/RecommendationList";
import { mockRecommendations } from "@/mocks/mockRecommendations";
import { mockTrends } from "@/mocks/mockTrends";
import { ROUTES } from "@/constants/routes";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <Badge tone="brand">Mock service skeleton</Badge>
          <div className="space-y-3">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-ink sm:text-5xl">
              Be Celeb
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              숏폼 SNS 트렌드 분석과 계정 유형별 콘텐츠 전략 추천을 위한 협업용 프로젝트 기본 구조입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white" href={ROUTES.dashboard}>
              대시보드 보기
            </Link>
            <Link className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-ink" href={ROUTES.onboarding}>
              온보딩 시작
            </Link>
          </div>
        </div>
        <Card title="현재 skeleton 범위">
          <ul className="space-y-3 text-sm text-slate-600">
            <li>Supabase Auth/DB 연결 가능한 client 구조 준비</li>
            <li>OpenAI 추천 API와 Resend 이메일 API route 준비</li>
            <li>health, AI 추천, 이메일 테스트 endpoint 배포 검증 가능</li>
            <li>역할별 개발 디렉터리와 문서 준비</li>
          </ul>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <TrendList trends={mockTrends.slice(0, 3)} title="Mock rising trends" />
        <RecommendationList recommendations={mockRecommendations.slice(0, 3)} title="Mock recommendations" />
      </section>
    </div>
  );
}
