// Renders the trend list page.
import { PageHeader } from "@/components/common/PageHeader";
import { TrendFilter } from "@/components/trend/TrendFilter";
import { TrendList } from "@/components/trend/TrendList";
import { mockTrends } from "@/mocks/mockTrends";

export default function TrendsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="트렌드 분석" description="숏폼 플랫폼에서 상승 중인 트렌드를 카테고리와 플랫폼 기준으로 확인하세요." />
      <TrendFilter />
      <TrendList trends={mockTrends} title="현재 주목받는 트렌드" />
    </div>
  );
}
