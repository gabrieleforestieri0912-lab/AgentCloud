import type { LLMChatParams, LLMMessage, LLMProvider, LLMResponse, LLMTool } from "./types";

/**
 * Provider OpenAI-compatibile (usato per chiave sk-xt-...).
 *
 * Si attiva con:
 *   XT_API_KEY=sk-xt-... (fornita dall'utente)
 *   XT_API_BASE=https://api.example.com/v1  (opzionale, default OpenAI)
 *   XT_MODEL=gpt-4o-mini (opzionale)
 *   AGENT_LLM_PROVIDER=xt  o  openai
 *
 * Accetta anche OPENAI_API_KEY / OPENAI_API_BASE come fallback.
 * Mappa modelli claude-* sul default OpenAI.
 */

const DEFAULT_OPENAI_MODEL = process.env.XT_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

function getApiKey(override?: string): string | undefined {
  return override || process.env.XT_API_KEY || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.startsWith("sk-xt-") ? process.env.ANTHROPIC_API_KEY : undefined;
}

function getBaseUrl(override?: string): string {
  const raw = override || process.env.XT_API_BASE || process.env.OPENAI_API_BASE || process.env.LLM_API_BASE || DEFAULT_BASE_URL;
  return raw.replace(/\/$/, "");
}

function resolveModel(requested?: string): string {
  if (!requested) return DEFAULT_OPENAI_MODEL;
  if (requested.startsWith("claude")) return DEFAULT_OPENAI_MODEL;
  if (requested.startsWith("gpt") || requested.startsWith("o1") || requested.startsWith("o3")) return requested;
  return requested;
}

