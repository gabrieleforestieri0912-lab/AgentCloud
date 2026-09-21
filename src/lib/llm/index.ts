import { anthropicProvider } from "./anthropic";
import { createOpenAIProvider } from "./openai";
import type { LLMProvider } from "./types";

/**
 * Risolutore del provider LLM per l'esecuzione degli agenti.
 *
 * Backend supportati:
 *  - Anthropic (Claude, produzione) — `ANTHROPIC_API_KEY`, `AGENT_LLM_PROVIDER=anthropic`
 *  - OpenAI-compatibile / XT — `XT_API_KEY=sk-xt-...` o `OPENAI_API_KEY`, `AGENT_LLM_PROVIDER=xt|openai`
 *    (usato per la chat demo waitlist con chiave sk-xt-...)
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
  const hasXtKey = Boolean(process.env.XT_API_KEY || process.env.OPENAI_API_KEY);

  if (configured === "xt" || configured === "openai" || configured === "openai-compatible" || configured === "openaicompatible") {
    return createOpenAIProvider();
  }
  if (configured === "anthropic") return anthropicProvider;

  // Auto-detect: se è presente una chiave sk-xt- e nessun provider esplicito anthropic, usa XT/OpenAI
  if (hasXtKey && !process.env.ANTHROPIC_API_KEY) return createOpenAIProvider();
  // Se la chiave sk-xt- è presente insieme ad Anthropic, ma l'utente vuole usare XT per la demo, AGENT_LLM_PROVIDER=xt ha priorità (già gestito sopra)

  return anthropicProvider;
}

