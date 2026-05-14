// Compatibility exports. Browser API calls must go through the Render backend base URL.
export {
  ApiClientError,
  analyzeChannel,
  apiFetch,
  getApiBaseUrl,
  getApiUrl,
  getPopularVideos,
  getTrendKeywords,
  recommendContent,
} from "@/lib/client/api";
export type {
  AnalyzeChannelPayload,
  ApiFailure,
  ApiSuccess,
  RecommendContentPayload,
} from "@/lib/client/api";
