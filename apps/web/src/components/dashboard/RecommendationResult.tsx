import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { StoryboardRenderer } from "@/components/dashboard/StoryboardRenderer";
import type { SingleRecommendContentResponse } from "@/types/content-recommendation";

type RecommendationResultProps = {
  result: SingleRecommendContentResponse;
};

export function RecommendationResult({ result }: RecommendationResultProps) {
  const { recommendation } = result;
  const options = result.options;
  const hashtags = recommendation.hashtags ?? [];
  const storyboard = recommendation.storyboard ?? [];
  const uploadTips = recommendation.uploadTips ?? [];
  const showReason = options?.reason ?? Boolean(recommendation.reason || recommendation.whyNotDuplicate);
  const showHashtags = options?.hashtags ?? hashtags.length > 0;
  const showStoryboard = options?.storyboard ?? storyboard.length > 0;
  const showHook = options?.hook ?? Boolean(recommendation.hook);
  const showThumbnailIdea = (options?.thumbnailIdea ?? options?.thumbnail_idea) ?? Boolean(recommendation.thumbnailIdea);
  const showUploadTips = (options?.uploadTips ?? options?.upload_tips) ?? uploadTips.length > 0;

  return (
    <Card title="콘텐츠 추천 결과">
      <div className="flex flex-wrap gap-2">
        <Badge tone="brand">{result.selectedCategory}</Badge>
        <Badge>{recommendation.format}</Badge>
      </div>
      <h2 className="mt-5 text-2xl font-bold leading-8 text-ink">{recommendation.title}</h2>

      <div className="mt-6 grid gap-5">
        {showHook && recommendation.hook ? (
          <section className="rounded-md bg-violet-50 px-4 py-3">
            <p className="text-xs font-bold uppercase text-violet-600">3초 Hook</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-violet-900">{recommendation.hook}</p>
          </section>
        ) : null}

        {showReason ? (
          <section>
            <p className="text-sm font-bold text-slate-500">추천 이유</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{recommendation.reason || "추천 이유 정보가 없습니다."}</p>
            {recommendation.whyNotDuplicate ? (
              <p className="mt-2 text-sm leading-6 text-slate-500">{recommendation.whyNotDuplicate}</p>
            ) : null}
          </section>
        ) : null}

        {showThumbnailIdea ? (
          <section>
            <p className="text-sm font-bold text-slate-500">썸네일 아이디어</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{recommendation.thumbnailIdea || "썸네일 아이디어 정보가 없습니다."}</p>
          </section>
        ) : null}

        {showHashtags ? (
          <section>
            <p className="text-sm font-bold text-slate-500">해시태그</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {hashtags.length > 0 ? hashtags.map((tag) => <Badge key={tag}>{tag}</Badge>) : <span className="text-sm text-slate-500">해시태그 정보가 없습니다.</span>}
            </div>
          </section>
        ) : null}

        {showUploadTips ? (
          <section>
            <p className="text-sm font-bold text-slate-500">업로드 팁</p>
            {uploadTips.length > 0 ? (
              <ul className="mt-2 grid gap-2 text-sm leading-6 text-slate-700">
                {uploadTips.map((tip) => (
                  <li className="rounded-md bg-slate-50 px-3 py-2" key={tip}>
                    {tip}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">업로드 팁 정보가 없습니다.</p>
            )}
          </section>
        ) : null}
      </div>

      {showStoryboard ? (
        <div className="mt-6">
          <p className="text-sm font-bold text-ink">콘티</p>
          <div className="mt-3">
            <StoryboardRenderer scenes={storyboard} />
          </div>
        </div>
      ) : null}
    </Card>
  );
}
