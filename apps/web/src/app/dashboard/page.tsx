// Renders the mock dashboard overview for trend and recommendation status.
import Link from "next/link";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { TrendList } from "@/components/trend/TrendList";
import { RecommendationList } from "@/components/recommendation/RecommendationList";
import { mockRecommendations } from "@/mocks/mockRecommendations";
import { mockTrends } from "@/mocks/mockTrends";
import { formatDate } from "@/utils/format-date";
import { ROUTES } from "@/constants/routes";

const metrics = [
  { label: "분석 중인 트렌드", value: mockTrends.length },
  { label: "추천 아이디어", value: mockRecommendations.length },
  { label: "저장한 콘텐츠", value: 2 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-ink">대시보드</h1>
          <p className="mt-3 text-base text-slate-600">계정의 최근 트렌드와 추천 콘텐츠 전략을 한눈에 확인하세요.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="rounded-3xl border-slate-200">
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-slate-400">{metric.label}</p>
            <p className="mt-4 text-4xl font-bold text-ink">{metric.value}</p>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-slate-400">최근 동기화</p>
            <p className="mt-2 text-lg font-semibold text-ink">{formatDate(new Date().toISOString())}</p>
          </div>
          <p className="text-sm text-slate-600">
            트렌드와 추천 데이터가 자동으로 동기화되고 있습니다. 실제 운영 중인 크리에이터님의 성과를 좀 더 자세히 볼까요?
          </p>
          <div className="flex gap-2 pt-2">
            <Link
              href={ROUTES.trends}
              className="inline-block rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-slate-50"
            >
              트렌드 보기
            </Link>
            <Link
              href={ROUTES.recommendations}
              className="inline-block rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-slate-50"
            >
              추천 보기
            </Link>
          </div>
        </div>
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <TrendList trends={mockTrends.slice(0, 3)} title="이주 주목 트렌드" />
        <RecommendationList recommendations={mockRecommendations.slice(0, 3)} title="추천 콘텐츠 전략" />
      </section>
    </div>
  );
}
