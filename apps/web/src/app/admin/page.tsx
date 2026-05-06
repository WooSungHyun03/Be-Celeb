// Renders the admin placeholder page for future trend management.
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { mockTrends } from "@/mocks/mockTrends";

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-semibold text-ink">관리자</h1>
        <p className="mt-3 text-base text-slate-600">트렌드 데이터 및 시스템 설정을 관리하는 공간입니다.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="rounded-3xl border-slate-200">
          <p className="text-sm uppercase tracking-[0.12em] text-slate-400">총 트렌드</p>
          <p className="mt-4 text-4xl font-bold text-ink">{mockTrends.length}</p>
        </Card>
        <Card className="rounded-3xl border-slate-200">
          <p className="text-sm uppercase tracking-[0.12em] text-slate-400">활성 사용자</p>
          <p className="mt-4 text-4xl font-bold text-ink">142</p>
        </Card>
        <Card className="rounded-3xl border-slate-200">
          <p className="text-sm uppercase tracking-[0.12em] text-slate-400">API 호출</p>
          <p className="mt-4 text-4xl font-bold text-ink">1.2K</p>
        </Card>
      </div>

      <Card className="rounded-3xl border-slate-200">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">트렌드 우선순위 큐</h2>
          <div className="divide-y divide-slate-200">
            {mockTrends.map((trend) => (
              <div className="flex items-center justify-between gap-4 py-4" key={trend.id}>
                <div className="flex-1">
                  <p className="font-semibold text-ink">{trend.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{trend.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="brand">스코어: {trend.score}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
