// Renders the trend list page.
import { TrendFilter } from "@/components/trend/TrendFilter";
import { TrendList } from "@/components/trend/TrendList";
import { mockTrends } from "@/mocks/mockTrends";

export default function TrendsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-ink">트렌드 분석</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">숏폼 플랫폼에서 상승 중인 트렌드를 카테고리와 플랫폼 기준으로 확인하세요.</p>
      </div>
      <TrendFilter />
      <TrendList trends={mockTrends} title="현재 주목받는 트렌드" />
    </div>
  );
}
