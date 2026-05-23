import { apiFetch } from "@/lib/client/api";
import type {
  AdminAnalysis,
  AdminCategory,
  AdminCollectionLog,
  AdminCollectionSummary,
  AdminInfluencerChannel,
  AdminNaverCollectionLog,
  AdminNaverCollectionSummary,
  AdminNaverKeywordGroup,
  AdminOverview,
  AdminPromptTemplate,
  AdminRecommendation,
  AdminRecommendationOption,
  AdminSystemStatus,
  AdminTestResult,
  AdminVideo,
} from "@/types/admin";

const ADMIN_SECRET_STORAGE_KEY = "be-celeb-admin-secret";

type AdminListParams = {
  categoryId?: string;
  channelId?: string;
  search?: string;
  isActive?: boolean;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
  limit?: number;
  offset?: number;
};

type AdminCreateChannelPayload = {
  categoryId?: string;
  categoryIds?: string[];
  channelUrl: string;
  youtubeChannelId?: string | null;
  channelTitle?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  isActive?: boolean;
};

type AdminUpdateChannelPayload = Partial<AdminCreateChannelPayload>;

export type AdminNaverKeywordGroupPayload = {
  categoryId?: string | null;
  categoryName: string;
  title: string;
  keywords: string[];
  isActive?: boolean;
};

export type AdminNaverKeywordGroupUpdatePayload = Partial<AdminNaverKeywordGroupPayload>;

type AdminApiResponse<T> = {
  success: true;
  data: T;
};

function getStoredAdminSecret() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(ADMIN_SECRET_STORAGE_KEY);
}

export function hasStoredAdminSecret() {
  return Boolean(getStoredAdminSecret());
}

export function storeAdminSecret(secret: string) {
  window.sessionStorage.setItem(ADMIN_SECRET_STORAGE_KEY, secret);
}

export function clearAdminSecret() {
  window.sessionStorage.removeItem(ADMIN_SECRET_STORAGE_KEY);
}

