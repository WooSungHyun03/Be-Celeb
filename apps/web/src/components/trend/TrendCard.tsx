// Renders a single mock trend summary card.
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import type { Trend } from "@/types/trend";
import { getScoreLabel, getScoreTone } from "@/utils/score-utils";

type TrendCardProps = {
  trend: Trend;
};

export function TrendCard({ trend }: TrendCardProps) {
  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link className="text-base font-semibold text-ink hover:text-emerald-700" href={`/trends/${trend.id}`}>
              {trend.title}
            </Link>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{trend.description}</p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-semibold ${getScoreTone(trend.score)}`}>{trend.score}</p>
            <p className="text-xs text-slate-500">{getScoreLabel(trend.score)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{trend.category}</Badge>
          {trend.platforms.map((platform) => (
            <Badge key={platform}>{platform}</Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
