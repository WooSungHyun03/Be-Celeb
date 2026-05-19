import type {
  ChannelAnalysisResult,
  RecommendationFieldOptions,
  RecommendationDetailResponse,
  SingleRecommendContentResponse,
  UserChannelSettings,
} from "@/types/content-recommendation";
import type {
  CombinedTrendsResponse,
  NaverTrendKeywordsResponse,
  PopularVideosResponse,
  TrendKeywordsResponse,
  TrendKeywordRange,
} from "@/types/youtube-trends";
import { getAuthorizationHeaders } from "@/lib/client/auth";

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  message?: string;
  code?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

export type RecommendContentPayload = {
  channelUrl: string;
  category?: string | null;
  options?: RecommendationFieldOptions;
};

export type AnalyzeChannelPayload = {
  channelUrl: string;
};

export type FavoriteType = "trend" | "product" | "recommendation";

export type FavoriteItem = {
  id: string;
  userId: string;
  targetType: FavoriteType;
  targetId: string;
  recommendationId?: string | null;
  title: string | null;
  reason?: string | null;
  hashtags?: string[];
  storyboard?: Array<Record<string, unknown>>;
  source?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string | null;
};

export type FavoritePayload = {
  targetType: FavoriteType;
  targetId?: string;
  recommendationId?: string;
  title?: string | null;
  reason?: string | null;
  hashtags?: string[];
  storyboard?: Array<Record<string, unknown>>;
  source?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type CalendarEventStatus = "planned" | "scripted" | "filmed" | "edited" | "uploaded";

export type CalendarEvent = {
  id: string;
  userId: string;
  favoriteId: string | null;
  title: string;
  description: string | null;
  scheduledDate: string;
  startTime: string | null;
  endTime: string | null;
  status: CalendarEventStatus;
  platform: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEventPayload = {
  favoriteId?: string | null;
  title: string;
  description?: string | null;
  scheduledDate: string;
  startTime?: string | null;
  endTime?: string | null;
  status?: CalendarEventStatus;
  platform?: string;
  metadata?: Record<string, unknown>;
};

export type GrowthVideoStat = {
  youtubeVideoId: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
};

export type GrowthSnapshot = {
  id: string;
  youtubeChannelId: string;
  channelUrl: string | null;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  recentVideoStats: GrowthVideoStat[];
  collectedAt: string;
  createdAt: string;
};

export type GrowthReportResponse = {
  hasChannelSettings: boolean;
  settings: UserChannelSettings | null;
  latest: GrowthSnapshot | null;
  previous: GrowthSnapshot | null;
  deltas: {
    subscriberCount: number;
    viewCount: number;
    videoCount: number;
  };
  trend: GrowthSnapshot[];
};

export type ShopProduct = {
  id: string | null;
  source: string;
  sourceProductId: string | null;
  title: string;
  imageUrl: string | null;
  price: number | null;
  mallName: string | null;
  productUrl: string;
  brand: string | null;
  maker: string | null;
  category: string | null;
  creatorCategory: string;
  searchKeyword: string;
  collectedAt: string | null;
};

export type ShopProductsResponse = {
  category: string;
  query: string | null;
  source: string;
  fromCache: boolean;
  products: ShopProduct[];
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function isFailurePayload(payload: unknown): payload is ApiFailure {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    (payload as { success?: unknown }).success === false
  );
}

function getFailureMessage(payload: unknown, fallback: string) {
  if (isFailurePayload(payload)) {
    return payload.message ?? payload.error?.message ?? fallback;
  }

  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (typeof payload === "object" && payload !== null && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      return "요청 값이 올바르지 않습니다.";
    }
  }

  return fallback;
}

function getFailureCode(payload: unknown) {
  if (isFailurePayload(payload)) {
    return payload.code ?? payload.error?.code;
  }

  return undefined;
}

async function parseJsonResponse(response: Response) {
  const text = await response.text().catch(() => "");

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiClientError("Backend API 응답을 JSON으로 해석하지 못했습니다.", response.status);
  }
}

export function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new ApiClientError("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  return trimTrailingSlash(baseUrl);
}

export function getApiUrl(path: string) {
  return `${getApiBaseUrl()}${normalizePath(path)}`;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(getApiUrl(path), {
    ...options,
    credentials: options.credentials ?? "include",
    headers,
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok || isFailurePayload(payload)) {
    const message = getFailureMessage(payload, `Backend API request failed: ${response.status}`);
    throw new ApiClientError(message, response.status, getFailureCode(payload), payload);
  }

  return payload as T;
}

export async function recommendContent(payload: RecommendContentPayload, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<SingleRecommendContentResponse>>("/api/recommend-content", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: await getAuthorizationHeaders(),
    signal,
  });

  return response.data;
}

export async function getRecommendation(recommendationId: string, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<RecommendationDetailResponse>>(`/api/recommendations/${recommendationId}`, {
    headers: await getAuthorizationHeaders(),
    signal,
  });

  return response.data;
}

export async function getUserChannelSettings(signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ settings: UserChannelSettings | null }>>("/api/user/channel-settings", {
    headers: await getAuthorizationHeaders(),
    signal,
  });

  return response.data.settings;
}

export async function updateUserChannelSettings(payload: RecommendContentPayload, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ settings: UserChannelSettings }>>("/api/user/channel-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: await getAuthorizationHeaders(),
    signal,
  });

  return response.data.settings;
}

