import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  filterVideosPublishedWithin24Hours,
  getChannelByUrlOrHandle,
  getRecentUploadVideoIds,
  getUploadsPlaylistId,
  getVideoDetails,
} from "@/lib/server/youtube";
import type { YouTubeThumbnail, YouTubeVideoAnalysis } from "@/types/content-recommendation";

const DAILY_COLLECTION_JOB_NAME = "collect-daily-videos";
const DAILY_COLLECTION_SCHEDULE_TEXT = "Every day 06:00 KST";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type CreatorCategoryRow = {
  id: string;
  name: string;
};

type InfluencerChannelRow = {
  id: string;
  category_id: string;
  youtube_channel_id: string | null;
  channel_url: string | null;
  channel_title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  is_active: boolean | null;
};

export type DailyCollectionError = {
  category: string | null;
  channelId: string | null;
  channelUrl: string | null;
  message: string;
};

export type DailyCollectionSummary = {
  ok: true;
  scheduledTime: typeof DAILY_COLLECTION_SCHEDULE_TEXT;
  collectedAt: string;
  windowStart: string;
  windowEnd: string;
  categoriesChecked: number;
  channelsChecked: number;
  videosFoundLast24h: number;
  videosUpserted: number;
  errors: DailyCollectionError[];
};

export type InfluencerVideoUpsertRow = {
  category_id: string;
  influencer_channel_id: string;
  youtube_channel_id: string;
  youtube_video_id: string;
  published_at: string;
  title: string;
  description: string;
  thumbnails: Record<string, YouTubeThumbnail>;
  tags: string[];
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  raw: Record<string, unknown>;
  collected_at: string;
};

type CollectionLogStatus = "running" | "success" | "partial_success" | "failed";

function toSupabaseMessage(error: { message?: string; code?: string }) {
  const code = error.code ? ` Supabase code: ${error.code}.` : "";
  return `${error.message ?? "Supabase request failed."}${code}`;
}

function getChannelInput(channel: InfluencerChannelRow) {
  return channel.youtube_channel_id ?? channel.channel_url ?? "";
}

function toError(
  channel: InfluencerChannelRow,
  categoryNameById: Map<string, string>,
  error: unknown,
): DailyCollectionError {
  return {
    category: categoryNameById.get(channel.category_id) ?? null,
    channelId: channel.youtube_channel_id,
    channelUrl: channel.channel_url,
    message: error instanceof Error ? error.message : "Unknown YouTube collection error.",
  };
}

function toVideoRows(input: {
  channel: InfluencerChannelRow;
  youtubeChannelId: string;
  videos: YouTubeVideoAnalysis[];
  collectedAt: string;
}): InfluencerVideoUpsertRow[] {
  return input.videos.map((video) => ({
    category_id: input.channel.category_id,
    influencer_channel_id: input.channel.id,
    youtube_channel_id: input.youtubeChannelId,
    youtube_video_id: video.youtubeVideoId,
    published_at: video.publishedAt,
    title: video.title,
    description: video.description,
    thumbnails: video.thumbnails,
    tags: video.tags,
    view_count: video.viewCount,
    like_count: video.likeCount,
    comment_count: video.commentCount,
    raw: video.raw,
    collected_at: input.collectedAt,
  }));
}

async function loadCreatorCategories() {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase.from("creator_categories").select("id,name").returns<CreatorCategoryRow[]>();

  if (error) {
    throw new Error(`Failed to load creator categories. ${toSupabaseMessage(error)}`);
  }

  return data ?? [];
}

