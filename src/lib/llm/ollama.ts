import type {
  LLMChatParams,
  LLMMessage,
  LLMProvider,
  LLMResponse,
  LLMTool,
} from "./types";

/**
 * Ollama provider — temporary local LLM backend for development and testing
 * (llama3, llama3.2, deepseek-r1, etc.). The production path is the Anthropic
 * provider; this one is used while no valid ANTHROPIC_API_KEY is configured
 * (default resolver behaviour) or when `AGENT_LLM_PROVIDER=ollama` is forced.
 *
 * The provider normalizes the shared `LLMMessage`/`LLMTool` shapes into the
 * Ollama REST API format (`/api/chat`, OpenAI-style tools) and maps the
 * response back into `LLMResponse` with real token usage.
 */

const DEFAULT_OLLAMA_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "llama3";

/** Convert a shared message into Ollama's { role, content } text format. */
function toOllamaMessages(messages: LLMMessage[]): Array<{
  role: string;
  content: string;
}> {
  const out: Array<{ role: string; content: string }> = [];
  for (const message of messages) {
    if (typeof message.content === "string") {
      out.push({ role: message.role, content: message.content });
      continue;
    }
    if (message.role === "assistant" && Array.isArray(message.content)) {
      // Tool calls requested by the assistant — rendered as text for Ollama.
      const uses = message.content as { name: string; input: unknown }[];
      out.push({
        role: "assistant",
        content: uses
          .map((u) => `[tool_use ${u.name} ${JSON.stringify(u.input ?? {})}]`)
          .join("\n"),
      });
      continue;
    }
    // User tool results.
    const results = message.content as { content: string }[];
    out.push({
      role: "user",
      content: results.map((r) => r.content).join("\n"),
    });
  }
  return out;
}

/** Convert shared tools into the OpenAI-compatible tool format Ollama expects. */
function toOllamaTools(tools: LLMTool[]) {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

export function createOllamaProvider(options?: {
  url?: string;
  model?: string;
}): LLMProvider {
  const url = options?.url || process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL;
  const model = options?.model || process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

  return {
    name: "ollama",

    async chat(params: LLMChatParams): Promise<LLMResponse> {
      const response = await fetch(`${url}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: params.system },
            ...toOllamaMessages(params.messages),
          ],
          tools: toOllamaTools(params.tools),
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const text: string = data.message?.content ?? "";
      const rawToolCalls = data.message?.tool_calls ?? [];

      const toolUses = rawToolCalls.map(
        (call: { function?: { name?: string; arguments?: string } }, i: number) => {
          let input: Record<string, unknown> = {};
          try {
            input = call.function?.arguments
              ? (JSON.parse(call.function.arguments) as Record<string, unknown>)
              : {};
          } catch {
            // malformed arguments — pass through as empty
          }
          return {
            id: `toolu_ollama_${i}`,
            name: call.function?.name ?? "unknown",
            input,
          };
        },
      );

      return {
        text,
        toolUses,
        stopReason: toolUses.length > 0 ? "tool_use" : "end_turn",
        usage: {
          inputTokens: data.prompt_eval_count ?? 0,
          outputTokens: data.eval_count ?? 0,
        },
      };
    },
  };
}

export const ollamaProvider: LLMProvider = createOllamaProvider();
