import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { StoryboardRenderer } from "@/components/dashboard/StoryboardRenderer";
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
      </div>
      <h2 className="mt-5 text-2xl font-bold leading-8 text-ink">{recommendation.title}</h2>

      <div className="mt-6 grid gap-5">
        <section>
          <p className="text-sm font-bold text-slate-500">추천 이유</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{recommendation.reason}</p>
          {recommendation.whyNotDuplicate ? (
            <p className="mt-2 text-sm leading-6 text-slate-500">{recommendation.whyNotDuplicate}</p>
          ) : null}
        </section>

        <section>
          <p className="text-sm font-bold text-slate-500">해시태그</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {recommendation.hashtags.length > 0 ? (
              recommendation.hashtags.map((tag) => <Badge key={tag}>{tag}</Badge>)
            ) : (
              <span className="text-sm text-slate-500">해시태그 정보가 없습니다.</span>
            )}
          </div>
        </section>
      </div>

      <div className="mt-6">
        <p className="text-sm font-bold text-ink">콘티</p>
        <div className="mt-3">
          <StoryboardRenderer scenes={recommendation.storyboard} />
        </div>
      </div>
    </Card>
  );
}
