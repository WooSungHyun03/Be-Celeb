// Renders the mock dashboard overview for trend and recommendation status.
import { Card } from "@/components/common/Card";
import { TrendList } from "@/components/trend/TrendList";
import { RecommendationList } from "@/components/recommendation/RecommendationList";
import { mockRecommendations } from "@/mocks/mockRecommendations";
import { mockTrends } from "@/mocks/mockTrends";
import { formatDate } from "@/utils/format-date";

const metrics = [
  { label: "분석 중인 트렌드", value: mockTrends.length },
  { label: "추천 아이디어", value: mockRecommendations.length },
  { label: "저장한 콘텐츠", value: 2 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink">대시보드</h1>
        <p className="mt-2 text-slate-600">최근 mock 데이터 기준으로 계정 전략 흐름을 확인합니다.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{metric.value}</p>
          </Card>
        ))}
      </div>
      <Card title="오늘의 운영 메모">
        <p className="text-sm text-slate-600">
          마지막 mock 갱신일: {formatDate(new Date().toISOString())}. TODO: 실제 DB sync 상태와 분석 job 상태를 연결합니다.
        </p>
      </Card>
      <section className="grid gap-6 lg:grid-cols-2">
        <TrendList trends={mockTrends.slice(0, 3)} title="Top mock trends" />
        <RecommendationList recommendations={mockRecommendations.slice(0, 3)} title="Priority ideas" />
      </section>
    </div>
  );
}
