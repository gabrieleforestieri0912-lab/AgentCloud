import Anthropic from "@anthropic-ai/sdk";
import type {
  ContentBlockParam,
  MessageParam,
  Tool,
  ThinkingBlockParam,
  ToolUseBlockParam,
} from "@anthropic-ai/sdk/resources/messages";
import type {
  LLMChatParams,
  LLMMessage,
  LLMProvider,
  LLMResponse,
  LLMTool,
} from "./types";

/**
 * Anthropic provider — Claude LLM backend via the `@anthropic-ai/sdk`.
 *
 * Activate it by setting `ANTHROPIC_API_KEY` and (optionally)
 * `AGENT_LLM_PROVIDER=anthropic`. The default model is `claude-sonnet-5`
 * (override with `AGENT_LLM_MODEL`).
 *
 * This module is server-only. Never import it from client components.
 *
 * ## Thinking-block preservation
 *
 * Claude Sonnet 5 (and Opus 5) run adaptive thinking, which returns encrypted
 * `signature` fields inside `thinking` blocks. When a multi-turn tool loop
 * continues, Anthropic requires those blocks to be passed back unmodified and
 * in their original order — a reconstructed or modified block results in a
 * 400 `invalid_request_error`. To support this, the provider stores the raw
 * assistant content blocks from each response (keyed by the tool-uses array
 * reference, which the agent runtime preserves across turns) and replays them
 * verbatim when building the next request's messages.
 */

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";

// ---------------------------------------------------------------------------
// Raw-response cache (thinking-signature preservation)
// ---------------------------------------------------------------------------

/**
 * Map from the `toolUses` array reference (from the LLMResponse returned to
 * the agent runtime) to the raw Anthropic content blocks that were in the
 * model's response. Because the agent route does
 * `{ role: "assistant", content: response.toolUses }`, the same array
 * reference flows back on the next turn.
 */
const rawBlocksByToolUses = new WeakMap<object, ContentBlockParam[]>();

// ---------------------------------------------------------------------------
// Message normalization: LLMMessage[] → Anthropic MessageParam[]
// ---------------------------------------------------------------------------

type RawBlockType = "text" | "tool_use" | "thinking" | "redacted_thinking";

/**
 * Convert the full conversation into Anthropic's `MessageParam[]` format.
 *
 * For assistant messages containing tool uses, the cached raw blocks (with
 * thinking signatures) are replayed verbatim when available. For user messages
 * containing tool results, each result becomes a `tool_result` block whose
 * `tool_use_id` matches the id of the original tool call.
 */
function normalizeMessages(messages: LLMMessage[]): MessageParam[] {
  return messages.map((message) => {
    if (typeof message.content === "string") {
      return { role: message.role, content: message.content };
    }

    if (message.role === "assistant") {
      const toolUses = message.content as unknown as {
        id: string;
        name: string;
        input: Record<string, unknown>;
      }[];

      // Replay cached raw blocks (thinking + tool_use) verbatim when the same
      // toolUses reference from a previous LLMResponse comes back.
      const raw = rawBlocksByToolUses.get(toolUses);
      if (raw) return { role: "assistant", content: raw };

      // Fallback: reconstruct tool_use blocks without thinking content. This
      // is only safe for models without thinking (e.g. Haiku) — streaming
      // responses always populate the cache first, so this path is rare.
      const content: ContentBlockParam[] = toolUses.map((use) => ({
        type: "tool_use",
        id: use.id,
        name: use.name,
        input: use.input,
      }));
      return { role: "assistant", content };
    }

    // User tool results → tool_result blocks.
    const results = message.content as { id: string; content: string }[];
    const content: ContentBlockParam[] = results.map((r) => ({
      type: "tool_result",
      tool_use_id: r.id,
      content: r.content,
    }));
    return { role: "user", content };
  });
}

// ---------------------------------------------------------------------------
// Tool normalization: LLMTool → Anthropic Tool
// ---------------------------------------------------------------------------

