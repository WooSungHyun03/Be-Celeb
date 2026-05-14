import { getYouTubeEnv } from "@/lib/config/env";
import type { YouTubeChannelAnalysis, YouTubeThumbnail, YouTubeVideoAnalysis } from "@/types/content-recommendation";

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";

type YouTubeListResponse<T> = {
  items?: T[];
  nextPageToken?: string;
  error?: {
    message?: string;
    code?: number;
  };
};

type YouTubeChannelItem = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    thumbnails?: Record<string, YouTubeThumbnail>;
  };
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string;
    };
  };
  statistics?: {
    subscriberCount?: string;
    videoCount?: string;
    viewCount?: string;
    hiddenSubscriberCount?: boolean;
  };
};

type YouTubePlaylistItem = {
  snippet?: {
    resourceId?: {
      videoId?: string;
    };
  };
  contentDetails?: {
    videoId?: string;
    videoPublishedAt?: string;
  };
};

type YouTubeVideoItem = {
  id?: string;
  snippet?: {
    channelId?: string;
    publishedAt?: string;
    title?: string;
    description?: string;
    thumbnails?: Record<string, YouTubeThumbnail>;
    tags?: string[];
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
};

export type YouTubeChannelLocator =
  | { type: "id"; value: string }
  | { type: "handle"; value: string }
  | { type: "username"; value: string }
  | { type: "search"; value: string };

export class YouTubeApiError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

function parseNumber(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getBestThumbnailUrl(thumbnails: Record<string, YouTubeThumbnail> | undefined) {
  return thumbnails?.maxres?.url ?? thumbnails?.high?.url ?? thumbnails?.medium?.url ?? thumbnails?.default?.url ?? null;
}

function normalizeChannelUrl(input: string) {
  const trimmed = input.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("@")) {
    return `https://www.youtube.com/${trimmed}`;
  }

  if (/^UC[\w-]{20,}$/i.test(trimmed)) {
    return `https://www.youtube.com/channel/${trimmed}`;
  }

  return `https://${trimmed}`;
}

export function parseYouTubeChannelLocator(channelUrl: string): YouTubeChannelLocator {
  const trimmed = channelUrl.trim();

  if (!trimmed) {
    throw new YouTubeApiError("YouTube channel URL is required.", 400);
  }

  if (trimmed.startsWith("@")) {
    return { type: "handle", value: trimmed };
  }

  if (/^UC[\w-]{20,}$/i.test(trimmed)) {
    return { type: "id", value: trimmed };
  }

  try {
    const url = new URL(normalizeChannelUrl(trimmed));
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

    if (!hostname.includes("youtube.com")) {
      return { type: "search", value: trimmed };
    }

    const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    const [first, second] = segments;

    if (!first) {
      return { type: "search", value: trimmed };
    }

    if (first === "channel" && second) {
      return { type: "id", value: second };
    }

    if (first.startsWith("@")) {
      return { type: "handle", value: first };
    }

    if (first === "user" && second) {
      return { type: "username", value: second };
    }

    if (first === "c" && second) {
      return { type: "search", value: second };
    }

    return { type: "search", value: first };
  } catch {
    return { type: "search", value: trimmed };
  }
}

export function parseYouTubeChannelUrl(channelUrl: string) {
  return parseYouTubeChannelLocator(channelUrl);
}

async function youtubeFetch<T>(path: string, params: Record<string, string | number | undefined>) {
  const { apiKey } = getYouTubeEnv();
  const url = new URL(`${YOUTUBE_API_BASE_URL}/${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as YouTubeListResponse<T> | null;

  if (!response.ok) {
    const message = payload?.error?.message ?? `YouTube API request failed with status ${response.status}.`;
    throw new YouTubeApiError(message, response.status >= 500 ? 502 : response.status);
  }

  return payload ?? {};
}

function normalizeChannel(item: YouTubeChannelItem): YouTubeChannelAnalysis {
  const channelId = item.id;
  const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads;

  if (!channelId || !uploadsPlaylistId) {
    throw new YouTubeApiError("YouTube channel response did not include an uploads playlist.", 502);
  }

  const thumbnails = item.snippet?.thumbnails ?? {};

  return {
    youtubeChannelId: channelId,
    channelTitle: item.snippet?.title ?? "Untitled channel",
    channelUrl: `https://www.youtube.com/channel/${channelId}`,
    description: item.snippet?.description ?? "",
    thumbnailUrl: getBestThumbnailUrl(thumbnails),
    subscriberCount: item.statistics?.hiddenSubscriberCount ? null : parseNumber(item.statistics?.subscriberCount),
    videoCount: parseNumber(item.statistics?.videoCount),
    viewCount: parseNumber(item.statistics?.viewCount),
    uploadsPlaylistId,
    raw: item as Record<string, unknown>,
  };
}

async function getChannelByParams(params: Record<string, string>) {
  const response = await youtubeFetch<YouTubeChannelItem>("channels", {
    part: "snippet,contentDetails,statistics",
    maxResults: 1,
    ...params,
  });

  return response.items?.[0] ? normalizeChannel(response.items[0]) : null;
}

async function searchChannel(query: string) {
  const response = await youtubeFetch<{ snippet?: { channelId?: string } }>("search", {
    part: "snippet",
    maxResults: 1,
    q: query,
    type: "channel",
  });
  const channelId = response.items?.[0]?.snippet?.channelId;

  return channelId ? getChannelByParams({ id: channelId }) : null;
}

export async function getYouTubeChannel(channelUrl: string): Promise<YouTubeChannelAnalysis> {
  const locator = parseYouTubeChannelLocator(channelUrl);

  if (locator.type === "id") {
    const channel = await getChannelByParams({ id: locator.value });
    if (channel) {
      return channel;
    }
  }

  if (locator.type === "handle") {
    const handle = locator.value.startsWith("@") ? locator.value : `@${locator.value}`;
    const channel = await getChannelByParams({ forHandle: handle });
    if (channel) {
      return channel;
    }
    const searchedChannel = await searchChannel(handle);
    if (searchedChannel) {
      return searchedChannel;
    }
  }

  if (locator.type === "username") {
    const channel = await getChannelByParams({ forUsername: locator.value });
    if (channel) {
      return channel;
    }
    const searchedChannel = await searchChannel(locator.value);
    if (searchedChannel) {
      return searchedChannel;
    }
  }

  const channel = await searchChannel(locator.value);

  if (!channel) {
    throw new YouTubeApiError("Could not find a YouTube channel from the provided URL.", 404);
  }

  return channel;
}

export async function getChannelByUrlOrHandle(channelUrl: string) {
  return getYouTubeChannel(channelUrl);
}

export function getUploadsPlaylistId(channel: YouTubeChannelAnalysis) {
  return channel.uploadsPlaylistId;
}

function normalizeVideo(item: YouTubeVideoItem): YouTubeVideoAnalysis | null {
  const videoId = item.id;
  const channelId = item.snippet?.channelId;
  const publishedAt = item.snippet?.publishedAt;

  if (!videoId || !channelId || !publishedAt) {
    return null;
  }

  return {
    youtubeVideoId: videoId,
    channelId,
    publishedAt,
    title: item.snippet?.title ?? "Untitled video",
    description: item.snippet?.description ?? "",
    thumbnails: item.snippet?.thumbnails ?? {},
    tags: item.snippet?.tags ?? [],
    viewCount: parseNumber(item.statistics?.viewCount),
    likeCount: parseNumber(item.statistics?.likeCount),
    commentCount: parseNumber(item.statistics?.commentCount),
    raw: item as Record<string, unknown>,
  };
}

export async function getVideoDetails(videoIds: string[]) {
  if (videoIds.length === 0) {
    return [];
  }

  const chunks: string[][] = [];

  for (let index = 0; index < videoIds.length; index += 50) {
    chunks.push(videoIds.slice(index, index + 50));
  }

  const responses = await Promise.all(
    chunks.map((chunk) =>
      youtubeFetch<YouTubeVideoItem>("videos", {
        part: "snippet,statistics",
        id: chunk.join(","),
        maxResults: chunk.length,
      }),
    ),
  );

  return responses
    .flatMap((response) => response.items ?? [])
    .map(normalizeVideo)
    .filter((video): video is YouTubeVideoAnalysis => Boolean(video));
}

async function getUploadVideoIds(uploadsPlaylistId: string, maxResults: number, publishedAfter?: Date) {
  const response = await youtubeFetch<YouTubePlaylistItem>("playlistItems", {
    part: "snippet,contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults: Math.min(Math.max(maxResults, 1), 50),
  });
  const publishedAfterTime = publishedAfter?.getTime();

  return (response.items ?? [])
    .filter((item) => {
      const publishedAt = item.contentDetails?.videoPublishedAt;

      if (!publishedAfterTime || !publishedAt) {
        return true;
      }

      return new Date(publishedAt).getTime() >= publishedAfterTime;
    })
    .map((item) => item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId)
    .filter((videoId): videoId is string => Boolean(videoId));
}

export async function getRecentUploadVideoIds(
  uploadsPlaylistId: string,
  options?: { maxResults?: number; publishedAfter?: Date },
) {
  return getUploadVideoIds(uploadsPlaylistId, options?.maxResults ?? 50, options?.publishedAfter);
}

export function filterVideosPublishedWithin24Hours(videos: YouTubeVideoAnalysis[], now = new Date()) {
  const nowTime = now.getTime();
  const sinceTime = nowTime - 24 * 60 * 60 * 1000;

  return videos.filter((video) => {
    const publishedAt = new Date(video.publishedAt).getTime();

    return Number.isFinite(publishedAt) && publishedAt >= sinceTime && publishedAt <= nowTime;
  });
}

export async function getRecentVideosForChannel(channel: YouTubeChannelAnalysis, options?: { maxResults?: number; publishedAfter?: Date }) {
  const videoIds = await getRecentUploadVideoIds(channel.uploadsPlaylistId, {
    maxResults: options?.maxResults ?? 12,
    publishedAfter: options?.publishedAfter,
  });
  const videos = await getVideoDetails(videoIds);
  const publishedAfter = options?.publishedAfter?.getTime();

  return videos
    .filter((video) => (publishedAfter ? new Date(video.publishedAt).getTime() >= publishedAfter : true))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export async function getRecentVideosForChannelId(channelId: string, options?: { maxResults?: number; publishedAfter?: Date }) {
  const channel = await getChannelByParams({ id: channelId });

  if (!channel) {
    throw new YouTubeApiError(`Could not find YouTube channel ${channelId}.`, 404);
  }

  return getRecentVideosForChannel(channel, options);
}

export async function analyzeYouTubeChannel(channelUrl: string) {
  const channel = await getYouTubeChannel(channelUrl);
  const recentVideos = await getRecentVideosForChannel(channel, { maxResults: 12 });

  return {
    channel,
    recentVideos,
  };
}
