// Renders recommendation details with hook, outline, score, and action UI.
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { RecommendationActions } from "@/components/recommendation/RecommendationActions";
import type { Recommendation } from "@/types/recommendation";

type RecommendationDetailProps = {
  recommendation: Recommendation;
};

export function RecommendationDetail({ recommendation }: RecommendationDetailProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="shadow-none">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-ink">{recommendation.title}</h1>
              <p className="mt-3 leading-7 text-slate-600">{recommendation.summary}</p>
            </div>
            <div className="rounded-lg bg-violet-50 px-4 py-3 text-center">
              <p className="text-xs font-semibold text-violet-700">추천 점수</p>
              <p className="text-3xl font-bold text-violet-800">{recommendation.score}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge tone="brand">{recommendation.category}</Badge>
            <Badge tone="signal">{recommendation.priority}</Badge>
            {recommendation.platforms.map((platform) => (
              <Badge key={platform}>{platform}</Badge>
            ))}
          </div>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-500">첫 3초 훅</p>
            <p className="mt-2 text-xl font-semibold text-ink">{recommendation.hook}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">콘텐츠 구성안</h2>
            <ol className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {recommendation.outline.map((item, index) => (
                <li key={item} className="flex gap-3 p-3 text-sm text-slate-700">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-ink">{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">실행 체크리스트</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-3">
              {recommendation.steps.map((step) => (
                <li key={step} className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">{step}</li>
              ))}
            </ul>
          </section>
        </div>
      </Card>

      <aside className="space-y-4">
        <Card title="해시태그">
          <div className="flex flex-wrap gap-2">
            {recommendation.hashtags.map((tag) => (
              <Badge key={tag} tone="info">{tag}</Badge>
            ))}
          </div>
        </Card>
        <RecommendationActions recommendation={recommendation} />
      </aside>
    </div>
  );
}
