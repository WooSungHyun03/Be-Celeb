// Generates content recommendations through the server-side OpenAI API.
import { NextResponse } from "next/server";
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
      return NextResponse.json(
        { error: "OpenAI returned an unexpected recommendation shape." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      recommendation: parsed,
      model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI recommendation error.";
    const status = error instanceof MissingEnvironmentVariableError ? 500 : 502;

    return NextResponse.json(
      {
        error: message,
        service: "openai",
      },
      { status },
    );
  }
}
