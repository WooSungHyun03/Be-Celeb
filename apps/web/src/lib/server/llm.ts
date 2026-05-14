import { getLocalLlmEnv } from "@/lib/config/env";
import type {
  ContentRecommendation,
  CreatorCategoryName,
  LlmRecommendationResponse,
  YouTubeChannelAnalysis,
  YouTubeVideoAnalysis,
} from "@/types/content-recommendation";

type LocalLlmInput = {
  selectedCategory: CreatorCategoryName;
  channel: YouTubeChannelAnalysis;
  recentVideos: YouTubeVideoAnalysis[];
  influencerVideos: YouTubeVideoAnalysis[];
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export class LocalLlmError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = "LocalLlmError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeStoryboard(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((scene, index) => ({
    scene: typeof scene.scene === "number" ? scene.scene : index + 1,
    duration: asString(scene.duration, `${index * 3}-${index * 3 + 3}s`),
    description: asString(scene.description),
    caption: asString(scene.caption),
  }));
}

function normalizeRecommendation(value: unknown): ContentRecommendation | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = asString(value.title);

  if (!title) {
    return null;
  }

  return {
    title,
    format: asString(value.format, "short-form"),
    reason: asString(value.reason),
    whyNotDuplicate: asString(value.whyNotDuplicate),
    targetAudience: asString(value.targetAudience),
    hashtags: asStringArray(value.hashtags),
    thumbnailIdea: asString(value.thumbnailIdea),
    storyboard: normalizeStoryboard(value.storyboard),
  };
}

function extractJsonText(rawText: string) {
  const trimmed = rawText.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return withoutFence.slice(firstBrace, lastBrace + 1);
  }

  return withoutFence;
}

function parseRecommendationResponse(rawText: string, selectedCategory: CreatorCategoryName) {
  try {
    const parsed: unknown = JSON.parse(extractJsonText(rawText));

    if (!isRecord(parsed)) {
      throw new Error("Root value is not an object.");
    }

    const recommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map(normalizeRecommendation).filter((item): item is ContentRecommendation => Boolean(item))
      : [];

    return {
      recommendation: {
        selectedCategory: asString(parsed.selectedCategory, selectedCategory),
        summary: asString(parsed.summary),
        recommendations,
      },
      parseError: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON parse error.";

    return {
      recommendation: {
        selectedCategory,
        summary: "LLM 응답을 JSON으로 파싱하지 못했습니다. 원문 응답을 확인해야 합니다.",
        recommendations: [],
      },
      parseError: message,
    };
  }
}

function compactVideo(video: YouTubeVideoAnalysis) {
  return {
    youtubeVideoId: video.youtubeVideoId,
    publishedAt: video.publishedAt,
    title: video.title,
    description: video.description.slice(0, 700),
    tags: video.tags.slice(0, 12),
    viewCount: video.viewCount,
    likeCount: video.likeCount,
    commentCount: video.commentCount,
  };
}

function buildPrompt(input: LocalLlmInput) {
  return [
    "Be-Celeb은 유튜브 크리에이터의 다음 콘텐츠 아이디어와 콘티를 추천하는 서비스다.",
    "아래 JSON 데이터를 분석해서 사용자가 이미 올린 콘텐츠와 중복되지 않는 다음 업로드 아이디어를 추천하라.",
    "카테고리별 인플루언서 최근 영상은 참고용 트렌드 데이터이며, 그대로 복제하지 말고 차별화된 아이디어로 재구성하라.",
    "반드시 JSON만 반환하라. 마크다운, 설명 문장, 코드펜스를 포함하지 말라.",
    "JSON schema:",
    JSON.stringify(
      {
        selectedCategory: "string",
        summary: "string",
        recommendations: [
          {
            title: "string",
            format: "string",
            reason: "string",
            whyNotDuplicate: "string",
            targetAudience: "string",
            hashtags: ["string"],
            thumbnailIdea: "string",
            storyboard: [
              {
                scene: 1,
                duration: "0-3s",
                description: "string",
                caption: "string",
              },
            ],
          },
        ],
      },
      null,
      2,
    ),
    "Input data:",
    JSON.stringify(
      {
        selectedCategory: input.selectedCategory,
        userChannel: {
          youtubeChannelId: input.channel.youtubeChannelId,
          channelTitle: input.channel.channelTitle,
          description: input.channel.description.slice(0, 1000),
          subscriberCount: input.channel.subscriberCount,
          videoCount: input.channel.videoCount,
          viewCount: input.channel.viewCount,
        },
        userRecentVideos: input.recentVideos.slice(0, 10).map(compactVideo),
        influencerRecentVideos: input.influencerVideos.slice(0, 24).map(compactVideo),
      },
      null,
      2,
    ),
  ].join("\n\n");
}

export async function generateContentRecommendations(input: LocalLlmInput) {
  const { apiKey, apiUrl, model } = getLocalLlmEnv();
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.65,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Be-Celeb's Korean YouTube content strategist. Return only valid JSON that matches the requested schema.",
        },
        {
          role: "user",
          content: buildPrompt(input),
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new LocalLlmError(text || `Local LLM API request failed with status ${response.status}.`, 502);
  }

  const payload = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
  const rawText = payload?.choices?.[0]?.message?.content;

  if (!rawText) {
    throw new LocalLlmError("Local LLM API returned an empty chat completion.", 502);
  }

  const parsed = parseRecommendationResponse(rawText, input.selectedCategory);

  return {
    recommendation: parsed.recommendation satisfies LlmRecommendationResponse,
    rawText,
    parseError: parsed.parseError,
  };
}
