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
 */

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

// ---------------------------------------------------------------------------
// Message normalization: LLMMessage → Gemini Content
// ---------------------------------------------------------------------------

/** Convert a shared message into Gemini's { role, parts } content format. */
function normalizeMessage(message: LLMMessage): Content {
  const role = message.role === "assistant" ? "model" : "user";

  if (typeof message.content === "string") {
    return { role, parts: [{ text: message.content } as Part] };
  }

  if (message.role === "assistant" && Array.isArray(message.content)) {
    // Assistant tool calls → Gemini functionCall parts
    const toolUses = message.content as {
      id: string;
      name: string;
      input: Record<string, unknown>;
    }[];
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
      // If the result is plain text, wrap it so Gemini accepts it.
      responsePayload = { output: r.content };
    }
    return {
      functionResponse: {
        name: r.id, // Gemini expects the function name; we use the tool id
        response: responsePayload,
      },
    };
  });
  return { role: "user", parts };
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
        parameters: tool.input_schema as any,
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
    // If the caller passed a Gemini-compatible model, use it as-is.
    if (requestedModel.startsWith("gemini")) return requestedModel;
    // Otherwise the model is from another provider (e.g. claude-sonnet-5 from
    // the agent registry) — fall back to the Gemini default.
    return model;
  }

  return {
    name: "gemini",

    async chat(params: LLMChatParams): Promise<LLMResponse> {
      const resolvedModel = resolveModel(params.model || model);

      const response = await getClient().models.generateContent({
        model: resolvedModel,
        contents: params.messages.map(normalizeMessage),
        config: {
          systemInstruction: params.system,
          maxOutputTokens: params.maxTokens,
          tools: normalizeTools(params.tools),
        },
      });

      // Extract text from response candidates
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
              // Gemini doesn't provide a call id; generate one for the
              // Anthropic-compatible tool loop in the agent runtime.
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
