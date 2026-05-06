// Renders the mock trend list page.
import { TrendFilter } from "@/components/trend/TrendFilter";
import { TrendList } from "@/components/trend/TrendList";
import { mockTrends } from "@/mocks/mockTrends";

export default function TrendsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-semibold text-ink">트렌드 분석</h1>
        <p className="mt-3 text-base text-slate-600">숏폼 플랫폼에서 현재 인기 있는 트렌드를 카테고리별로 확인하세요.</p>
      </div>
      <TrendFilter />
      <TrendList trends={mockTrends} title="현재 주목하는 트렌드" />
    </div>
  );
}
