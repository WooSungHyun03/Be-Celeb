import { apiError, apiSuccess } from "@/app/api/_utils/api";
import { MissingEnvironmentVariableError, getOpenAiEnv } from "@/lib/config/env";
import { getOpenAiClient } from "@/lib/openai/client";
import { buildRecommendationPrompt, recommendationJsonSchema } from "@/lib/openai/prompts";

type AiRecommendation = {
  title: string;
  reason: string;
  hookText: string;
  contentPlan: string[];
  hashtags: string[];
  uploadTime: string;
  difficulty: "쉬움" | "보통" | "어려움";
  expectedScore: number;
};

type RecommendRequest = {
  userProfile?: Record<string, unknown>;
  trendData?: unknown;
  ruleBasedResult?: unknown;
};

function isRecommendRequest(value: unknown): value is RecommendRequest {
  return typeof value === "object" && value !== null;
}

function isAiRecommendation(value: unknown): value is AiRecommendation {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<AiRecommendation>;

  return (
    typeof candidate.title === "string" &&
    typeof candidate.reason === "string" &&
    typeof candidate.hookText === "string" &&
    Array.isArray(candidate.contentPlan) &&
    Array.isArray(candidate.hashtags) &&
    typeof candidate.uploadTime === "string" &&
    typeof candidate.difficulty === "string" &&
    typeof candidate.expectedScore === "number"
  );
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return apiError("Request body must be a JSON object.", "VALIDATION_ERROR", 400);
    }

    const input = isRecommendRequest(body) ? body : {};
    const userProfile = input.userProfile ?? {};
    const trendData = input.trendData ?? [];
    const ruleBasedResult = input.ruleBasedResult ?? {};
    const { model } = getOpenAiEnv();
    const response = await getOpenAiClient().responses.create({
      model,
      input: [
        {
          role: "system",
          content: "You are Be Celeb's Korean short-form content strategy assistant. Return only valid JSON.",
        },
        {
          role: "user",
          content: buildRecommendationPrompt({
            userProfile,
            trendData,
            ruleBasedResult,
          }),
        },
      ],
      text: {
        format: recommendationJsonSchema,
      },
    });

    const parsed: unknown = JSON.parse(response.output_text);

    if (!isAiRecommendation(parsed)) {
      return apiError("OpenAI returned an unexpected recommendation shape.", "INTERNAL_SERVER_ERROR", 502);
    }

    return apiSuccess({
      recommendation: parsed,
      model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI recommendation error.";
    const status = error instanceof MissingEnvironmentVariableError ? 500 : 502;

    return apiError(message, "INTERNAL_SERVER_ERROR", status);
  }
}