async function loadActiveInfluencerChannels() {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("influencer_channels")
    .select("id,category_id,youtube_channel_id,channel_url,channel_title,description,thumbnail_url,is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .returns<InfluencerChannelRow[]>();

  if (error) {
    throw new Error(`Failed to load influencer channels. ${toSupabaseMessage(error)}`);
  }

  return data ?? [];
}

async function updateInfluencerChannelMetadata(
  channel: InfluencerChannelRow,
  resolved: Awaited<ReturnType<typeof getChannelByUrlOrHandle>>,
) {
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("influencer_channels")
    .update({
      youtube_channel_id: resolved.youtubeChannelId,
      channel_title: resolved.channelTitle,
      channel_url: channel.channel_url ?? resolved.channelUrl,
      description: resolved.description,
      thumbnail_url: resolved.thumbnailUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", channel.id);

  if (error) {
    throw new Error(`Failed to update influencer channel metadata. ${toSupabaseMessage(error)}`);
  }
}

export async function upsertInfluencerVideo(rows: InfluencerVideoUpsertRow | InfluencerVideoUpsertRow[]) {
  const normalizedRows = Array.isArray(rows) ? rows : [rows];

  if (normalizedRows.length === 0) {
    return 0;
  }

  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase.from("influencer_videos").upsert(normalizedRows, {
    onConflict: "youtube_video_id",
  });

  if (error) {
    throw new Error(`Failed to upsert influencer videos. ${toSupabaseMessage(error)}`);
  }

  return normalizedRows.length;
}

async function startCollectionLog(startedAt: string) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("collection_logs")
      .insert({
        job_name: DAILY_COLLECTION_JOB_NAME,
        started_at: startedAt,
        status: "running" satisfies CollectionLogStatus,
        summary: {},
      })
      .select("id")
      .single<{ id: string }>();

    if (error) {
      return null;
    }

    return data?.id ?? null;
  } catch {
    return null;
  }
}

async function finishCollectionLog(input: {
  logId: string | null;
  finishedAt: string;
  status: CollectionLogStatus;
  summary: Record<string, unknown>;
  errorMessage?: string | null;
}) {
  if (!input.logId) {
    return;
  }

  try {
    await getSupabaseServiceRoleClient()
      .from("collection_logs")
      .update({
        finished_at: input.finishedAt,
        status: input.status,
        summary: input.summary,
        error_message: input.errorMessage ?? null,
      })
      .eq("id", input.logId);
  } catch {
    // Collection must not fail only because logging failed.
  }
}

export async function collectDailyInfluencerVideos(now = new Date()): Promise<DailyCollectionSummary> {
  const startedAt = now.toISOString();
  const logId = await startCollectionLog(startedAt);
  const windowStart = new Date(now.getTime() - ONE_DAY_MS);

  try {
    const categories = await loadCreatorCategories();
    const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
    const channels = await loadActiveInfluencerChannels();
    const errors: DailyCollectionError[] = [];
    let videosFoundLast24h = 0;
    let videosUpserted = 0;

    for (const channel of channels) {
      try {
        const channelInput = getChannelInput(channel);

        if (!channelInput) {
          throw new Error("Influencer channel is missing both youtube_channel_id and channel_url.");
        }

        const resolvedChannel = await getChannelByUrlOrHandle(channelInput);
        await updateInfluencerChannelMetadata(channel, resolvedChannel);

        const uploadVideoIds = await getRecentUploadVideoIds(getUploadsPlaylistId(resolvedChannel), {
          maxResults: 50,
          publishedAfter: windowStart,
        });
        const videos = filterVideosPublishedWithin24Hours(await getVideoDetails(uploadVideoIds), now);

        videosFoundLast24h += videos.length;

        if (videos.length === 0) {
          continue;
        }

        videosUpserted += await upsertInfluencerVideo(
          toVideoRows({
            channel,
            youtubeChannelId: resolvedChannel.youtubeChannelId,
            videos,
            collectedAt: startedAt,
          }),
        );
      } catch (error) {
        errors.push(toError(channel, categoryNameById, error));
      }
    }

    const summary: DailyCollectionSummary = {
      ok: true,
      scheduledTime: DAILY_COLLECTION_SCHEDULE_TEXT,
      collectedAt: startedAt,
      windowStart: windowStart.toISOString(),
      windowEnd: startedAt,
      categoriesChecked: categories.length,
      channelsChecked: channels.length,
      videosFoundLast24h,
      videosUpserted,
      errors,
    };

    await finishCollectionLog({
      logId,
      finishedAt: new Date().toISOString(),
      status: errors.length > 0 ? "partial_success" : "success",
      summary,
      errorMessage: errors.length > 0 ? `${errors.length} channel(s) failed.` : null,
    });

    return summary;
  } catch (error) {
    await finishCollectionLog({
      logId,
      finishedAt: new Date().toISOString(),
      status: "failed",
      summary: {},
      errorMessage: error instanceof Error ? error.message : "Daily YouTube collection failed.",
    });

    throw error;
  }
}
