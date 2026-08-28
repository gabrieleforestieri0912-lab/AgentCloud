import { geminiProvider } from "./gemini";
import type { LLMProvider, LLMProviderName } from "./types";

/**
 * LLM provider resolver for agent execution.
 *
 * The platform uses a single backend:
 *  - Gemini (production) — activated by `GEMINI_API_KEY` (or `GOOGLE_API_KEY`),
 *    with `AGENT_LLM_PROVIDER=gemini`. The default model is `gemini-3.6-flash`
 *    (override with `AGENT_LLM_MODEL`).
 *
 * Ollama and Anthropic have been removed; Gemini is the only provider.
 *
 * This module is server-only.
 */

export type { LLMProvider, LLMProviderName } from "./types";
export type {
  LLMChatParams,
  LLMMessage,
  LLMResponse,
  LLMTool,
  LLMToolUse,
  LLMToolResult,
} from "./types";

export function isGeminiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return Boolean(key && key.length > 10);
}

export function getLLMProvider(): LLMProvider {
  const configured = (process.env.AGENT_LLM_PROVIDER ?? "").trim().toLowerCase();

  if (configured === "gemini") return geminiProvider;

  // The only supported backend is Gemini.
  return geminiProvider;
}

export function getLLMProviderName(): LLMProviderName {
  return getLLMProvider().name;
}
