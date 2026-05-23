"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { CREATOR_CATEGORIES } from "@/lib/categories";
import type { RecommendationFieldOptions } from "@/types/content-recommendation";

type ChannelAnalysisCardProps = {
  channelUrl: string;
  category: string;
  options: RecommendationFieldOptions;
  isLoading: boolean;
  onChannelUrlChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onOptionsChange: (options: RecommendationFieldOptions) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const optionItems: Array<{ key: keyof RecommendationFieldOptions; label: string; description: string }> = [
  { key: "reason", label: "추천 이유", description: "왜 이 주제가 채널에 맞는지 핵심 근거를 정리합니다." },
  { key: "hashtags", label: "해시태그", description: "업로드에 바로 사용할 태그를 제안합니다." },
  { key: "storyboard", label: "콘티", description: "촬영 흐름을 장면 단위로 구성합니다." },
  { key: "hook", label: "3초 Hook", description: "초반 이탈을 줄이는 도입 멘트를 만듭니다." },
  { key: "thumbnailIdea", label: "썸네일 아이디어", description: "클릭을 유도할 화면 구성과 카피를 제안합니다." },
  { key: "uploadTips", label: "업로드 팁", description: "게시 시간, 제목 패키지, 운영 팁을 정리합니다." },
];

export function ChannelAnalysisCard({
  channelUrl,
  category,
  options,
  isLoading,
  onChannelUrlChange,
  onCategoryChange,
  onOptionsChange,
  onSubmit,
}: ChannelAnalysisCardProps) {
  function handleOptionChange(key: keyof RecommendationFieldOptions, checked: boolean) {
    onOptionsChange({ ...options, [key]: checked });
  }

  return (
    <Card className="overflow-hidden" title="채널 분석 시작">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_180px] lg:items-end">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="youtube-channel-url">
            <span>YouTube 채널 URL</span>
            <input
              className="mt-2 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
              id="youtube-channel-url"
              onChange={(event) => onChannelUrlChange(event.target.value)}
              placeholder="https://www.youtube.com/@beceleb"
              required
              type="url"
              value={channelUrl}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700" htmlFor="recommend-category">
            <span>카테고리</span>
            <select
              className="mt-2 block h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
              id="recommend-category"
              onChange={(event) => onCategoryChange(event.target.value)}
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

          <Button className="h-11 w-full whitespace-nowrap" disabled={isLoading} type="submit">
            {isLoading ? "추천 생성 중..." : "콘텐츠 추천받기"}
          </Button>
        </div>

        <section className="rounded-xl border border-violet-100 bg-[linear-gradient(135deg,#ffffff_0%,#faf5ff_100%)] p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-ink">추천 옵션</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                제목은 기본 포함됩니다. 필요한 항목만 선택해 추천 결과 화면에 표시하세요.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {optionItems.map((item) => (
              <label
                className="flex min-h-20 cursor-pointer gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md hover:shadow-violet-100"
                key={item.key}
              >
                <input
                  checked={Boolean(options[item.key])}
                  className="mt-1 size-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  disabled={isLoading}
                  onChange={(event) => handleOptionChange(item.key, event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <span className="block font-bold text-ink">{item.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <p className="text-xs leading-5 text-slate-500">
          저장된 회원 채널 설정이 있으면 URL과 카테고리가 자동으로 채워집니다.
        </p>
      </form>
    </Card>
  );
}