export async function deleteAccount(signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ deleted: true }>>("/api/account", {
    method: "DELETE",
    headers: await getAuthorizationHeaders(),
    signal,
  });

  return response.data;
}

export async function getFavorites(params: { type?: FavoriteType; targetId?: string } = {}, signal?: AbortSignal) {
  const query = new URLSearchParams();
  if (params.type) {
    query.set("type", params.type);
  }
  if (params.targetId) {
    query.set("targetId", params.targetId);
  }

  const path = query.size > 0 ? `/api/favorites?${query.toString()}` : "/api/favorites";
  const response = await apiFetch<ApiSuccess<{ items: FavoriteItem[] }>>(path, {
    headers: await getAuthorizationHeaders(),
    signal,
  });

  return response.data.items;
}

export async function addFavorite(payload: FavoritePayload, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ favorite: FavoriteItem }>>("/api/favorites", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: await getAuthorizationHeaders(),
    signal,
  });

  return response.data.favorite;
}

export async function deleteFavorite(favoriteId: string, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ deleted: true }>>(`/api/favorites/${favoriteId}`, {
    method: "DELETE",
    headers: await getAuthorizationHeaders(),
    signal,
  });

  return response.data;
}

export async function updateFavorite(favoriteId: string, payload: Partial<FavoritePayload>, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ favorite: FavoriteItem }>>(`/api/favorites/${favoriteId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: await getAuthorizationHeaders(),
    signal,
  });

  return response.data.favorite;
}

export async function deleteFavoriteByTarget(type: FavoriteType, targetId: string, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ deleted: true }>>(
    `/api/favorites/by-target/${type}/${encodeURIComponent(targetId)}`,
    {
      method: "DELETE",
      headers: await getAuthorizationHeaders(),
      signal,
    },
  );

  return response.data;
}

export async function getCalendarEvents(params: { start?: string; end?: string } = {}, signal?: AbortSignal) {
  const query = new URLSearchParams();
  if (params.start) {
    query.set("start", params.start);
  }
  if (params.end) {
    query.set("end", params.end);
  }
  const path = query.size > 0 ? `/api/calendar/events?${query.toString()}` : "/api/calendar/events";
  const response = await apiFetch<ApiSuccess<{ events: CalendarEvent[] }>>(path, {
    headers: await getAuthorizationHeaders(),
    signal,
  });
  return response.data.events;
}

export async function createCalendarEvent(payload: CalendarEventPayload, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ event: CalendarEvent }>>("/api/calendar/events", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: await getAuthorizationHeaders(),
    signal,
  });
  return response.data.event;
}

export async function updateCalendarEvent(eventId: string, payload: Partial<CalendarEventPayload>, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ event: CalendarEvent }>>(`/api/calendar/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: await getAuthorizationHeaders(),
    signal,
  });
  return response.data.event;
}

export async function deleteCalendarEvent(eventId: string, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ deleted: true }>>(`/api/calendar/events/${eventId}`, {
    method: "DELETE",
    headers: await getAuthorizationHeaders(),
    signal,
  });
  return response.data;
}

export async function getGrowthReport(signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<GrowthReportResponse>>("/api/growth-report", {
    headers: await getAuthorizationHeaders(),
    signal,
  });
  return response.data;
}

export async function refreshGrowthReport(signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<GrowthReportResponse>>("/api/growth-report/refresh", {
    method: "POST",
    headers: await getAuthorizationHeaders(),
    signal,
  });
  return response.data;
}

export async function getShopProducts(
  params: { category?: string; query?: string; limit?: number; refresh?: boolean } = {},
  signal?: AbortSignal,
) {
  const query = new URLSearchParams();
  if (params.category) {
    query.set("category", params.category);
  }
  if (params.query?.trim()) {
    query.set("query", params.query.trim());
  }
  if (params.limit) {
    query.set("limit", String(params.limit));
  }
  if (params.refresh) {
    query.set("refresh", "true");
  }
  const path = query.size > 0 ? `/api/shop/products?${query.toString()}` : "/api/shop/products";
  const response = await apiFetch<ApiSuccess<ShopProductsResponse>>(path, { signal });
  return response.data;
}

export async function analyzeChannel(payload: AnalyzeChannelPayload, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<ChannelAnalysisResult>>("/api/analyze-channel", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });

  return response.data;
}

export async function getPopularVideos(signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<PopularVideosResponse>>("/api/trends/popular-videos", {
    signal,
  });

  return response.data;
}

export async function getTrendKeywords(range: TrendKeywordRange, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<TrendKeywordsResponse>>(`/api/trends/keywords?range=${range}`, {
    signal,
  });

  return response.data;
}

export async function getNaverTrendKeywords(category: string, range: TrendKeywordRange, signal?: AbortSignal) {
  const query = new URLSearchParams({ category, range });
  const response = await apiFetch<ApiSuccess<NaverTrendKeywordsResponse>>(`/api/trends/naver-keywords?${query.toString()}`, {
    signal,
  });

  return response.data;
}

export async function getCombinedTrends(category: string, range: TrendKeywordRange, signal?: AbortSignal) {
  const query = new URLSearchParams({ category, range });
  const response = await apiFetch<ApiSuccess<CombinedTrendsResponse>>(`/api/trends/combined?${query.toString()}`, {
    signal,
  });

  return response.data;
}
