import { anthropicProvider } from "./anthropic";
import type { LLMProvider } from "./types";

/**
 * Risolutore del provider LLM per l'esecuzione degli agenti.
 *
 * La piattaforma usa un unico backend:
 *  - Anthropic (Claude, produzione) — attivato da `ANTHROPIC_API_KEY`,
 *    con `AGENT_LLM_PROVIDER=anthropic`. Il modello di default è
 *    `claude-sonnet-5` (override con `AGENT_LLM_MODEL`).
 *
 * Modulo server-only.
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

export function getLLMProvider(): LLMProvider {
  const configured = (process.env.AGENT_LLM_PROVIDER ?? "").trim().toLowerCase();

  if (configured === "anthropic") return anthropicProvider;

  // L'unico backend supportato è Anthropic (Claude).
  return anthropicProvider;
}

