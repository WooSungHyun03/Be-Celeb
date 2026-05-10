// Renders a single mock recommendation summary card.
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import type { Recommendation } from "@/types/recommendation";

type RecommendationCardProps = {
  recommendation: Recommendation;
};

const priorityTone: Record<Recommendation["priority"], "default" | "brand" | "signal"> = {
  high: "signal",
  medium: "brand",
  low: "default",
};

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <Card className="min-h-[184px] shadow-none transition hover:border-violet-200 hover:shadow-sm">
      <div className="flex h-full flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link className="text-base font-semibold text-ink hover:text-violet-700" href={`/recommendations/${recommendation.id}`}>
              {recommendation.title}
            </Link>
            <p className="mt-2 text-sm leading-6 text-slate-600">{recommendation.summary}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-semibold text-violet-700">{recommendation.score}</p>
            <Badge tone={priorityTone[recommendation.priority]}>{recommendation.priority}</Badge>
          </div>
        </div>
        <div>
          <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">첫 3초 훅</p>
            <p className="mt-1 line-clamp-2 text-sm font-medium text-ink">{recommendation.hook}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recommendation.hashtags.slice(0, 2).map((tag) => (
              <Badge key={tag} tone="info">{tag}</Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
