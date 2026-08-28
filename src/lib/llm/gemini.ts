import { GoogleGenAI, type Content, type Part, type Tool } from "@google/genai";
import type {
  LLMChatParams,
  LLMMessage,
  LLMProvider,
  LLMResponse,
  LLMTool,
} from "./types";

/**
 * Gemini provider — Google's LLM backend via the `@google/genai` SDK.
 *
 * Activate it by setting `AGENT_LLM_PROVIDER=gemini` and a valid
 * `GEMINI_API_KEY` (or `GOOGLE_API_KEY`). The default model is
 * `gemini-3.6-flash` (override with `AGENT_LLM_MODEL`).
 *
 * This module is server-only. Never import it from client components.
 *
 * ## Thought signatures
 *
 * Gemini 3.x models return encrypted `thought_signature` fields inside
 * `functionCall` parts. These MUST be preserved and echoed back exactly as-is
 * in subsequent requests, or the API returns 400 errors. To support this, the
 * provider stores raw Gemini `Content` objects from each response (keyed by the
 * tool-uses array reference, which the agent runtime preserves across turns) and
 * replays them verbatim when building the next request's `contents`.
 */

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

// ---------------------------------------------------------------------------
// Raw-response cache (thought-signature preservation)
// ---------------------------------------------------------------------------

/**
 * Map from the `toolUses` array reference (from the LLMResponse returned to
 * the agent runtime) to the raw Gemini `Content` that was in the model's
 * response. Because the agent route does `{ role: "assistant", content: response.toolUses }`,
 * the same array reference flows back on the next turn.
 */
const rawResponseByToolUses = new WeakMap<object, Content>();

// ---------------------------------------------------------------------------
// Message normalization: LLMMessage[] → Gemini Content[]
// ---------------------------------------------------------------------------

/**
 * Convert the full conversation into Gemini's `Content[]` format.
 *
 * For assistant messages containing tool uses, the cached raw `Content` (with
 * thought_signatures) is used instead of a synthetic reconstruction. This is
 * critical for Gemini 3.x models which reject function calls without valid
 * thought signatures.
 *
 * For user messages containing tool results, the function name is resolved
 * from the preceding assistant message (Gemini requires the actual function
 * name, not our synthetic tool-use id).
 */
function normalizeMessages(messages: LLMMessage[]): Content[] {
  // Build a map: tool_use_id → function_name, extracted from assistant tool calls.
  const toolNameById = new Map<string, string>();
  for (const msg of messages) {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      const toolUses = msg.content as unknown as {
        id: string;
        name: string;
        input: Record<string, unknown>;
      }[];
      for (const use of toolUses) {
        toolNameById.set(use.id, use.name);
      }
    }
  }

  return messages.map((message) => {
    const role = message.role === "assistant" ? "model" : "user";

    if (typeof message.content === "string") {
      return { role, parts: [{ text: message.content } as Part] };
    }

    if (message.role === "assistant" && Array.isArray(message.content)) {
      const toolUses = message.content as unknown as {
        id: string;
        name: string;
        input: Record<string, unknown>;
      }[];

      // If we have a cached raw Content for this tool-uses array (same
      // reference from the previous LLMResponse), replay it verbatim —
      // this preserves thought_signatures.
      const raw = rawResponseByToolUses.get(toolUses);
      if (raw) return raw;

      // Fallback: construct synthetic functionCall parts (no signatures).
      const parts: Part[] = toolUses.map((use) => ({
        functionCall: {
          name: use.name,
          args: use.input,
        },
      }));
      return { role: "model", parts };
    }

    // User tool results → Gemini functionResponse parts
    const results = message.content as { id: string; content: string }[];
    const parts: Part[] = results.map((r) => {
      let responsePayload: Record<string, unknown>;
      try {
        responsePayload = JSON.parse(r.content);
      } catch {
        responsePayload = { output: r.content };
      }
      return {
        functionResponse: {
          name: toolNameById.get(r.id) ?? r.id,
          response: responsePayload,
        },
      };
    });
    return { role: "user", parts };
  });
}

// ---------------------------------------------------------------------------
// Tool normalization: LLMTool → Gemini FunctionDeclaration
// ---------------------------------------------------------------------------

function normalizeTools(tools: LLMTool[]): Tool[] {
  if (tools.length === 0) return [];

  return [
    {
      functionDeclarations: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema as Record<string, unknown>,
      })),
    },
  ];
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function createGeminiProvider(options?: {
  apiKey?: string;
  model?: string;
}): LLMProvider {
  const apiKey =
    options?.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = options?.model || process.env.AGENT_LLM_MODEL || DEFAULT_GEMINI_MODEL;

  // Lazily construct the client so module import never throws.
  let ai: GoogleGenAI | null = null;
  function getClient(): GoogleGenAI {
    if (!ai) {
      const key = apiKey;
      if (!key) {
        throw new Error(
          "Gemini provider requires a GEMINI_API_KEY or GOOGLE_API_KEY environment variable.",
        );
      }
      ai = new GoogleGenAI({ apiKey: key });
    }
    return ai;
  }

  /** Map non-Gemini model names to the configured Gemini default. */
  function resolveModel(requestedModel: string): string {
    if (requestedModel.startsWith("gemini")) return requestedModel;
    return model;
  }

  return {
    name: "gemini",

    async chat(params: LLMChatParams): Promise<LLMResponse> {
      const resolvedModel = resolveModel(params.model || model);

      const response = await getClient().models.generateContent({
        model: resolvedModel,
        contents: normalizeMessages(params.messages),
        config: {
          systemInstruction: params.system,
          maxOutputTokens: params.maxTokens,
          tools: normalizeTools(params.tools),
        },
      });

      // Extract text and tool uses from the response
      const textParts: string[] = [];
      const toolUses: LLMResponse["toolUses"] = [];
      let stopReason: LLMResponse["stopReason"] = "end_turn";

      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            textParts.push(part.text);
          }
          if (part.functionCall) {
            toolUses.push({
              id: `toolu_gemini_${toolUses.length}`,
              name: part.functionCall.name ?? "unknown",
              input: (part.functionCall.args ?? {}) as Record<string, unknown>,
            });
          }
        }
      }

      // Map Gemini finish reasons → shared stop reasons
      const finishReason = candidate?.finishReason;
      if (finishReason === "STOP") {
        stopReason = toolUses.length > 0 ? "tool_use" : "end_turn";
      } else if (finishReason === "MAX_TOKENS") {
        stopReason = "max_tokens";
      } else if (finishReason === "SAFETY" || finishReason === "RECITATION") {
        stopReason = "stop";
      } else if (toolUses.length > 0) {
        stopReason = "tool_use";
      }

      // Cache the raw response Content keyed by the toolUses array reference.
      // The agent runtime passes this same array back as the assistant message
      // content, so we can look it up on the next turn to replay the raw
      // Content (with thought_signatures) verbatim.
      if (candidate?.content && toolUses.length > 0) {
        rawResponseByToolUses.set(toolUses, candidate.content);
      }

      return {
        text: textParts.join(""),
        toolUses,
        stopReason,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        },
      };
    },
  };
}

export const geminiProvider: LLMProvider = createGeminiProvider();
