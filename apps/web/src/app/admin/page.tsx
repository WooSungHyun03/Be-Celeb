// Renders the admin UI draft for future trend management.
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { PageHeader } from "@/components/common/PageHeader";
import { mockRecommendations } from "@/mocks/mockRecommendations";
import { mockTrends } from "@/mocks/mockTrends";

const metrics = [
  { label: "총 트렌드", value: mockTrends.length },
  { label: "추천 데이터", value: mockRecommendations.length },
  { label: "API 호출", value: "1.2K" },
];

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<Badge tone="warning">Admin draft</Badge>}
        title="관리자"
        description="트렌드 데이터, 추천 상태, 운영 지표를 확인하는 관리자 페이지 초안입니다."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <p className="text-sm font-semibold text-slate-500">{metric.label}</p>
            <p className="mt-4 text-4xl font-bold text-ink">{metric.value}</p>
          </Card>
        ))}
      </div>

      <Card title="트렌드 우선순위">
        <div className="divide-y divide-slate-200">
          {mockTrends.map((trend) => (
            <div className="flex items-center justify-between gap-4 py-4" key={trend.id}>
              <div className="flex-1">
                <p className="font-semibold text-ink">{trend.title}</p>
                <p className="mt-1 text-sm text-slate-500">{trend.category} · +{trend.growthRate}%</p>
              </div>
              <Badge tone="brand">점수 {trend.score}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
