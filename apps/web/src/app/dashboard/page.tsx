// Renders the dashboard overview for trends and recommendations.
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { PageHeader } from "@/components/common/PageHeader";
import { GenerateRecommendationPanel } from "@/components/recommendation/GenerateRecommendationPanel";
import { RecommendationList } from "@/components/recommendation/RecommendationList";
import { TrendList } from "@/components/trend/TrendList";
import { ROUTES } from "@/constants/routes";
import { mockRecommendations } from "@/mocks/mockRecommendations";
import { mockTrends } from "@/mocks/mockTrends";
import { formatDate } from "@/utils/format-date";

const metrics = [
  { label: "분석 중인 트렌드", value: mockTrends.length, detail: "+18% 최고 상승률" },
  { label: "추천 아이디어", value: mockRecommendations.length, detail: "평균 84점" },
  { label: "저장한 콘텐츠", value: mockRecommendations.filter((item) => item.isSaved).length, detail: "즉시 실행 가능" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<Badge tone="brand">오늘 업데이트 {formatDate(new Date().toISOString())}</Badge>}
        title="대시보드"
        description="트렌드와 추천 상태를 한 화면에서 확인하세요."
        action={
          <Link href={ROUTES.recommendations} className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
            추천 전체 보기
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="shadow-none">
            <p className="text-sm font-semibold text-slate-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">{metric.value}</p>
            <p className="mt-2 text-sm text-violet-700">{metric.detail}</p>
          </Card>
        ))}
      </div>

      <GenerateRecommendationPanel />

      <section className="grid gap-6 lg:grid-cols-2">
        <TrendList trends={mockTrends.slice(0, 3)} title="이번 주 주목 트렌드" />
        <RecommendationList recommendations={mockRecommendations.slice(0, 3)} title="추천 콘텐츠 요약" />
      </section>
    </div>
  );
}
