// Creates a lazy OpenAI client for server-side recommendation API routes.
import OpenAI from "openai";
import { getOpenAiEnv } from "@/lib/config/env";

let openaiClient: OpenAI | null = null;

export function getOpenAiClient() {
  const { apiKey } = getOpenAiEnv();

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}
