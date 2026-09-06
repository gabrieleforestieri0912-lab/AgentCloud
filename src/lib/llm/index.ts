import { anthropicProvider } from "./anthropic";
import type { LLMProvider, LLMProviderName } from "./types";

/**
 * LLM provider resolver for agent execution.
 *
 * The platform uses a single backend:
 *  - Anthropic (Claude, production) — activated by `ANTHROPIC_API_KEY`,
 *    with `AGENT_LLM_PROVIDER=anthropic`. The default model is
 *    `claude-sonnet-5` (override with `AGENT_LLM_MODEL`).
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
  return Boolean(key && key.length > 10);
}

export function getLLMProvider(): LLMProvider {
  const configured = (process.env.AGENT_LLM_PROVIDER ?? "").trim().toLowerCase();

  if (configured === "anthropic") return anthropicProvider;

  // The only supported backend is Anthropic (Claude).
  return anthropicProvider;
}

export function getLLMProviderName(): LLMProviderName {
  return getLLMProvider().name;
}
