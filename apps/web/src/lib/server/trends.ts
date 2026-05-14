import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type {
  PopularTrendVideo,
  TrendKeywordRange,
  TrendKeywordSeriesPoint,
  TrendKeywordsResponse,
} from "@/types/youtube-trends";

type CategoryRow = {
  id: string;
  name: string;
};

type InfluencerVideoRow = {
  category_id: string;
  youtube_video_id: string;
  published_at: string;
  title: string;
  description: string | null;
  thumbnails: unknown;
  tags: string[] | null;
  view_count: number | string | null;
  like_count: number | string | null;
  comment_count: number | string | null;
};

type PopularVideoRpcRow = {
  category: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  tags: string[] | null;
  view_count: number | string | null;
  like_count: number | string | null;
  comment_count: number | string | null;
  published_at: string;
};

type KeywordVideoRow = {
  published_at: string;
  tags: string[] | null;
};

type PeriodConfig = {
  start: Date;
  periods: string[];
  getPeriod: (date: Date) => string;
};

const TOP_KEYWORD_COUNT = 10;
const SERIES_KEYWORD_COUNT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toVideoUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function isThumbnailMap(value: unknown): value is Record<string, { url?: unknown }> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getThumbnailUrl(thumbnails: unknown) {
  if (!isThumbnailMap(thumbnails)) {
    return null;
  }

  const preferredKeys = ["maxres", "standard", "high", "medium", "default"];
  const match = preferredKeys
    .map((key) => thumbnails[key]?.url)
    .find((url): url is string => typeof url === "string" && url.length > 0);

  return match ?? null;
}

function normalizePopularVideo(row: PopularVideoRpcRow): PopularTrendVideo {
  return {
    category: row.category,
    youtubeVideoId: row.youtube_video_id,
    title: row.title,
    description: row.description ?? "",
    thumbnailUrl: row.thumbnail_url,
    tags: row.tags ?? [],
    viewCount: toNumber(row.view_count),
    likeCount: toNumber(row.like_count),
    commentCount: toNumber(row.comment_count),
    publishedAt: row.published_at,
    youtubeUrl: toVideoUrl(row.youtube_video_id),
  };
}

function normalizeFallbackVideo(row: InfluencerVideoRow, categoryName: string): PopularTrendVideo {
  return {
    category: categoryName,
    youtubeVideoId: row.youtube_video_id,
    title: row.title,
    description: row.description ?? "",
    thumbnailUrl: getThumbnailUrl(row.thumbnails),
    tags: row.tags ?? [],
    viewCount: toNumber(row.view_count),
    likeCount: toNumber(row.like_count),
    commentCount: toNumber(row.comment_count),
    publishedAt: row.published_at,
    youtubeUrl: toVideoUrl(row.youtube_video_id),
  };
}

function sortByViewsDesc<T extends { viewCount: number | null; publishedAt: string }>(left: T, right: T) {
  return (right.viewCount ?? -1) - (left.viewCount ?? -1) || new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
}

function isMissingRpc(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "PGRST202" || message.includes("function") || message.includes("schema cache");
}

async function getPopularVideosFallback() {
  const supabase = getSupabaseServiceRoleClient();
  const [{ data: categories, error: categoryError }, { data: videos, error: videoError }] = await Promise.all([
    supabase.from("creator_categories").select("id,name").returns<CategoryRow[]>(),
    supabase
      .from("influencer_videos")
      .select("category_id,youtube_video_id,published_at,title,description,thumbnails,tags,view_count,like_count,comment_count")
      .returns<InfluencerVideoRow[]>(),
  ]);

  if (categoryError) {
    throw new Error(`Failed to load creator categories. ${categoryError.message}`);
  }

  if (videoError) {
    throw new Error(`Failed to load influencer videos. ${videoError.message}`);
  }

  const categoryMap = new Map((categories ?? []).map((category) => [category.id, category.name]));
  const bestByCategory = new Map<string, PopularTrendVideo>();

  (videos ?? []).forEach((video) => {
    const categoryName = categoryMap.get(video.category_id);

    if (!categoryName) {
      return;
    }

    const normalized = normalizeFallbackVideo(video, categoryName);
    const current = bestByCategory.get(categoryName);

    if (!current || sortByViewsDesc(normalized, current) < 0) {
      bestByCategory.set(categoryName, normalized);
    }
  });

  return Array.from(bestByCategory.values()).sort(sortByViewsDesc);
}

