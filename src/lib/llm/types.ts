/**
 * Layer LLM indipendente dal provider per l'esecuzione degli agenti.
 *
 * Perché esiste: il runtime degli agenti parla con un provider generico
 * tramite un'unica interfaccia:
 *
 *  - `anthropic`: unico provider supportato. Si attiva impostando
 *    `ANTHROPIC_API_KEY` e opzionalmente `AGENT_LLM_PROVIDER=anthropic`.
 *    Modello di default: `claude-sonnet-5`.
 *
 * La route (`src/app/api/agent/run/route.ts`) dipende solo dai tipi sotto:
 * cambiare provider non tocca mai la logica di richiesta/SSE.
 */

/** Definizione di tool condivisa da ogni provider. */
export type LLMTool = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
};

/** A single tool call the model requested. */
export type LLMToolUse = {
  id: string;
  name: string;
  input: Record<string, unknown>;
};

/** A single tool result fed back to the model. */
export type LLMToolResult = {
  id: string;
  content: string;
};

/** One message in the conversation (provider-agnostic shape). */
export type LLMMessage = {
  role: "user" | "assistant";
  content:
    | string
    | LLMToolUse[] // assistant message containing tool calls
    | LLMToolResult[]; // user message containing tool results
};

/** Normalized response returned by every provider. */
export type LLMResponse = {
  /** Text the assistant produced. */
  text: string;
  /** Tool calls the assistant requested (empty when end_turn). */
  toolUses: LLMToolUse[];
  /**
   * Why generation stopped. `end_turn` = finished naturally; `tool_use` =
   * the model requested tools that the caller must execute and re-invoke.
   */
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "stop" | "length";
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
};

/** Request accepted by every provider. */
export type LLMChatParams = {
  model: string;
  system: string;
  messages: LLMMessage[];
  tools: LLMTool[];
  maxTokens: number;
};

export type LLMProviderName = "anthropic";

export interface LLMProvider {
  name: LLMProviderName;
  /**
   * Run a chat completion. When `onText` is provided the provider streams
   * text deltas as they are generated (token by token) and still resolves
   * with the full normalized `LLMResponse` once generation finishes.
   */
  chat(
    params: LLMChatParams,
    onText?: (delta: string) => void,
  ): Promise<LLMResponse>;
}
