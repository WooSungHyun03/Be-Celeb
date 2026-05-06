// Renders a list of mock trend cards.
import { TrendCard } from "@/components/trend/TrendCard";
import type { Trend } from "@/types/trend";

type TrendListProps = {
  title: string;
  trends: Trend[];
};

export function TrendList({ title, trends }: TrendListProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="grid gap-4">
        {trends.map((trend) => (
          <TrendCard key={trend.id} trend={trend} />
        ))}
      </div>
    </section>
  );
}
