import "server-only";
import OpenAI from "openai";

export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
export const CHAT_MAX_TOKENS = 500;

let openaiClient: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to your environment to enable the AI chat assistant."
    );
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
