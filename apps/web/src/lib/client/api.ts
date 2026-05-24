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
import type { ProductionBoardChecklistItem, ProductionBoardItem, ProductionBoardStatus } from "@/types/production-board";
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
  videoAnalysisId?: string | null;
};

export type RecommendationQueueStatus = {
  state: "idle" | "queued" | "processing" | string;
  position: number | null;
  pendingCount: number;
  isProcessing: boolean;
};

export type VideoAnalysisSegment = {
  start?: number | null;
  end?: number | null;
  text: string;
};

export type VideoAnalysisRecord = {
  id: string;
  userId?: string | null;
  videoUrl?: string | null;
  transcript: string;
  transcriptSegments: VideoAnalysisSegment[];
  sceneSummary?: string | null;
  storyboardResult?: Record<string, unknown> | null;
  analysisResult?: Record<string, unknown> | null;
  createdAt?: string | null;
};

export type TranscribeVideoResponse = {
  analysis: VideoAnalysisRecord;
};

export type GenerateVideoStoryboardPayload = {
  videoAnalysisId: string;
  channelUrl?: string | null;
  category?: string | null;
};

export type GenerateVideoStoryboardResponse = {
  analysis: VideoAnalysisRecord;
  storyboard: Record<string, unknown>;
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

export type CalendarEventStatus = "planned" | "scripted" | "filmed" | "edited" | "uploaded" | "filming" | "editing" | "scheduled";

export type HolidayCategory = "public_holiday" | "observance" | "special_date";

export type Holiday = {
  id: string;
  date: string;
  name: string;
  category: HolidayCategory;
  description: string | null;
  is_active: boolean;
};

export type CalendarEvent = {
  id: string;
  userId: string;
  favoriteId: string | null;
  productionItemId?: string | null;
  title: string;
  description: string | null;
  scheduledDate: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  status: CalendarEventStatus;
  color: string | null;
  platform: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEventPayload = {
  favoriteId?: string | null;
  productionItemId?: string | null;
  title: string;
  description?: string | null;
  scheduledDate?: string;
  startDate?: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: CalendarEventStatus;
  color?: string | null;
  platform?: string;
  metadata?: Record<string, unknown>;
};

export type AddProductionBoardItemPayload = {
  favoriteId?: string;
  recommendationId?: string;
};

export type ProductionItemPayload = {
  favoriteId?: string | null;
  recommendationId?: string | null;
  title?: string;
  description?: string | null;
  memo?: string | null;
  hashtags?: string[];
  storyboard?: unknown;
  status?: ProductionBoardStatus;
  shootStartDate?: string | null;
  shootEndDate?: string | null;
  metadata?: Record<string, unknown>;
};

export type GrowthVideoStat = {
  youtubeVideoId: string;
  youtubeChannelId?: string | null;
  title: string;
  thumbnailUrl?: string | null;
  publishedAt: string | null;
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

export type GrowthVideoTrendPoint = GrowthVideoStat & {
  collectedAt: string;
  createdAt?: string | null;
};

export type GrowthVideoReportResponse = {
  video: GrowthVideoTrendPoint | null;
  trend: GrowthVideoTrendPoint[];
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
  equipmentCategory: string;
  searchKeyword: string;
  popularityScore: number;
  recommendedLevel: string | null;
  collectedAt: string | null;
};

export type ShopSectionInfo = {
  equipmentCategory: string;
  keywords: string[];
};

export type ShopSection = {
  equipmentCategory: string;
  items: ShopProduct[];
  error: string | null;
  isFallback: boolean;
};

export type ShopSectionsResponse = {
  sections: ShopSection[];
};

export type ShopSet = {
  level: string;
  title: string;
  description: string | null;
  items: string[];
  products: ShopProduct[];
};

export type ShopSetsResponse = {
  sets: ShopSet[];
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

  let response: Response;
  try {
    response = await fetch(getApiUrl(path), {
      ...options,
      credentials: options.credentials ?? "include",
      headers,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiClientError("Backend API에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", undefined, "NETWORK_ERROR");
  }

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

export async function getRecommendationQueueStatus(signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<RecommendationQueueStatus>>("/api/recommend-content/queue-status", {
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

export async function transcribeVideo(input: { videoUrl?: string; youtubeVideoId?: string }, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<TranscribeVideoResponse>>("/api/video-analysis/transcribe", {
    method: "POST",
    body: JSON.stringify(input),
    headers: await getAuthorizationHeaders(),
    signal,
  });

  return response.data;
}

export async function generateVideoStoryboard(payload: GenerateVideoStoryboardPayload, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<GenerateVideoStoryboardResponse>>("/api/video-analysis/generate-storyboard", {
    method: "POST",
    body: JSON.stringify(payload),
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

export async function getProductionBoardItems(signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ items: ProductionBoardItem[] }>>("/api/production-board/items", {
    headers: await getAuthorizationHeaders(),
    signal,
  });

  return response.data.items;
}

export async function addFavoriteToProductionBoard(payload: AddProductionBoardItemPayload, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ item: ProductionBoardItem }>>("/api/production-board/items", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: await getAuthorizationHeaders(),
    signal,
  });

  return response.data.item;
}

export async function createProductionItem(payload: ProductionItemPayload, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ item: ProductionBoardItem }>>("/api/production-items", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: await getAuthorizationHeaders(),
    signal,
  });

  return response.data.item;
}

export async function updateProductionItem(itemId: string, payload: ProductionItemPayload, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ item: ProductionBoardItem }>>(`/api/production-items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: await getAuthorizationHeaders(),
    signal,
  });

  return response.data.item;
}

export async function updateProductionBoardItemStatus(
  itemId: string,
  status: ProductionBoardStatus,
  signal?: AbortSignal,
) {
  const response = await apiFetch<ApiSuccess<{ item: ProductionBoardItem }>>(
    `/api/production-board/items/${itemId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
      headers: await getAuthorizationHeaders(),
      signal,
    },
  );

  return response.data.item;
}

export async function updateProductionBoardItemMemo(itemId: string, memo: string, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ item: ProductionBoardItem }>>(
    `/api/production-board/items/${itemId}/memo`,
    {
      method: "PATCH",
      body: JSON.stringify({ memo }),
      headers: await getAuthorizationHeaders(),
      signal,
    },
  );

  return response.data.item;
}

export async function getProductionBoardChecklist(boardItemId: string, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ items: ProductionBoardChecklistItem[] }>>(
    `/api/production-board/items/${boardItemId}/checklist`,
    {
      headers: await getAuthorizationHeaders(),
      signal,
    },
  );

  return response.data.items;
}

export async function createProductionBoardChecklistItem(boardItemId: string, text: string, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ item: ProductionBoardChecklistItem }>>(
    `/api/production-board/items/${boardItemId}/checklist`,
    {
      method: "POST",
      body: JSON.stringify({ text }),
      headers: await getAuthorizationHeaders(),
      signal,
    },
  );

  return response.data.item;
}

export async function updateProductionBoardChecklistItem(
  checklistItemId: string,
  payload: { text?: string; isDone?: boolean },
  signal?: AbortSignal,
) {
  const response = await apiFetch<ApiSuccess<{ item: ProductionBoardChecklistItem }>>(
    `/api/production-board/checklist/${checklistItemId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: await getAuthorizationHeaders(),
      signal,
    },
  );

  return response.data.item;
}

export async function deleteProductionBoardChecklistItem(checklistItemId: string, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ deleted: true }>>(
    `/api/production-board/checklist/${checklistItemId}`,
    {
      method: "DELETE",
      headers: await getAuthorizationHeaders(),
      signal,
    },
  );

  return response.data;
}

export async function deleteProductionBoardItem(itemId: string, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ deleted: true }>>(`/api/production-board/items/${itemId}`, {
    method: "DELETE",
    headers: await getAuthorizationHeaders(),
    signal,
  });

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

export async function getHolidays(params: { start?: string; end?: string; category?: string } = {}, signal?: AbortSignal) {
  const query = new URLSearchParams();
  if (params.start) {
    query.set("start", params.start);
  }
  if (params.end) {
    query.set("end", params.end);
  }
  if (params.category) {
    query.set("category", params.category);
  }
  const path = query.size > 0 ? `/api/calendar/holidays?${query.toString()}` : "/api/calendar/holidays";
  const response = await apiFetch<ApiSuccess<{ holidays: Holiday[]; total_count: number }>>(path, {
    signal,
  });
  return response.data.holidays;
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

export async function getGrowthVideoReport(youtubeVideoId: string, signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<GrowthVideoReportResponse>>(
    `/api/growth-report/videos/${encodeURIComponent(youtubeVideoId)}`,
    {
      headers: await getAuthorizationHeaders(),
      signal,
    },
  );
  return response.data;
}

export async function getShopSections(signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<{ sections: ShopSectionInfo[] }>>("/api/shop/sections", { signal });
  return response.data.sections;
}

export async function getShopProducts(
  params: { equipmentCategory?: string; limit?: number; sort?: string; level?: string } = {},
  signal?: AbortSignal,
) {
  const query = new URLSearchParams();
  if (params.equipmentCategory) {
    query.set("equipmentCategory", params.equipmentCategory);
  }
  if (params.limit) {
    query.set("limit", String(params.limit));
  }
  if (params.sort) {
    query.set("sort", params.sort);
  }
  if (params.level) {
    query.set("level", params.level);
  }
  const path = query.size > 0 ? `/api/shop/products?${query.toString()}` : "/api/shop/products";
  const response = await apiFetch<ApiSuccess<ShopSectionsResponse>>(path, { signal });
  return response.data;
}

export async function getShopSets(signal?: AbortSignal) {
  const response = await apiFetch<ApiSuccess<ShopSetsResponse>>("/api/shop/sets", { signal });
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
