import { anthropicProvider } from "./anthropic";
import { ollamaProvider } from "./ollama";
import type { LLMProvider, LLMProviderName } from "./types";

/**
 * LLM provider resolver for agent execution.
 *
 * The production backend is Anthropic (via `ANTHROPIC_API_KEY`). Ollama is
 * the temporary local backend used while no valid Anthropic key is set.
 *
 * Selection (in order):
 *  1. `AGENT_LLM_PROVIDER=anthropic` → the Anthropic provider (production).
 *  2. `AGENT_LLM_PROVIDER=ollama`    → the local Ollama provider.
 *  3. No variable (default)          → Anthropic ONLY when a key is set,
 *     otherwise Ollama. This keeps the platform usable in development before
 *     a real key is configured, and switches to the real backend the moment
 *     the key is added.
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

export function getLLMProvider(): LLMProvider {
  const configured = (process.env.AGENT_LLM_PROVIDER ?? "").trim().toLowerCase();

  if (configured === "anthropic") return anthropicProvider;
  if (configured === "ollama") return ollamaProvider;

  // No explicit choice: production backend when a key is present, otherwise
  // the local fallback (keeps dev/CI green without a key).
  if (isAnthropicKeyConfigured()) return anthropicProvider;
  return ollamaProvider;
}

export function getLLMProviderName(): LLMProviderName {
  return getLLMProvider().name;
}
