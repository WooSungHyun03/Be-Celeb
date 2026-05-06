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
    <Card>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link className="text-base font-semibold text-ink hover:text-emerald-700" href={`/recommendations/${recommendation.id}`}>
              {recommendation.title}
            </Link>
            <p className="mt-2 text-sm leading-6 text-slate-600">{recommendation.summary}</p>
          </div>
          <Badge tone={priorityTone[recommendation.priority]}>{recommendation.priority}</Badge>
        </div>
        <p className="text-sm text-slate-500">{recommendation.reason}</p>
      </div>
    </Card>
  );
}
