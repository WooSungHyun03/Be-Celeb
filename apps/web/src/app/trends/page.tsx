// Renders the mock trend list page.
import { TrendFilter } from "@/components/trend/TrendFilter";
import { TrendList } from "@/components/trend/TrendList";
import { mockTrends } from "@/mocks/mockTrends";

export default function TrendsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink">트렌드</h1>
        <p className="mt-2 text-slate-600">카테고리와 플랫폼별 mock trend 흐름입니다.</p>
      </div>
      <TrendFilter />
      <TrendList trends={mockTrends} title="All mock trends" />
    </div>
  );
}
