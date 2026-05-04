// Renders the admin placeholder page for future trend management.
import { Card } from "@/components/common/Card";
import { mockTrends } from "@/mocks/mockTrends";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink">관리자</h1>
        <p className="mt-2 text-slate-600">트렌드 데이터와 룰베이스 관리 예정 영역입니다.</p>
      </div>
      <Card title="Mock trend management queue">
        <div className="divide-y divide-slate-200">
          {mockTrends.map((trend) => (
            <div className="flex items-center justify-between gap-4 py-3" key={trend.id}>
              <div>
                <p className="font-medium text-ink">{trend.title}</p>
                <p className="text-sm text-slate-500">{trend.category}</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                score {trend.score}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
