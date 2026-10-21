import { anthropicProvider } from "./anthropic";
import { createOpenAIProvider } from "./openai";
import type { LLMProvider } from "./types";

/**
 * Risolutore del provider LLM per l'esecuzione degli agenti.
 *
 * Backend supportati:
 *  - xKiro (OpenAI-compatibile, `https://api.xkiro.com/v1`) — `XT_API_KEY`
 *    oppure `XKIRO_API_KEY`, `AGENT_LLM_PROVIDER=xt|xkiro|openai`.
 *    È il backend di default quando è presente una chiave xKiro.
 *  - Anthropic (Claude) — `ANTHROPIC_API_KEY`, `AGENT_LLM_PROVIDER=anthropic`.
 *
 * L'override esplicito (es. `provider: "xt"` dal client della hero) ha
 * priorità sulla configurazione: serve a indirizzare UNA superficie (la demo
 * pubblica) su un provider economico, lasciando il default di produzione
 * alla configurazione. Valori non riconosciuti → si ignora e vale la
 * configurazione.
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

/** Alias che tutti indicano lo stesso backend: xKiro via API OpenAI-compatible. */
const OPENAI_COMPATIBLE_ALIASES = new Set([
  "xt",
  "xkiro",
  "openai",
  "openai-compatible",
  "openaicompatible",
]);

/** Una chiave xKiro (o OpenAI) è configurata nel ambiente? */
function hasCompatibleKey(): boolean {
  return Boolean(
    process.env.XT_API_KEY ||
      process.env.XKIRO_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.LLM_API_KEY,
  );
}

export function getLLMProvider(override?: string): LLMProvider {
  const normalized = (override ?? "").trim().toLowerCase();
  if (OPENAI_COMPATIBLE_ALIASES.has(normalized)) {
    return createOpenAIProvider();
  }
  if (normalized === "anthropic") return anthropicProvider;

  const configured = (process.env.AGENT_LLM_PROVIDER ?? "").trim().toLowerCase();
  if (OPENAI_COMPATIBLE_ALIASES.has(configured)) {
    return createOpenAIProvider();
  }
  if (configured === "anthropic") return anthropicProvider;

  // Nessun provider esplicito: se è configurata una chiave xKiro/OpenAI si
  // usa quel backend, altrimenti si cade su Anthropic (che richiede la sua
  // chiave). La chiave xKiro è quella economica e già impostata.
  if (hasCompatibleKey()) return createOpenAIProvider();

  return anthropicProvider;
}
