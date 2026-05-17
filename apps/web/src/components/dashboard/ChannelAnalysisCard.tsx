"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { CREATOR_CATEGORIES } from "@/lib/categories";

type ChannelAnalysisCardProps = {
  channelUrl: string;
  category: string;
  isLoading: boolean;
  onChannelUrlChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ChannelAnalysisCard({
  channelUrl,
  category,
  isLoading,
  onChannelUrlChange,
  onCategoryChange,
  onSubmit,
}: ChannelAnalysisCardProps) {
  return (
    <Card title="채널 분석 시작">
      <form className="space-y-3" onSubmit={onSubmit}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_180px] lg:items-end">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="youtube-channel-url">
            <span>YouTube 채널 URL</span>
            <input
              className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-ink placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
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
              className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
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
            {isLoading ? "추천 생성 중" : "콘텐츠 추천받기"}
          </Button>
        </div>
        <p className="text-xs leading-5 text-slate-500">저장된 회원 채널 설정이 있으면 자동으로 입력됩니다.</p>
      </form>
    </Card>
  );
}
