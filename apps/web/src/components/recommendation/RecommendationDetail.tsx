// Renders mock recommendation details and TODO implementation notes.
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import type { Recommendation } from "@/types/recommendation";

type RecommendationDetailProps = {
  recommendation: Recommendation;
};

export function RecommendationDetail({ recommendation }: RecommendationDetailProps) {
  return (
    <Card title={recommendation.title}>
      <div className="space-y-5">
        <p className="leading-7 text-slate-600">{recommendation.summary}</p>
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{recommendation.category}</Badge>
          <Badge tone="signal">{recommendation.priority}</Badge>
          {recommendation.platforms.map((platform) => (
            <Badge key={platform}>{platform}</Badge>
          ))}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">Mock execution steps</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-600">
            {recommendation.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <p className="text-sm text-slate-500">TODO: AI 결과, 룰베이스 근거, 저장 기능, 성과 추적 지표 연결 예정</p>
      </div>
    </Card>
  );
}
