import { anthropicProvider } from "./anthropic";
import { geminiProvider } from "./gemini";
import { ollamaProvider } from "./ollama";
import type { LLMProvider, LLMProviderName } from "./types";

/**
 * LLM provider resolver for agent execution.
 *
 * Multiple backends are supported:
 *  - Anthropic (production) — activated via `ANTHROPIC_API_KEY`.
 *  - Gemini (production)    — activated via `GEMINI_API_KEY` or `GOOGLE_API_KEY`.
 *  - Ollama (local dev)     — fallback when no API key is configured.
 *
 * Selection (in order):
 *  1. `AGENT_LLM_PROVIDER=anthropic` → Anthropic provider.
 *  2. `AGENT_LLM_PROVIDER=gemini`    → Gemini provider.
 *  3. `AGENT_LLM_PROVIDER=ollama`    → local Ollama provider.
 *  4. No variable (default)          → first available: Anthropic > Gemini > Ollama.
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
  if (configured === "ollama") return ollamaProvider;

  // No explicit choice: pick the first available production backend,
  // falling back to the local Ollama provider (keeps dev/CI green).
  if (isAnthropicKeyConfigured()) return anthropicProvider;
  if (isGeminiKeyConfigured()) return geminiProvider;
  return ollamaProvider;
}

export function getLLMProviderName(): LLMProviderName {
  return getLLMProvider().name;
}