function normalizeTools(tools: LLMTool[]): unknown[] {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

function llmMessagesToOpenAI(system: string, messages: LLMMessage[]): unknown[] {
  const out: unknown[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (typeof m.content === "string") {
      out.push({ role: m.role, content: m.content });
      continue;
    }
    if (Array.isArray(m.content) && m.content.length > 0) {
      const first = m.content[0] as Record<string, unknown>;
      if (first.type === "text" || first.type === "image") {
        const blocks = m.content as unknown as { type: string; text?: string; source?: { media_type: string; data: string } }[];
        const content: unknown[] = blocks.map((b) => {
          if (b.type === "image" && b.source) {
            return {
              type: "image_url",
              image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` },
            };
          }
          return { type: "text", text: b.text ?? "" };
        });
        out.push({ role: m.role, content });
        continue;
      }
      // toolUses (assistant) or toolResults (user)
      if (m.role === "assistant") {
        const uses = m.content as unknown as { id: string; name: string; input: Record<string, unknown> }[];
        out.push({
          role: "assistant",
          content: null,
          tool_calls: uses.map((u) => ({
            id: u.id,
            type: "function",
            function: { name: u.name, arguments: JSON.stringify(u.input) },
          })),
        });
        continue;
      } else {
        // user tool results -> role tool
        const results = m.content as unknown as { id: string; content: string }[];
        for (const r of results) {
          out.push({ role: "tool", tool_call_id: r.id, content: r.content });
        }
        continue;
      }
    }
  }
  return out;
}

export function createOpenAIProvider(options?: { apiKey?: string; baseUrl?: string; model?: string }): LLMProvider {
  const defaultModel = options?.model || DEFAULT_OPENAI_MODEL;

  function getRuntimeApiKey(): string | undefined {
    return options?.apiKey || process.env.XT_API_KEY || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || (process.env.ANTHROPIC_API_KEY?.startsWith("sk-xt-") ? process.env.ANTHROPIC_API_KEY : undefined);
  }
  function ensureKey(): string {
    const k = getRuntimeApiKey();
    if (!k) {
      throw new Error("OpenAI/XT provider requires XT_API_KEY (sk-xt-...) or OPENAI_API_KEY environment variable.");
    }
    return k;
  }
  function getRuntimeBaseUrl(): string {
    return getBaseUrl(options?.baseUrl);
  }

  return {
    name: "anthropic" as unknown as LLMProvider["name"], // keep type compatible, actual name is openai/xt

    async chat(params: LLMChatParams, onText?: (delta: string) => void): Promise<LLMResponse> {
      const key = ensureKey();
      const baseUrl = getRuntimeBaseUrl();
      console.log(`[xKiro] baseUrl=${baseUrl} model=${params.model}->${resolveModel(params.model || defaultModel)} keyPrefix=${key.slice(0,8)} len=${key.length} hasXT=${!!process.env.XT_API_KEY} xtLen=${process.env.XT_API_KEY?.length}`);
      const model = resolveModel(params.model || defaultModel);
      const messages = llmMessagesToOpenAI(params.system, params.messages);
      const tools = params.tools.length > 0 ? normalizeTools(params.tools) : undefined;

      const body: Record<string, unknown> = {
        model,
        messages,
        max_tokens: params.maxTokens,
        stream: Boolean(onText),
      };
      if (tools) {
        body.tools = tools;
        body.tool_choice = "auto";
      }

      // Streaming path
      if (onText) {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "x-api-key": key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`OpenAI API error ${res.status}: ${text.slice(0, 500)}`);
        }
        if (!res.body) throw new Error("OpenAI streaming response has no body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        const toolUses: LLMResponse["toolUses"] = [];
        // accumulator for tool call arguments streaming
        const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();
        let usage = { inputTokens: 0, outputTokens: 0 };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data: ")) continue;
            let data: {
              choices?: { delta?: { content?: string; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] }; finish_reason?: string | null }[];
              usage?: { prompt_tokens?: number; completion_tokens?: number };
            };
            try {
              data = JSON.parse(trimmed.slice(6));
            } catch {
              continue;
            }
            if (data.usage) {
              usage = {
                inputTokens: data.usage.prompt_tokens ?? usage.inputTokens,
                outputTokens: data.usage.completion_tokens ?? usage.outputTokens,
              };
            }
            const choice = data.choices?.[0];
            if (!choice) continue;
            const delta = choice.delta;
            if (delta?.content) {
              fullText += delta.content;
              onText(delta.content);
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                const cur = toolCallsMap.get(idx) || { id: "", name: "", arguments: "" };
                if (tc.id) cur.id = tc.id;
                if (tc.function?.name) cur.name = tc.function.name;
                if (tc.function?.arguments) cur.arguments += tc.function.arguments;
                toolCallsMap.set(idx, cur);
              }
            }
            if (choice.finish_reason === "tool_calls") {
              for (const [, v] of toolCallsMap) {
                let input: Record<string, unknown> = {};
                try {
                  input = JSON.parse(v.arguments || "{}");
                } catch {
                  input = {};
                }
                toolUses.push({ id: v.id || `call_${toolUses.length}`, name: v.name, input });
              }
            }
          }
        }
        // fallback if tool_calls finished without finish_reason
        if (toolUses.length === 0 && toolCallsMap.size > 0) {
          for (const [, v] of toolCallsMap) {
            if (v.name) {
              let input: Record<string, unknown> = {};
              try {
                input = JSON.parse(v.arguments || "{}");
              } catch {
                input = {};
              }
              toolUses.push({ id: v.id || `call_${toolUses.length}`, name: v.name, input });
            }
          }
        }

        return {
          text: fullText,
          toolUses,
          stopReason: toolUses.length > 0 ? "tool_use" : "end_turn",
          usage,
        };
      }

      // Non-streaming
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "x-api-key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...body, stream: false }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`OpenAI API error ${res.status}: ${text.slice(0, 500)}`);
      }
      const json = (await res.json()) as {
        choices: { message: { content?: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] }; finish_reason?: string }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const choice = json.choices?.[0];
      const text = choice?.message?.content ?? "";
      const toolUses: LLMResponse["toolUses"] = [];
      if (choice?.message?.tool_calls) {
        for (const tc of choice.message.tool_calls) {
          let input: Record<string, unknown> = {};
          try {
            input = JSON.parse(tc.function.arguments || "{}");
          } catch {
            input = {};
          }
          toolUses.push({ id: tc.id, name: tc.function.name, input });
        }
      }
      return {
        text,
        toolUses,
        stopReason: toolUses.length > 0 ? "tool_use" : choice?.finish_reason === "length" ? "max_tokens" : "end_turn",
        usage: {
          inputTokens: json.usage?.prompt_tokens ?? 0,
          outputTokens: json.usage?.completion_tokens ?? 0,
        },
      };
    },
  };
}

export const openAIProvider: LLMProvider = createOpenAIProvider();
