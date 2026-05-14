// Builds OpenAI prompts and response schema for content recommendations.
export type RecommendationPromptInput = {
  userProfile: Record<string, unknown>;
  trendData: unknown;
  ruleBasedResult: unknown;
};

export const recommendationJsonSchema = {
  type: "json_schema",
  name: "be_celeb_content_recommendation",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      reason: { type: "string" },
      hookText: { type: "string" },
      contentPlan: {
        type: "array",
        items: { type: "string" },
      },
      hashtags: {
        type: "array",
        items: { type: "string" },
      },
      uploadTime: { type: "string" },
      difficulty: { type: "string", enum: ["쉬움", "보통", "어려움"] },
      expectedScore: { type: "integer", minimum: 0, maximum: 100 },
    },
    required: [
      "title",
      "reason",
      "hookText",
      "contentPlan",
      "hashtags",
      "uploadTime",
      "difficulty",
      "expectedScore",
    ],
  },
} as const;

export function buildRecommendationPrompt(input: RecommendationPromptInput) {
  return [
    "Be Celeb은 숏폼 YouTube 콘텐츠 전략 추천 서비스다.",
    "아래 입력을 바탕으로 한국어 JSON 추천 결과를 생성한다.",
    "출력은 반드시 제공된 JSON schema를 따라야 한다.",
    "",
    `userProfile: ${JSON.stringify(input.userProfile)}`,
    `trendData: ${JSON.stringify(input.trendData)}`,
    `ruleBasedResult: ${JSON.stringify(input.ruleBasedResult)}`,
  ].join("\n");
}