export async function getPopularVideosByCategory() {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = (await supabase.rpc("get_top_influencer_videos_by_category")) as {
    data: PopularVideoRpcRow[] | null;
    error: { code?: string; message?: string } | null;
  };

  if (error) {
    if (isMissingRpc(error)) {
      return getPopularVideosFallback();
    }

    throw new Error(`Failed to load category popular videos. ${error.message}`);
  }

  return (data ?? []).map(normalizePopularVideo).sort(sortByViewsDesc);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatMonthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function startOfUtcWeek(date: Date) {
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(startOfUtcDay(date), mondayOffset);
}

function getPeriodConfig(range: TrendKeywordRange, now = new Date()): PeriodConfig {
  if (range === "weekly") {
    const currentWeekStart = startOfUtcWeek(now);
    const start = addDays(currentWeekStart, -7 * 7);
    const periods = Array.from({ length: 8 }, (_, index) => formatDateKey(addDays(start, index * 7)));

    return {
      start,
      periods,
      getPeriod: (date) => formatDateKey(startOfUtcWeek(date)),
    };
  }

  if (range === "monthly") {
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const start = addMonths(currentMonthStart, -5);
    const periods = Array.from({ length: 6 }, (_, index) => formatMonthKey(addMonths(start, index)));

    return {
      start,
      periods,
      getPeriod: formatMonthKey,
    };
  }

  const today = startOfUtcDay(now);
  const start = addDays(today, -13);
  const periods = Array.from({ length: 14 }, (_, index) => formatDateKey(addDays(start, index)));

  return {
    start,
    periods,
    getPeriod: (date) => formatDateKey(startOfUtcDay(date)),
  };
}

export function normalizeKeywordTag(tag: string) {
  return tag.trim().replace(/^#+/, "").trim().toLowerCase();
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function buildKeywordSeries(
  periodKeywordCounts: Map<string, Map<string, number>>,
  periods: string[],
  seriesKeywords: string[],
) {
  return periods.map<TrendKeywordSeriesPoint>((period) => {
    const point: TrendKeywordSeriesPoint = { period };
    const keywordCounts = periodKeywordCounts.get(period);

    seriesKeywords.forEach((keyword) => {
      point[keyword] = keywordCounts?.get(keyword) ?? 0;
    });

    return point;
  });
}

export async function getKeywordTrends(range: TrendKeywordRange): Promise<TrendKeywordsResponse> {
  const config = getPeriodConfig(range);
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("influencer_videos")
    .select("published_at,tags")
    .gte("published_at", config.start.toISOString())
    .returns<KeywordVideoRow[]>();

  if (error) {
    throw new Error(`Failed to load keyword videos. ${error.message}`);
  }

  const totalCounts = new Map<string, number>();
  const periodKeywordCounts = new Map<string, Map<string, number>>();

  config.periods.forEach((period) => {
    periodKeywordCounts.set(period, new Map());
  });

  (data ?? []).forEach((video) => {
    if (!Array.isArray(video.tags) || video.tags.length === 0) {
      return;
    }

    const period = config.getPeriod(new Date(video.published_at));
    const periodCounts = periodKeywordCounts.get(period);

    if (!periodCounts) {
      return;
    }

    const normalizedTags = Array.from(new Set(video.tags.map(normalizeKeywordTag).filter(Boolean)));

    normalizedTags.forEach((keyword) => {
      increment(totalCounts, keyword);
      increment(periodCounts, keyword);
    });
  });

  const topKeywords = Array.from(totalCounts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((left, right) => right.count - left.count || left.keyword.localeCompare(right.keyword))
    .slice(0, TOP_KEYWORD_COUNT);
  const seriesKeywords = topKeywords.slice(0, SERIES_KEYWORD_COUNT).map((item) => item.keyword);

  return {
    range,
    topKeywords,
    seriesKeywords,
    series: buildKeywordSeries(periodKeywordCounts, config.periods, seriesKeywords),
  };
}
