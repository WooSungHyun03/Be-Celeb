"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { PageHeader } from "@/components/common/PageHeader";
import { SkeletonCard } from "@/components/common/Loading";
import { getCombinedTrends, getNaverTrendKeywords, getPopularVideos, getTrendKeywords } from "@/lib/api/trends";
import type {
  CombinedTrendsResponse,
  NaverTrendKeywordsResponse,
  PopularTrendVideo,
  PopularVideosResponse,
  TrendKeywordsResponse,
  TrendKeywordRange,
} from "@/types/youtube-trends";

type AsyncState<T> = {
  status: "idle" | "loading" | "success" | "error";
  data: T | null;
  error: string | null;
};

const rangeOptions: Array<{ id: TrendKeywordRange; label: string; caption: string }> = [
  { id: "daily", label: "Daily", caption: "최근 14일" },
  { id: "weekly", label: "Weekly", caption: "최근 8주" },
  { id: "monthly", label: "Monthly", caption: "최근 6개월" },
];

const chartColors = ["#7c3aed", "#2563eb", "#059669", "#ea580c", "#db2777"];
const naverChartColors = ["#059669", "#2563eb", "#ea580c", "#7c3aed", "#be123c"];
const beCelebCategories = ["게임", "운동", "IT", "노래", "OTT", "일상", "뷰티", "스터디", "코미디", "먹방", "춤"];

function createInitialState<T>(): AsyncState<T> {
  return {
    status: "idle",
    data: null,
    error: null,
  };
}

function formatCompactNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatMetricLabel(value: unknown) {
  return formatCompactNumber(typeof value === "number" ? value : Number(value));
}

function formatRatio(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 1,
  }).format(value);
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-base font-bold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-5">
      <p className="text-sm font-semibold text-rose-700">{message}</p>
      <Button className="mt-4" onClick={onRetry} variant="secondary">
        다시 시도
      </Button>
    </div>
  );
}

function VideoCard({ video }: { video: PopularTrendVideo }) {
  const tags = video.tags.slice(0, 5);

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
      <a href={video.youtubeUrl} rel="noreferrer" target="_blank">
        <div className="aspect-video bg-slate-100">
          {video.thumbnailUrl ? (
            <img
              alt={`${video.title} thumbnail`}
              className="h-full w-full object-cover"
              src={video.thumbnailUrl}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#f8fafc_0%,#ede9fe_100%)] text-sm font-bold text-slate-500">
              No thumbnail
            </div>
          )}
        </div>
      </a>
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{video.category}</Badge>
          <span className="text-xs font-semibold text-slate-500">{formatDate(video.publishedAt)}</span>
        </div>
        <div>
          <a className="line-clamp-2 text-base font-bold leading-6 text-ink hover:text-violet-700" href={video.youtubeUrl} rel="noreferrer" target="_blank">
            {video.title}
          </a>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{video.description || "영상 설명 없음"}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md bg-slate-50 p-2">
            <p className="font-semibold text-slate-500">조회수</p>
            <p className="mt-1 font-bold text-ink">{formatCompactNumber(video.viewCount)}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-2">
            <p className="font-semibold text-slate-500">좋아요</p>
            <p className="mt-1 font-bold text-ink">{formatCompactNumber(video.likeCount)}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-2">
            <p className="font-semibold text-slate-500">댓글</p>
            <p className="mt-1 font-bold text-ink">{formatCompactNumber(video.commentCount)}</p>
          </div>
        </div>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600" key={tag}>
                #{tag.replace(/^#+/, "")}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs font-semibold text-slate-400">등록된 태그 없음</p>
        )}
      </div>
    </article>
  );
}

function VideoSkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

function KeywordSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
      <Card>
        <div className="h-72 animate-pulse rounded-lg bg-slate-100" />
      </Card>
      <Card>
        <div className="space-y-3">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="h-8 animate-pulse rounded bg-slate-100" key={index} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function PopularVideosSection({
  state,
  selectedCategory,
  onCategoryChange,
  onRetry,
}: {
  state: AsyncState<PopularVideosResponse>;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onRetry: () => void;
}) {
  const categories = useMemo(() => {
    return Array.from(new Set((state.data?.videos ?? []).map((video) => video.category))).sort((left, right) => left.localeCompare(right));
  }, [state.data?.videos]);
  const videos = useMemo(() => {
    const source = state.data?.videos ?? [];
    return selectedCategory === "all" ? source : source.filter((video) => video.category === selectedCategory);
  }, [selectedCategory, state.data?.videos]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">현재 인기 영상</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">카테고리별 조회수 1등 인플루언서 영상을 조회수 순으로 정렬합니다.</p>
        </div>
        {categories.length > 0 ? (
          <label className="text-sm font-semibold text-slate-700">
            <span className="sr-only">카테고리 필터</span>
            <select
              className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
              onChange={(event) => onCategoryChange(event.target.value)}
              value={selectedCategory}
            >
              <option value="all">전체 카테고리</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {state.status === "loading" || state.status === "idle" ? <VideoSkeletonGrid /> : null}
      {state.status === "error" ? <ErrorState message={state.error ?? "인기 영상 데이터를 불러오지 못했습니다."} onRetry={onRetry} /> : null}
      {state.status === "success" && videos.length === 0 ? (
        <EmptyState
          title="표시할 인기 영상이 없습니다."
          description="Supabase의 influencer_videos 테이블에 카테고리별 영상 데이터가 쌓이면 이 영역에 자동으로 표시됩니다."
        />
      ) : null}
      {state.status === "success" && videos.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <VideoCard key={`${video.category}-${video.youtubeVideoId}`} video={video} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RangeTabs({ range, onChange }: { range: TrendKeywordRange; onChange: (range: TrendKeywordRange) => void }) {
  return (
    <div className="flex rounded-lg bg-slate-100 p-1">
      {rangeOptions.map((option) => {
        const isActive = option.id === range;

        return (
          <button
            aria-pressed={isActive}
            className={`min-h-10 rounded-md px-4 py-2 text-left text-xs font-bold transition sm:min-w-28 ${
              isActive ? "bg-white text-violet-700 shadow-sm" : "text-slate-600 hover:text-violet-700"
            }`}
            key={option.id}
            onClick={() => onChange(option.id)}
            type="button"
          >
            <span className="block text-sm">{option.label}</span>
            <span className="hidden font-semibold text-slate-400 sm:block">{option.caption}</span>
          </button>
        );
      })}
    </div>
  );
}

function KeywordCharts({ data }: { data: TrendKeywordsResponse }) {
  if (data.topKeywords.length === 0) {
    return (
      <EmptyState
        title="집계할 키워드가 없습니다."
        description="선택한 기간에 태그가 포함된 influencer_videos 데이터가 없습니다."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card title="Top 10 keyword count">
          <div className="h-80 min-w-0">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={data.topKeywords} margin={{ bottom: 18, left: 0, right: 8, top: 8 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="keyword" interval={0} tick={{ fontSize: 11 }} tickMargin={8} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickFormatter={formatMetricLabel} width={42} />
                <Tooltip formatter={(value) => [formatMetricLabel(value), "count"]} />
                <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top keywords">
          <div className="space-y-3">
            {data.topKeywords.map((item, index) => (
              <div className="flex items-center justify-between gap-3" key={item.keyword}>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-violet-50 text-xs font-bold text-violet-700">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm font-semibold text-ink">#{item.keyword}</span>
                </div>
                <span className="text-sm font-bold text-slate-600">{formatCompactNumber(item.count)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {data.seriesKeywords.length > 0 ? (
        <Card title="Keyword trend">
          <div className="h-80 min-w-0">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={data.series} margin={{ bottom: 8, left: 0, right: 12, top: 8 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} tickMargin={8} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickFormatter={formatMetricLabel} width={42} />
                <Tooltip formatter={(value, name) => [formatMetricLabel(value), String(name)]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {data.seriesKeywords.map((keyword, index) => (
                  <Line
                    activeDot={{ r: 5 }}
                    dataKey={keyword}
                    dot={false}
                    key={keyword}
                    stroke={chartColors[index % chartColors.length]}
                    strokeWidth={2.4}
                    type="monotone"
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function KeywordsSection({
  range,
  state,
  onRangeChange,
  onRetry,
}: {
  range: TrendKeywordRange;
  state: AsyncState<TrendKeywordsResponse>;
  onRangeChange: (range: TrendKeywordRange) => void;
  onRetry: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">급상승 키워드</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">저장된 YouTube 영상 태그를 정규화해 기간별 등장 횟수를 집계합니다.</p>
        </div>
        <RangeTabs onChange={onRangeChange} range={range} />
      </div>

      {state.status === "loading" || state.status === "idle" ? <KeywordSkeleton /> : null}
      {state.status === "error" ? <ErrorState message={state.error ?? "키워드 데이터를 불러오지 못했습니다."} onRetry={onRetry} /> : null}
      {state.status === "success" && state.data ? <KeywordCharts data={state.data} /> : null}
    </section>
  );
}

function CategorySelect({ value, onChange }: { value: string; onChange: (category: string) => void }) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      <span className="sr-only">Naver 카테고리</span>
      <select
        className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {beCelebCategories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </label>
  );
}

function NaverKeywordCharts({ data }: { data: NaverTrendKeywordsResponse }) {
  if (data.topKeywords.length === 0) {
    return (
      <EmptyState
        title="아직 네이버 트렌드 수집 데이터가 없습니다."
        description="관리자 수동 수집 또는 daily collector를 확인하세요."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <Card title="Naver Top Keywords">
          <div className="space-y-3">
            {data.topKeywords.map((item, index) => (
              <div className="flex items-center justify-between gap-3" key={item.keyword}>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-xs font-bold text-emerald-700">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm font-semibold text-ink">{item.keyword}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-700">{formatRatio(item.ratio)}</p>
                  <p className={item.trendDelta >= 0 ? "text-xs font-semibold text-emerald-700" : "text-xs font-semibold text-rose-600"}>
                    {item.trendDelta >= 0 ? "+" : ""}
                    {formatRatio(item.trendDelta)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Naver keyword ratio">
          <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold leading-5 text-emerald-800">
            ratio는 절대 검색량이 아니라 Naver DataLab이 제공하는 상대 검색 추이 지표입니다.
          </div>
          <div className="h-80 min-w-0">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={data.series} margin={{ bottom: 8, left: 0, right: 12, top: 8 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} tickMargin={8} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => formatRatio(Number(value))} width={42} />
                <Tooltip formatter={(value, name) => [formatRatio(Number(value)), String(name)]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {data.seriesKeywords.map((keyword, index) => (
                  <Line
                    activeDot={{ r: 5 }}
                    dataKey={keyword}
                    dot={false}
                    key={keyword}
                    stroke={naverChartColors[index % naverChartColors.length]}
                    strokeWidth={2.4}
                    type="monotone"
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CombinedTrendSection({ state, onRetry }: { state: AsyncState<CombinedTrendsResponse>; onRetry: () => void }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">YouTube + Naver 결합 트렌드</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          YouTube 업로드 패턴과 네이버 검색 관심도를 결합한 한국 트렌드 지표
        </p>
      </div>

      {state.status === "loading" || state.status === "idle" ? <KeywordSkeleton /> : null}
      {state.status === "error" ? <ErrorState message={state.error ?? "결합 트렌드 데이터를 불러오지 못했습니다."} onRetry={onRetry} /> : null}
      {state.status === "success" && state.data?.combined.keywords.length === 0 ? (
        <EmptyState
          title="결합할 트렌드 데이터가 없습니다."
          description="YouTube 영상 태그와 Naver trend daily points가 쌓이면 Top 10 결합 점수가 표시됩니다."
        />
      ) : null}
      {state.status === "success" && state.data && state.data.combined.keywords.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card title="Combined keyword score Top 10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Keyword</th>
                    <th className="px-3 py-2 text-right">Score</th>
                    <th className="px-3 py-2 text-right">YouTube tags</th>
                    <th className="px-3 py-2 text-right">YouTube views</th>
                    <th className="px-3 py-2 text-right">Naver ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.data.combined.keywords.map((item) => (
                    <tr key={item.keyword}>
                      <td className="px-3 py-3 font-semibold text-ink">{item.keyword}</td>
                      <td className="px-3 py-3 text-right font-bold text-emerald-700">{formatRatio(item.score)}</td>
                      <td className="px-3 py-3 text-right">{formatCompactNumber(item.youtubeCount)}</td>
                      <td className="px-3 py-3 text-right">{formatCompactNumber(item.youtubeViews)}</td>
                      <td className="px-3 py-3 text-right">{formatRatio(item.naverRatio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-4">
            <Card title="YouTube top tags">
              <div className="space-y-2">
                {state.data.youtube.topTags.slice(0, 8).map((tag) => (
                  <div className="flex items-center justify-between gap-3 text-sm" key={tag.keyword}>
                    <span className="truncate font-semibold text-ink">#{tag.keyword}</span>
                    <span className="shrink-0 text-slate-500">{tag.count}회 · {formatCompactNumber(tag.views)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Naver top keywords">
              <div className="space-y-2">
                {state.data.naver.topKeywords.slice(0, 8).map((keyword) => (
                  <div className="flex items-center justify-between gap-3 text-sm" key={keyword.keyword}>
                    <span className="truncate font-semibold text-ink">{keyword.keyword}</span>
                    <span className="shrink-0 text-slate-500">{formatRatio(keyword.ratio)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function NaverTrendsSection({
  category,
  range,
  naverState,
  combinedState,
  onCategoryChange,
  onRangeChange,
  onRetry,
}: {
  category: string;
  range: TrendKeywordRange;
  naverState: AsyncState<NaverTrendKeywordsResponse>;
  combinedState: AsyncState<CombinedTrendsResponse>;
  onCategoryChange: (category: string) => void;
  onRangeChange: (range: TrendKeywordRange) => void;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">네이버 검색 트렌드</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Naver DataLab 통합검색어 트렌드 API의 카테고리별 상대 ratio를 표시합니다.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <CategorySelect onChange={onCategoryChange} value={category} />
            <RangeTabs onChange={onRangeChange} range={range} />
          </div>
        </div>

        {naverState.status === "loading" || naverState.status === "idle" ? <KeywordSkeleton /> : null}
        {naverState.status === "error" ? <ErrorState message={naverState.error ?? "네이버 트렌드 데이터를 불러오지 못했습니다."} onRetry={onRetry} /> : null}
        {naverState.status === "success" && naverState.data ? <NaverKeywordCharts data={naverState.data} /> : null}
      </section>

      <CombinedTrendSection onRetry={onRetry} state={combinedState} />
    </div>
  );
}

export function YouTubeTrendsClient() {
  const [popularState, setPopularState] = useState<AsyncState<PopularVideosResponse>>(() => createInitialState());
  const [keywordState, setKeywordState] = useState<AsyncState<TrendKeywordsResponse>>(() => createInitialState());
  const [naverState, setNaverState] = useState<AsyncState<NaverTrendKeywordsResponse>>(() => createInitialState());
  const [combinedState, setCombinedState] = useState<AsyncState<CombinedTrendsResponse>>(() => createInitialState());
  const [range, setRange] = useState<TrendKeywordRange>("daily");
  const [naverRange, setNaverRange] = useState<TrendKeywordRange>("daily");
  const [naverCategory, setNaverCategory] = useState("IT");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [popularReloadKey, setPopularReloadKey] = useState(0);
  const [keywordReloadKey, setKeywordReloadKey] = useState(0);
  const [naverReloadKey, setNaverReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setPopularState({ status: "loading", data: null, error: null });
    getPopularVideos(controller.signal)
      .then((data) => {
        setPopularState({ status: "success", data, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setPopularState({
            status: "error",
            data: null,
            error: error instanceof Error ? error.message : "인기 영상 데이터를 불러오지 못했어요.",
          });
        }
      });

    return () => controller.abort();
  }, [popularReloadKey]);

  useEffect(() => {
    const controller = new AbortController();

    setKeywordState({ status: "loading", data: null, error: null });
    getTrendKeywords(range, controller.signal)
      .then((data) => {
        setKeywordState({ status: "success", data, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setKeywordState({
            status: "error",
            data: null,
            error: error instanceof Error ? error.message : "키워드 데이터를 불러오지 못했어요.",
          });
        }
      });

    return () => controller.abort();
  }, [keywordReloadKey, range]);

  useEffect(() => {
    const controller = new AbortController();

    setNaverState({ status: "loading", data: null, error: null });
    getNaverTrendKeywords(naverCategory, naverRange, controller.signal)
      .then((data) => {
        setNaverState({ status: "success", data, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setNaverState({
            status: "error",
            data: null,
            error: error instanceof Error ? error.message : "네이버 트렌드 데이터를 불러오지 못했어요.",
          });
        }
      });

    return () => controller.abort();
  }, [naverCategory, naverRange, naverReloadKey]);

  useEffect(() => {
    const controller = new AbortController();

    setCombinedState({ status: "loading", data: null, error: null });
    getCombinedTrends(naverCategory, naverRange, controller.signal)
      .then((data) => {
        setCombinedState({ status: "success", data, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setCombinedState({
            status: "error",
            data: null,
            error: error instanceof Error ? error.message : "결합 트렌드 데이터를 불러오지 못했어요.",
          });
        }
      });

    return () => controller.abort();
  }, [naverCategory, naverRange, naverReloadKey]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<Badge tone="brand">YouTube + Naver</Badge>}
        title="Trends"
        description="카테고리별 인기 영상, YouTube 태그, Naver 검색 관심도를 함께 확인하세요."
      />

      <PopularVideosSection
        onCategoryChange={setSelectedCategory}
        onRetry={() => setPopularReloadKey((current) => current + 1)}
        selectedCategory={selectedCategory}
        state={popularState}
      />

      <KeywordsSection
        onRangeChange={setRange}
        onRetry={() => setKeywordReloadKey((current) => current + 1)}
        range={range}
        state={keywordState}
      />

      <NaverTrendsSection
        category={naverCategory}
        combinedState={combinedState}
        naverState={naverState}
        onCategoryChange={setNaverCategory}
        onRangeChange={setNaverRange}
        onRetry={() => setNaverReloadKey((current) => current + 1)}
        range={naverRange}
      />
    </div>
  );
}
