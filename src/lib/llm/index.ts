import { anthropicProvider } from "./anthropic";
import { geminiProvider } from "./gemini";
import type { LLMProvider, LLMProviderName } from "./types";

/**
 * LLM provider resolver for agent execution.
 *
 * The platform now uses a single backend:
 *  - Gemini (production) — activated by `GEMINI_API_KEY` (or `GOOGLE_API_KEY`),
 *    with `AGENT_LLM_PROVIDER=gemini`. The default model is `gemini-3.6-flash`
 *    (override with `AGENT_LLM_MODEL`).
 *
 * `AGENT_LLM_PROVIDER=anthropic` is retained only as an explicit override.
 * Ollama (local dev) has been removed.
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

export function isAnthropicKeyConfigured(): boolean {
  const key = process.env.ANTHROPIC_API_KEY;
  return Boolean(key && key.startsWith("sk-ant-"));
}

export function isGeminiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return Boolean(key && key.length > 10);
}

export function getLLMProvider(): LLMProvider {
  const configured = (process.env.AGENT_LLM_PROVIDER ?? "").trim().toLowerCase();

  if (configured === "anthropic") return anthropicProvider;
  if (configured === "gemini") return geminiProvider;

  // Going forward the only backend is Gemini.
  return geminiProvider;
}

export function getLLMProviderName(): LLMProviderName {
  return getLLMProvider().name;
}
