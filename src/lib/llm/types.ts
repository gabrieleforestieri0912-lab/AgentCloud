import type Anthropic from "@anthropic-ai/sdk";

/**
 * Provider-agnostic LLM layer for agent execution.
 *
 * The agent runtime talks to a generic provider instead of hard-coding the
 * Anthropic SDK. Two implementations exist:
 *
 *  - `anthropic`: the production provider. Ready to use — activate it by
 *    setting `AGENT_LLM_PROVIDER=anthropic` and a valid `ANTHROPIC_API_KEY`.
 *  - `ollama`: local fallback (llama3 etc.) used while no valid Anthropic key
 *    is configured. This is the temporary development path.
 *
 * The route (`src/app/api/agent/run/route.ts`) only depends on the types
 * below, so switching providers never touches the request/SSE logic.
 */

/** Tool definition, structurally identical to `Anthropic.Tool`. */
export type LLMTool = Anthropic.Tool;

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

export type LLMProviderName = "anthropic" | "ollama";

export interface LLMProvider {
  name: LLMProviderName;
  chat(params: LLMChatParams): Promise<LLMResponse>;
}
