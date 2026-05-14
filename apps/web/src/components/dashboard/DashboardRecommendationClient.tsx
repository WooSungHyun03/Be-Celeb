"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { PageHeader } from "@/components/common/PageHeader";
import { CREATOR_CATEGORIES } from "@/lib/categories";
import type { ContentRecommendation, RecommendationApiResult, YouTubeVideoAnalysis } from "@/types/content-recommendation";

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  message?: string;
  code?: string;
};

const loadingStages = ["채널 분석 중", "카테고리 선정 중", "인플루언서 데이터 분석 중", "AI 추천 생성 중"];

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getVideoUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function RecentVideoList({ videos }: { videos: YouTubeVideoAnalysis[] }) {
  if (videos.length === 0) {
    return <p className="text-sm text-slate-500">최근 업로드 영상을 찾지 못했습니다.</p>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {videos.slice(0, 5).map((video) => (
        <a
          className="block py-3 transition hover:bg-slate-50"
          href={getVideoUrl(video.youtubeVideoId)}
          key={video.youtubeVideoId}
          rel="noreferrer"
          target="_blank"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-semibold text-ink">{video.title}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDate(video.publishedAt)}</p>
            </div>
            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              {formatNumber(video.viewCount)}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

function ChannelAnalysisCard({ result }: { result: RecommendationApiResult }) {
  return (
    <Card title="분석된 채널 정보">
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        {result.channel.thumbnailUrl ? (
          <img
            alt={`${result.channel.channelTitle} thumbnail`}
            className="size-20 rounded-lg border border-slate-200 object-cover"
            src={result.channel.thumbnailUrl}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-ink">{result.channel.channelTitle}</h2>
            <Badge tone="brand">{result.selectedCategory}</Badge>
            {result.selectedCategory !== result.inferredCategory ? <Badge tone="info">추론 {result.inferredCategory}</Badge> : null}
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{result.channel.description || "채널 설명 없음"}</p>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="font-semibold text-slate-500">구독자</p>
              <p className="mt-1 font-bold text-ink">{formatNumber(result.channel.subscriberCount)}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-500">영상 수</p>
              <p className="mt-1 font-bold text-ink">{formatNumber(result.channel.videoCount)}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-500">중복 제외</p>
              <p className="mt-1 font-bold text-ink">{result.duplicateVideosExcluded}개</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function RecommendationCard({ item, index }: { item: ContentRecommendation; index: number }) {
  return (
    <Card className="shadow-none">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Badge tone="brand">추천 {index + 1}</Badge>
          <h3 className="mt-3 text-xl font-bold text-ink">{item.title}</h3>
          <p className="mt-2 text-sm font-semibold text-violet-700">{item.format}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.hashtags.map((hashtag) => (
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700" key={hashtag}>
              {hashtag}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase text-slate-400">추천 이유</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{item.reason}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-400">중복이 아닌 이유</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{item.whyNotDuplicate}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-400">타겟 시청자</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{item.targetAudience}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-400">썸네일 아이디어</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{item.thumbnailIdea}</p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-bold text-ink">콘티</p>
        <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {item.storyboard.map((scene) => (
            <div className="grid gap-2 p-3 text-sm md:grid-cols-[80px_1fr_1fr]" key={`${item.title}-${scene.scene}`}>
              <p className="font-bold text-violet-700">{scene.duration}</p>
              <p className="text-slate-700">{scene.description}</p>
              <p className="text-slate-500">{scene.caption}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function DashboardRecommendationClient() {
  const [channelUrl, setChannelUrl] = useState("");
  const [category, setCategory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendationApiResult | null>(null);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const timer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, loadingStages.length - 1));
    }, 1400);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setStageIndex(0);
    setIsLoading(true);

    try {
      const response = await fetch("/api/recommend-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelUrl,
          category: category || null,
        }),
      });
      const payload = (await response.json()) as ApiSuccess<RecommendationApiResult> | ApiFailure;

      if (!payload.success) {
        throw new Error(payload.message ?? "추천 생성에 실패했습니다.");
      }

      setResult(payload.data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "추천 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<Badge tone="brand">YouTube AI 콘텐츠 추천</Badge>}
        title="대시보드"
        description="채널 링크를 분석하고 카테고리별 인플루언서 최근 영상 데이터를 바탕으로 다음 콘텐츠 아이디어와 콘티를 생성합니다."
      />

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card title="서비스 흐름" className="shadow-none">
          <div className="space-y-4 text-sm leading-6 text-slate-600">
            <p>채널 정보와 최근 업로드를 먼저 분석한 뒤, 선택 또는 추론된 카테고리의 인플루언서 영상 데이터와 비교합니다.</p>
            <p>이미 올린 콘텐츠와 유사한 주제는 제외하고 로컬 LLM API가 다음 업로드 아이디어, 썸네일 방향, 장면별 콘티를 생성합니다.</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {CREATOR_CATEGORIES.slice(0, 6).map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>
        </Card>

        <Card title="채널 분석 시작">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              helperText="예: https://www.youtube.com/@channel"
              label="YouTube 채널 URL"
              onChange={(event) => setChannelUrl(event.target.value)}
              placeholder="https://www.youtube.com/@..."
              required
              type="text"
              value={channelUrl}
            />

            <label className="block text-sm font-semibold text-slate-700" htmlFor="creator-category">
              <span>카테고리 선택사항</span>
              <select
                className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                id="creator-category"
                onChange={(event) => setCategory(event.target.value)}
                value={category}
              >
                <option value="">자동 선정</option>
                {CREATOR_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <Button className="w-full sm:w-auto" disabled={isLoading} type="submit">
              {isLoading ? loadingStages[stageIndex] : "분석 시작"}
            </Button>
          </form>

          {isLoading ? (
            <div className="mt-5 rounded-lg border border-violet-100 bg-violet-50 p-4">
              <div className="flex flex-wrap gap-2">
                {loadingStages.map((stage, index) => (
                  <Badge key={stage} tone={index <= stageIndex ? "brand" : "default"}>
                    {stage}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}
        </Card>
      </section>

      {result ? (
        <>
          <ChannelAnalysisCard result={result} />

          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <Card title="최근 업로드">
              <RecentVideoList videos={result.recentVideos} />
            </Card>

            <Card title="AI 추천 요약">
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">선택 {result.selectedCategory}</Badge>
                <Badge tone="info">인플루언서 영상 {result.influencerVideosUsed}개 반영</Badge>
                {result.llmParseError ? <Badge tone="warning">JSON fallback</Badge> : null}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-700">{result.recommendation.summary}</p>
              {result.persistence.error ? (
                <p className="mt-3 text-xs font-semibold text-amber-700">저장 실패: {result.persistence.error}</p>
              ) : null}
            </Card>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-ink">추천 콘텐츠</h2>
              <p className="mt-2 text-sm text-slate-600">로컬 LLM이 생성한 다음 업로드 후보입니다.</p>
            </div>
            {result.recommendation.recommendations.length > 0 ? (
              <div className="grid gap-4">
                {result.recommendation.recommendations.map((item, index) => (
                  <RecommendationCard index={index} item={item} key={`${item.title}-${index}`} />
                ))}
              </div>
            ) : (
              <Card className="shadow-none">
                <p className="text-sm font-semibold text-slate-600">추천 카드가 비어 있습니다. LLM 응답 형식 또는 프롬프트 결과를 확인해야 합니다.</p>
              </Card>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
