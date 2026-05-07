// Renders a list of mock trend cards.
import { TrendCard } from "@/components/trend/TrendCard";
import { EmptyState } from "@/components/common/EmptyState";
import type { Trend } from "@/types/trend";

type TrendListProps = {
  title: string;
  trends: Trend[];
};

export function TrendList({ title, trends }: TrendListProps) {
  return (
    <section className="space-y-4">
      <div className="flex min-h-8 items-center">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
      </div>
      <div className="grid gap-4">
        {trends.length > 0 ? trends.map((trend) => (
          <TrendCard key={trend.id} trend={trend} />
        )) : <EmptyState title="표시할 트렌드가 없습니다" description="필터를 조정하거나 잠시 후 다시 확인해주세요." />}
      </div>
    </section>
  );
}
