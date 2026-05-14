import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import type { SingleRecommendContentResponse } from "@/types/content-recommendation";

type RecommendationResultProps = {
  result: SingleRecommendContentResponse;
};

export function RecommendationResult({ result }: RecommendationResultProps) {
  const { recommendation } = result;

  return (
    <Card title="콘텐츠 추천 결과">
      <div className="flex flex-wrap gap-2">
        <Badge tone="brand">{result.selectedCategory}</Badge>
        <Badge>{recommendation.format}</Badge>
        {recommendation.hashtags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
      <h2 className="mt-5 text-2xl font-bold leading-8 text-ink">{recommendation.title}</h2>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section>
          <p className="text-sm font-bold text-slate-500">추천 이유</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{recommendation.reason}</p>
        </section>
        <section>
          <p className="text-sm font-bold text-slate-500">중복이 아닌 이유</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{recommendation.whyNotDuplicate}</p>
        </section>
        <section>
          <p className="text-sm font-bold text-slate-500">썸네일 아이디어</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{recommendation.thumbnailIdea}</p>
        </section>
        <section>
          <p className="text-sm font-bold text-slate-500">타겟 시청자</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{recommendation.targetAudience}</p>
        </section>
        <section className="lg:col-span-2">
          <p className="text-sm font-bold text-slate-500">Hook</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{recommendation.hook}</p>
        </section>
      </div>

      <div className="mt-6">
        <p className="text-sm font-bold text-ink">콘티</p>
        <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {recommendation.storyboard.map((scene) => (
            <div className="grid gap-2 p-3 text-sm md:grid-cols-[80px_1fr_1fr]" key={`${result.analysisId}-${scene.scene}`}>
              <p className="font-bold text-violet-700">{scene.duration}</p>
              <p className="text-slate-700">{scene.description}</p>
              <p className="text-slate-500">{scene.caption}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-bold text-ink">업로드 팁</p>
        <ul className="mt-3 grid gap-2">
          {recommendation.uploadTips.map((tip) => (
            <li className="rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700" key={tip}>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
