import { apiError } from "@/app/api/_utils/api";
import {
  filterDuplicateInfluencerVideos,
  inferCreatorCategory,
  normalizeCreatorCategory,
} from "@/lib/categories";
import { MissingEnvironmentVariableError } from "@/lib/config/env";
import { createSupabaseServerClient, getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { generateContentRecommendations } from "@/lib/server/llm";
import { analyzeYouTubeChannel } from "@/lib/server/youtube";
import type {
  ChannelAnalysisResult,
  CreatorCategoryName,
  RecommendationApiResult,
  YouTubeThumbnail,
  YouTubeVideoAnalysis,
} from "@/types/content-recommendation";

type CreatorCategoryRow = {
  id: string;
  name: string;
};

type InfluencerVideoRow = {
  youtube_video_id: string;
  youtube_channel_id: string;
  published_at: string;
  title: string;
  description: string | null;
  thumbnails: Record<string, YouTubeThumbnail> | null;
  tags: string[] | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  raw: Record<string, unknown> | null;
};

type SaveRecommendationInput = {
  userId: string | null;
  channelUrl: string;
  analysis: ChannelAnalysisResult;
  selectedCategory: CreatorCategoryName;
  recommendation: RecommendationApiResult["recommendation"];
  inputPayload: Record<string, unknown>;
};

type SavedIds = {
  analysisId: string | null;
  recommendationId: string | null;
  error: string | null;
};

function toSupabaseMessage(error: { message?: string; code?: string }) {
  const code = error.code ? ` Supabase code: ${error.code}.` : "";
  return `${error.message ?? "Supabase request failed."}${code}`;
}

function toAnalysisVideo(row: InfluencerVideoRow): YouTubeVideoAnalysis {
  return {
    youtubeVideoId: row.youtube_video_id,
    channelId: row.youtube_channel_id,
    publishedAt: row.published_at,
    title: row.title,
    description: row.description ?? "",
    thumbnails: row.thumbnails ?? {},
    tags: row.tags ?? [],
    viewCount: row.view_count,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    raw: row.raw ?? {},
  };
}

async function getOptionalUserId() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function analyzeChannelForRecommendation(channelUrl: string): Promise<ChannelAnalysisResult> {
  const { channel, recentVideos } = await analyzeYouTubeChannel(channelUrl);
  const { inferredCategory, categoryScores } = inferCreatorCategory(channel, recentVideos);

  return {
    channel,
    recentVideos,
    inferredCategory,
    categoryScores,
  };
}

async function getCategoryRow(categoryName: CreatorCategoryName) {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("creator_categories")
    .select("id,name")
    .eq("name", categoryName)
    .maybeSingle<CreatorCategoryRow>();

  if (error) {
    throw new Error(`Failed to load creator category. ${toSupabaseMessage(error)}`);
  }

  if (!data) {
    throw new Error(`Creator category "${categoryName}" is missing. Apply the latest Supabase migration first.`);
  }

  return data;
}

async function getInfluencerVideos(categoryName: CreatorCategoryName) {
  const supabase = getSupabaseServiceRoleClient();
  const category = await getCategoryRow(categoryName);
  const { data, error } = await supabase
    .from("influencer_videos")
    .select(
      "youtube_video_id,youtube_channel_id,published_at,title,description,thumbnails,tags,view_count,like_count,comment_count,raw",
    )
    .eq("category_id", category.id)
    .order("published_at", { ascending: false })
    .limit(40)
    .returns<InfluencerVideoRow[]>();

  if (error) {
    throw new Error(`Failed to load influencer videos. ${toSupabaseMessage(error)}`);
  }

  return (data ?? []).map(toAnalysisVideo);
}

async function saveRecommendation(input: SaveRecommendationInput): Promise<SavedIds> {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const { data: analysisRow, error: analysisError } = await supabase
      .from("user_channel_analyses")
      .insert({
        user_id: input.userId,
        channel_url: input.channelUrl,
        youtube_channel_id: input.analysis.channel.youtubeChannelId,
        channel_title: input.analysis.channel.channelTitle,
        selected_category: input.selectedCategory,
        inferred_category: input.analysis.inferredCategory,
        channel_data: input.analysis.channel,
        recent_videos: input.analysis.recentVideos,
      })
      .select("id")
      .single<{ id: string }>();

    if (analysisError || !analysisRow) {
      return {
        analysisId: null,
        recommendationId: null,
        error: analysisError ? toSupabaseMessage(analysisError) : "Analysis insert did not return an id.",
      };
    }

    const { data: recommendationRow, error: recommendationError } = await supabase
      .from("content_recommendations")
      .insert({
        user_id: input.userId,
        analysis_id: analysisRow.id,
        selected_category: input.selectedCategory,
        input_payload: input.inputPayload,
        llm_response: input.recommendation,
      })
      .select("id")
      .single<{ id: string }>();

    if (recommendationError || !recommendationRow) {
      return {
        analysisId: analysisRow.id,
        recommendationId: null,
        error: recommendationError ? toSupabaseMessage(recommendationError) : "Recommendation insert did not return an id.",
      };
    }

    return {
      analysisId: analysisRow.id,
      recommendationId: recommendationRow.id,
      error: null,
    };
  } catch (error) {
    return {
      analysisId: null,
      recommendationId: null,
      error: error instanceof Error ? error.message : "Failed to persist recommendation.",
    };
  }
}

export async function recommendContent(channelUrl: string, category: string | null | undefined): Promise<RecommendationApiResult> {
  const analysis = await analyzeChannelForRecommendation(channelUrl);
  const selectedCategory = normalizeCreatorCategory(category) ?? analysis.inferredCategory;
  const influencerVideos = await getInfluencerVideos(selectedCategory);
  const { filtered, duplicateCount } = filterDuplicateInfluencerVideos(analysis.recentVideos, influencerVideos);
  const llmResult = await generateContentRecommendations({
    selectedCategory,
    channel: analysis.channel,
    recentVideos: analysis.recentVideos,
    influencerVideos: filtered,
  });
  const userId = await getOptionalUserId();
  const recommendation = {
    ...llmResult.recommendation,
    selectedCategory,
  };
  const persistence = await saveRecommendation({
    userId,
    channelUrl,
    analysis,
    selectedCategory,
    recommendation,
    inputPayload: {
      channelUrl,
      requestedCategory: category ?? null,
      selectedCategory,
      inferredCategory: analysis.inferredCategory,
      influencerVideosUsed: filtered.length,
      duplicateVideosExcluded: duplicateCount,
      llmRawText: llmResult.rawText,
      llmParseError: llmResult.parseError,
    },
  });

  return {
    ...analysis,
    selectedCategory,
    influencerVideosUsed: filtered.length,
    duplicateVideosExcluded: duplicateCount,
    llmParseError: llmResult.parseError ?? undefined,
    recommendation,
    persistence,
  };
}

export function externalApiException(error: unknown, request: Request) {
  if (error instanceof MissingEnvironmentVariableError) {
    return apiError(error.message, "INTERNAL_SERVER_ERROR", 500);
  }

  const message = error instanceof Error ? error.message : "External API request failed.";
  const status =
    typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
      ? error.status
      : 502;

  return apiError(message, "INTERNAL_SERVER_ERROR", status);
}
