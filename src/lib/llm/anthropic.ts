import Anthropic from "@anthropic-ai/sdk";
import type {
  LLMChatParams,
  LLMMessage,
  LLMProvider,
  LLMResponse,
} from "./types";

/**
 * Anthropic provider — the production LLM backend.
 *
 * Fully implemented and ready: activate it by setting
 * `AGENT_LLM_PROVIDER=anthropic` plus a valid `ANTHROPIC_API_KEY`. It stays
 * dormant by default (the resolver prefers `ollama`) so the platform keeps
 * working while no valid key is configured.
 *
 * This module is server-only. Never import it from client components.
 */

function normalizeMessage(message: LLMMessage): Anthropic.MessageParam {
  if (typeof message.content === "string") {
    return { role: message.role, content: message.content };
  }

  if (message.role === "assistant" && Array.isArray(message.content)) {
    // Assistant tool calls: only the first element is a tool_use block.
    const toolUses = message.content as LLMMessage["content"] & unknown[];
    const blocks: Anthropic.ContentBlockParam[] = (toolUses as {
      id: string;
      name: string;
      input: Record<string, unknown>;
    }[]).map((use) => ({
      type: "tool_use",
      id: use.id,
      name: use.name,
      input: use.input,
    }));
    return { role: "assistant", content: blocks };
  }

  // User tool results.
  const results = message.content as {
    id: string;
    content: string;
  }[];
  const blocks: Anthropic.ContentBlockParam[] = results.map((r) => ({
    type: "tool_result",
    tool_use_id: r.id,
    content: r.content,
  }));
  return { role: "user", content: blocks };
}

export const anthropicProvider: LLMProvider = {
  name: "anthropic",

  async chat(params: LLMChatParams): Promise<LLMResponse> {
    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.system,
      tools: params.tools,
      messages: params.messages.map(normalizeMessage),
    });

    const textParts: string[] = [];
    const toolUses: LLMResponse["toolUses"] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        textParts.push(block.text);
      } else if (block.type === "tool_use") {
        toolUses.push({
          id: block.id,
          name: block.name,
          input: (block.input ?? {}) as Record<string, unknown>,
        });
      }
    }

    let stopReason: LLMResponse["stopReason"] = "stop";
    if (response.stop_reason === "end_turn") stopReason = "end_turn";
    else if (response.stop_reason === "tool_use") stopReason = "tool_use";
    else if (response.stop_reason === "max_tokens") stopReason = "max_tokens";
    else if (response.stop_reason === "stop_sequence") stopReason = "stop";

    return {
      text: textParts.join(""),
      toolUses,
      stopReason,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  },
};
