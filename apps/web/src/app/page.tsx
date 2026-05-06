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
    <div className="space-y-12">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-slate-100 p-8 shadow-soft sm:p-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-8">
            <Badge tone="brand">Be Celeb</Badge>
            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                숏폼 크리에이터를 위한 트렌드 전략 파트너
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-600">
                인기 트렌드를 빠르게 읽고, 계정 유형에 맞춘 콘텐츠 추천을 받아보세요. Be Celeb은
                숏폼 SNS에서 성장하고 싶은 팀을 위한 데이터 기반 인사이트를 제공합니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={ROUTES.onboarding}
                className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                분석 시작하기
              </Link>
              <Link
                href={ROUTES.dashboard}
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-slate-50"
              >
                대시보드 보기
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="rounded-3xl border-slate-200 p-4 text-center">
                <p className="text-3xl font-semibold text-ink">3분</p>
                <p className="text-sm text-slate-500">빠른 트렌드 스캔</p>
              </Card>
              <Card className="rounded-3xl border-slate-200 p-4 text-center">
                <p className="text-3xl font-semibold text-ink">5+</p>
                <p className="text-sm text-slate-500">유형별 콘텐츠 전략</p>
              </Card>
              <Card className="rounded-3xl border-slate-200 p-4 text-center">
                <p className="text-3xl font-semibold text-ink">team</p>
                <p className="text-sm text-slate-500">협업 중심 개발 구조</p>
              </Card>
            </div>
          </div>

          <Card className="rounded-[1.75rem] border-slate-200 bg-white/95 p-6 shadow-soft">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">오늘의 인사이트</p>
                <h2 className="mt-3 text-2xl font-semibold text-ink">현재 숏폼 트렌드와 추천 콘텐츠</h2>
              </div>
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-ink">#트렌드 포착</p>
                  <p className="mt-2 text-sm text-slate-600">짧은 영상 챌린지, 분석형 스토리, 협업 콘텐츠가 상승세입니다.</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-ink">#추천 전략</p>
                  <p className="mt-2 text-sm text-slate-600">브랜드 스토리 + 리액션 콘텐츠를 결합해 참여도를 높이세요.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="rounded-3xl border-slate-200 p-4">
                  <p className="text-sm text-slate-500">응답률</p>
                  <p className="mt-2 text-xl font-semibold text-ink">+24%</p>
                </Card>
                <Card className="rounded-3xl border-slate-200 p-4">
                  <p className="text-sm text-slate-500">활성 트렌드</p>
                  <p className="mt-2 text-xl font-semibold text-ink">12개</p>
                </Card>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <TrendList trends={mockTrends.slice(0, 3)} title="이번 주 인기 트렌드" />
        <RecommendationList recommendations={mockRecommendations.slice(0, 3)} title="추천 콘텐츠 전략" />
      </section>
    </div>
  );
}
