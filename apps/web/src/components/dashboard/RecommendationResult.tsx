import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { StoryboardRenderer } from "@/components/dashboard/StoryboardRenderer";
import type { SingleRecommendContentResponse } from "@/types/content-recommendation";
import type { ReactNode } from "react";

type RecommendationResultProps = {
  result: SingleRecommendContentResponse;
  action?: ReactNode;
};

export function RecommendationResult({ result, action }: RecommendationResultProps) {
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
    <Card action={action} title="콘텐츠 추천 결과">
      <div className="rounded-2xl border border-violet-100 bg-[linear-gradient(135deg,#ffffff_0%,#faf5ff_100%)] p-5 shadow-sm shadow-violet-100/70">
        <p className="text-xs font-black uppercase text-violet-700">추천 제목</p>
        <h2 className="mt-2 text-2xl font-black leading-8 text-ink">{recommendation.title}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="brand">{result.selectedCategory}</Badge>
          <Badge>{recommendation.format}</Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        {showHook && recommendation.hook ? (
          <section className="rounded-md bg-violet-50 px-4 py-3">
            <p className="text-xs font-bold uppercase text-violet-600">3초 Hook</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-violet-900">{recommendation.hook}</p>
          </section>
        ) : null}

        {showReason ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-sm font-black text-violet-700">?</span>
              <p className="text-sm font-black text-ink">추천 이유</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-700">{recommendation.reason || "추천 이유 정보가 없습니다."}</p>
            {recommendation.whyNotDuplicate ? (
              <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">{recommendation.whyNotDuplicate}</p>
            ) : null}
          </section>
        ) : null}

        {showThumbnailIdea ? (
          <section>
            <p className="text-sm font-bold text-slate-500">썸네일 아이디어</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{recommendation.thumbnailIdea || "썸네일 아이디어 정보가 없습니다."}</p>
          </section>
        ) : null}

        {recommendation.toneAnalysis || recommendation.captionStyle || recommendation.flowSummary ? (
          <section className="grid gap-3 md:grid-cols-3">
            {recommendation.toneAnalysis ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-bold text-slate-500">말투/톤 분석</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{recommendation.toneAnalysis}</p>
              </div>
            ) : null}
            {recommendation.captionStyle ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-bold text-slate-500">자막 스타일</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{recommendation.captionStyle}</p>
              </div>
            ) : null}
            {recommendation.flowSummary ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-bold text-slate-500">영상 흐름 요약</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{recommendation.flowSummary}</p>
              </div>
            ) : null}
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