function normalizeTools(tools: LLMTool[]): Tool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema as Tool["input_schema"],
  }));
}

// ---------------------------------------------------------------------------
// Response content → raw param blocks (for the cache)
// ---------------------------------------------------------------------------

function contentToParams(
  content: {
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: unknown;
    thinking?: string;
    signature?: string;
    data?: string;
  }[],
): ContentBlockParam[] {
  const params: ContentBlockParam[] = [];
  for (const block of content) {
    if (block.type === "text" && block.text !== undefined) {
      params.push({ type: "text", text: block.text });
    } else if (block.type === "tool_use" && block.id && block.name) {
      params.push({
        type: "tool_use",
        id: block.id,
        name: block.name,
        input: block.input ?? {},
      } satisfies ToolUseBlockParam);
    } else if (block.type === "thinking") {
      const thinking: ThinkingBlockParam = {
        type: "thinking",
        thinking: block.thinking ?? "",
        signature: block.signature ?? "",
      };
      params.push(thinking);
    } else if (block.type === "redacted_thinking" && block.data !== undefined) {
      params.push({ type: "redacted_thinking", data: block.data });
    }
    // Unknown/server-tool blocks are dropped from the replay cache.
  }
  return params;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function createAnthropicProvider(options?: {
  apiKey?: string;
  model?: string;
}): LLMProvider {
  const apiKey = options?.apiKey || process.env.ANTHROPIC_API_KEY;
  const model =
    options?.model || process.env.AGENT_LLM_MODEL || DEFAULT_ANTHROPIC_MODEL;

  // Lazily construct the client so module import never throws.
  let client: Anthropic | null = null;
  function getClient(): Anthropic {
    if (!client) {
      const key = apiKey;
      if (!key) {
        throw new Error(
          "Anthropic provider requires an ANTHROPIC_API_KEY environment variable.",
        );
      }
      client = new Anthropic({ apiKey: key });
    }
    return client;
  }

  /** Map non-Claude model names to the configured Anthropic default. */
  function resolveModel(requestedModel: string): string {
    if (requestedModel.startsWith("claude")) return requestedModel;
    return model;
  }

  /** Shared helper that turns raw content blocks into tool uses + text. */
  function extractTextAndToolUses(content: {
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: unknown;
  }[]): {
    text: string;
    toolUses: LLMResponse["toolUses"];
  } {
    const textParts: string[] = [];
    const toolUses: LLMResponse["toolUses"] = [];
    for (const block of content) {
      if (block.type === "text" && block.text) {
        textParts.push(block.text);
      } else if (block.type === "tool_use" && block.id && block.name) {
        toolUses.push({
          id: block.id,
          name: block.name,
          input: (block.input ?? {}) as Record<string, unknown>,
        });
      }
    }
    return { text: textParts.join(""), toolUses };
  }

  /** Anthropic stop_reason → shared stop reason. */
  function mapStopReason(
    stopReason: string | undefined | null,
    toolUsesLength: number,
  ): LLMResponse["stopReason"] {
    if (toolUsesLength > 0) return "tool_use";
    if (stopReason === "end_turn") return "end_turn";
    if (stopReason === "max_tokens") return "max_tokens";
    if (stopReason === "stop_sequence") return "stop";
    if (stopReason === "refusal" || stopReason === "refusal_and_end_turn") {
      return "stop";
    }
    return "end_turn";
  }

  return {
    name: "anthropic",

    async chat(
      params: LLMChatParams,
      onText?: (delta: string) => void,
    ): Promise<LLMResponse> {
      const resolvedModel = resolveModel(params.model || model);
      const messages = normalizeMessages(params.messages);
      const tools = normalizeTools(params.tools);

      // Streaming path: emit text deltas as they are generated and rebuild the
      // raw content blocks (text / thinking / tool_use) for the replay cache.
      if (onText) {
        const stream = await getClient().messages.create({
          model: resolvedModel,
          max_tokens: params.maxTokens,
          system: params.system,
          messages,
          tools,
          stream: true,
        });

        // Per-block accumulators, indexed by the Anthropic block index.
        const blocks: {
          type: RawBlockType;
          id?: string;
          name?: string;
          text?: string;
          inputJson?: string;
          thinking?: string;
          signature?: string;
          data?: string;
        }[] = [];

        const textParts: string[] = [];
        const toolUses: LLMResponse["toolUses"] = [];
        let stopReason: string | null = null;
        let usage = { inputTokens: 0, outputTokens: 0 };

        for await (const event of stream) {
          if (event.type === "content_block_start") {
            const block = event.content_block;
            if (block.type === "tool_use") {
              blocks[event.index] = {
                type: "tool_use",
                id: block.id,
                name: block.name,
                inputJson: "",
              };
            } else if (block.type === "text") {
              blocks[event.index] = { type: "text", text: "" };
            } else if (block.type === "thinking") {
              blocks[event.index] = { type: "thinking", thinking: "" };
            } else if (block.type === "redacted_thinking") {
              blocks[event.index] = {
                type: "redacted_thinking",
                data: block.data,
              };
            }
          } else if (event.type === "content_block_delta") {
            const delta = event.delta;
            if (delta.type === "text_delta") {
              const acc = blocks[event.index];
              if (acc && acc.type === "text") {
                acc.text = (acc.text ?? "") + delta.text;
              }
              textParts.push(delta.text);
              onText(delta.text);
            } else if (delta.type === "input_json_delta") {
              const acc = blocks[event.index];
              if (acc && acc.type === "tool_use") {
                acc.inputJson = (acc.inputJson ?? "") + delta.partial_json;
              }
            } else if (delta.type === "thinking_delta") {
              const acc = blocks[event.index];
              if (acc && acc.type === "thinking") {
                acc.thinking = (acc.thinking ?? "") + delta.thinking;
              }
            } else if (delta.type === "signature_delta") {
              const acc = blocks[event.index];
              if (acc && (acc.type === "thinking" || acc.type === "tool_use")) {
                acc.signature = delta.signature;
              }
            }
          } else if (event.type === "content_block_stop") {
            // Finalize the tool-use blocks now that their JSON is complete.
            const acc = blocks[event.index];
            if (acc?.type === "tool_use") {
              let input: Record<string, unknown> = {};
              try {
                input = JSON.parse(acc.inputJson ?? "{}");
              } catch {
                input = {};
              }
              toolUses.push({
                id: acc.id ?? `toolu_anthropic_${toolUses.length}`,
                name: acc.name ?? "unknown",
                input,
              });
            }
          } else if (event.type === "message_delta") {
            stopReason = event.delta.stop_reason ?? null;
            if (event.usage) {
              usage = {
                inputTokens: event.usage.input_tokens ?? 0,
                outputTokens: event.usage.output_tokens ?? 0,
              };
            }
          }
        }

        // Cache the raw assistant blocks (thinking signatures + tool_use) so
        // the next tool-loop turn can replay them verbatim.
        if (toolUses.length > 0) {
          rawBlocksByToolUses.set(
            toolUses,
            contentToParams(blocks.filter(Boolean)),
          );
        }

        return {
          text: textParts.join(""),
          toolUses,
          stopReason: mapStopReason(stopReason, toolUses.length),
          usage,
        };
      }

      // Non-streaming path (agent tool loops that need the full response).
      const response = await getClient().messages.create({
        model: resolvedModel,
        max_tokens: params.maxTokens,
        system: params.system,
        messages,
        tools,
      });

      const { text, toolUses } = extractTextAndToolUses(response.content);

      // Cache raw blocks for the next tool-loop turn.
      if (toolUses.length > 0) {
        rawBlocksByToolUses.set(toolUses, contentToParams(response.content));
      }

      return {
        text,
        toolUses,
        stopReason: mapStopReason(response.stop_reason, toolUses.length),
        usage: {
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
        },
      };
    },
  };
}

export const anthropicProvider: LLMProvider = createAnthropicProvider();