function toQuery(params?: AdminListParams) {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function adminApiFetch<T>(path: string, options: RequestInit = {}) {
  const secret = getStoredAdminSecret();

  if (!secret) {
    throw new Error("Admin secret is required.");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${secret}`);

  return apiFetch<T>(path, {
    ...options,
    headers,
  });
}

async function adminData<T>(path: string, options?: RequestInit) {
  const response = await adminApiFetch<AdminApiResponse<T>>(path, options);
  return response.data;
}

export function getOverview() {
  return adminData<AdminOverview>("/api/admin/overview");
}

export function listCategories() {
  return adminData<{ categories: AdminCategory[] }>("/api/admin/categories");
}

export function createCategory(name: string) {
  return adminData<{ category: unknown }>("/api/admin/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function updateCategory(categoryId: string, name: string) {
  return adminData<{ category: unknown }>(`/api/admin/categories/${categoryId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function deleteCategory(categoryId: string) {
  return adminData<{ deleted: number }>(`/api/admin/categories/${categoryId}`, {
    method: "DELETE",
  });
}

export function listInfluencerChannels(params?: AdminListParams) {
  return adminData<{ channels: AdminInfluencerChannel[]; limit: number; offset: number }>(
    `/api/admin/influencer-channels${toQuery(params)}`,
  );
}

export function createInfluencerChannel(payload: AdminCreateChannelPayload) {
  return adminData<{ channel: unknown }>("/api/admin/influencer-channels", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateInfluencerChannel(channelId: string, payload: AdminUpdateChannelPayload) {
  return adminData<{ channel: unknown }>(`/api/admin/influencer-channels/${channelId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteInfluencerChannel(channelId: string) {
  return adminData<{ deleted: number }>(`/api/admin/influencer-channels/${channelId}`, {
    method: "DELETE",
  });
}

export function syncInfluencerChannel(channelId: string) {
  return adminData<{ channel: unknown }>(`/api/admin/influencer-channels/${channelId}/sync`, {
    method: "POST",
  });
}

export function listVideos(params?: AdminListParams) {
  return adminData<{ videos: AdminVideo[]; limit: number; offset: number }>(`/api/admin/videos${toQuery(params)}`);
}

export function updateVideo(videoId: string, payload: { title?: string; description?: string; tags?: string[]; categoryIds?: string[] }) {
  return adminData<{ video: unknown }>(`/api/admin/videos/${videoId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteVideo(videoId: string) {
  return adminData<{ deleted: number }>(`/api/admin/videos/${videoId}`, {
    method: "DELETE",
  });
}

export function collectNow() {
  return adminData<AdminCollectionSummary>("/api/admin/collect-now", {
    method: "POST",
  });
}

export function listCollectionLogs(params?: AdminListParams) {
  return adminData<{ logs: AdminCollectionLog[]; limit: number; offset: number }>(
    `/api/admin/collection-logs${toQuery(params)}`,
  );
}

export function listNaverKeywordGroups(params?: Pick<AdminListParams, "categoryId" | "isActive"> & { category?: string }) {
  return adminData<{ groups: AdminNaverKeywordGroup[] }>(`/api/admin/naver-keyword-groups${toQuery(params)}`);
}

export function createNaverKeywordGroup(payload: AdminNaverKeywordGroupPayload) {
  return adminData<{ group: AdminNaverKeywordGroup }>("/api/admin/naver-keyword-groups", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateNaverKeywordGroup(groupId: string, payload: AdminNaverKeywordGroupUpdatePayload) {
  return adminData<{ group: AdminNaverKeywordGroup }>(`/api/admin/naver-keyword-groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteNaverKeywordGroup(groupId: string) {
  return adminData<{ deleted: number }>(`/api/admin/naver-keyword-groups/${groupId}`, {
    method: "DELETE",
  });
}

export function collectNaverTrendsNow() {
  return adminData<AdminNaverCollectionSummary>("/api/admin/collect-naver-trends", {
    method: "POST",
  });
}

export function listNaverCollectionLogs(params?: Pick<AdminListParams, "limit" | "offset">) {
  return adminData<{ logs: AdminNaverCollectionLog[]; limit: number; offset: number }>(
    `/api/admin/naver-collection-logs${toQuery(params)}`,
  );
}

export function listAnalyses(params?: AdminListParams) {
  return adminData<{ analyses: AdminAnalysis[]; limit: number; offset: number }>(`/api/admin/analyses${toQuery(params)}`);
}

export function listRecommendations(params?: AdminListParams) {
  return adminData<{
    contentRecommendations: AdminRecommendation[];
    recommendationOptions: AdminRecommendationOption[];
    limit: number;
    offset: number;
  }>(`/api/admin/recommendations${toQuery(params)}`);
}

export function deleteRecommendation(recommendationId: string) {
  return adminData<{ deleted: number }>(`/api/admin/recommendations/${recommendationId}`, {
    method: "DELETE",
  });
}

export function getSystemStatus() {
  return adminData<AdminSystemStatus>("/api/admin/system-status");
}

export function listLLMPrompts() {
  return adminData<{ prompts: AdminPromptTemplate[] }>("/api/admin/llm-prompts");
}

export function createLLMPrompt(payload: Omit<AdminPromptTemplate, "id" | "createdAt" | "updatedAt">) {
  return adminData<{ prompt: AdminPromptTemplate }>("/api/admin/llm-prompts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateLLMPrompt(promptId: string, payload: Partial<Omit<AdminPromptTemplate, "id" | "createdAt" | "updatedAt">>) {
  return adminData<{ prompt: AdminPromptTemplate }>(`/api/admin/llm-prompts/${promptId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteLLMPrompt(promptId: string) {
  return adminData<{ deleted: number }>(`/api/admin/llm-prompts/${promptId}`, {
    method: "DELETE",
  });
}

export function activateLLMPrompt(promptId: string) {
  return adminData<{ prompt: AdminPromptTemplate }>(`/api/admin/llm-prompts/${promptId}/activate`, {
    method: "POST",
  });
}

export function testYouTube() {
  return adminData<AdminTestResult>("/api/admin/test-youtube", {
    method: "POST",
  });
}

export function testLLM() {
  return adminData<AdminTestResult>("/api/admin/test-llm", {
    method: "POST",
  });
}

export function testShop() {
  return adminData<AdminTestResult>("/api/admin/test-shop", {
    method: "POST",
  });
}

export function deleteVideosByCategory(categoryId: string, confirm: string) {
  return adminData<{ deleted: number }>("/api/admin/danger/delete-videos-by-category", {
    method: "POST",
    body: JSON.stringify({ categoryId, confirm }),
  });
}

export function deleteAllVideos(confirm: string) {
  return adminData<{ deleted: number }>("/api/admin/danger/delete-all-videos", {
    method: "POST",
    body: JSON.stringify({ confirm }),
  });
}

export function deleteAllCollectionLogs(confirm: string) {
  return adminData<{ deleted: number }>("/api/admin/danger/delete-all-collection-logs", {
    method: "POST",
    body: JSON.stringify({ confirm }),
  });
}

export function deleteInactiveChannels(confirm: string) {
  return adminData<{ deleted: number }>("/api/admin/danger/delete-inactive-channels", {
    method: "POST",
    body: JSON.stringify({ confirm }),
  });
}
