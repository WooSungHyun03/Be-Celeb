// Renders a single mock trend summary card.
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import type { Trend } from "@/types/trend";
import { getScoreLabel, getScoreTone } from "@/utils/score-utils";
import { formatDate } from "@/utils/format-date";

type TrendCardProps = {
  trend: Trend;
};

export function TrendCard({ trend }: TrendCardProps) {
  return (
    <Card className="min-h-[184px] shadow-none transition hover:border-violet-200 hover:shadow-sm">
      <div className="flex h-full flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link className="text-base font-semibold text-ink hover:text-violet-700" href={`/trends/${trend.id}`}>
              {trend.title}
            </Link>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{trend.description}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className={`text-lg font-semibold ${getScoreTone(trend.score)}`}>{trend.score}</p>
            <p className="text-xs text-slate-500">{getScoreLabel(trend.score)}</p>
          </div>
        </div>
        <div>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={trend.direction === "rising" ? "signal" : trend.direction === "stable" ? "info" : "warning"}>
              {trend.direction}
            </Badge>
            {trend.platforms.map((platform) => (
              <Badge key={platform}>{platform}</Badge>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm text-slate-500">
            <span>상승률 +{trend.growthRate}%</span>
            <span>예상 피크 {formatDate(trend.predictedPeak)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
