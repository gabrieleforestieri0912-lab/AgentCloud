import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { getLLMProvider } from "@/lib/llm";
import type { LLMMessage } from "@/lib/llm";
import { apiErrorMessage } from "@/lib/i18n/api-errors";

/**
 * POST /api/chat
 *
 * Provider-agnostic chat endpoint used by the hero demo and the full chat UI.
 *
 * Body: { messages, model?, agentId? }
 *
 * The model backend is resolved via `getLLMProvider()` — Anthropic when a valid
 * `ANTHROPIC_API_KEY` is configured (production), otherwise the local Ollama
 * backend. This is what makes the chat "work via an API key": drop in a key
 * and a suitable model (override with `AGENT_LLM_MODEL`) and the assistant
 * answers with a real LLM instead of the local fallback.
 *
 * Streams SSE: `data: { type: "text", content }` chunks, then
 * `data: { type: "done" }` (or `type: "error"` on failure).
 */
export async function POST(req: Request) {
  try {
    const { messages, model, agentId } = await req.json();

    if (!Array.isArray(messages)) {
      return Response.json(
        { error: "messages must be an array" },
        { status: 400 },
      );
    }

    // System prompt + model from the agent registry when an agent is targeted.
    let systemPrompt = "You are a helpful AI assistant.";
    let resolvedModel = model;
    if (agentId && AGENT_RUNTIME[agentId]) {
      systemPrompt = AGENT_RUNTIME[agentId].systemPrompt;
      resolvedModel = AGENT_RUNTIME[agentId].model;
    }

    // The hero/full chat default to "llama3.2" (the Ollama model). When a real
    // provider is in use that model name is invalid, so fall back to a suitable
    // configured default (provider-specific).
    const fallbackModel =
      getLLMProvider().name === "gemini"
        ? "gemini-3.6-flash"
        : "claude-sonnet-5";
    const finalModel =
      resolvedModel && resolvedModel !== "llama3.2"
        ? resolvedModel
        : (process.env.AGENT_LLM_MODEL || fallbackModel);

    const conversationMessages: LLMMessage[] = (messages as unknown[]).map(
      (m) => {
        const msg = m as { role?: string; content?: unknown };
        return {
          role: msg.role === "assistant" ? "assistant" : "user",
          content:
            typeof msg.content === "string" ? msg.content : (msg.content as string) ?? "",
        };
      },
    );

    const provider = getLLMProvider();
    const encoder = new TextEncoder();
    const streamErrorMessage = await apiErrorMessage("ollamaStreamError");

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

        try {
          const response = await provider.chat({
            model: finalModel,
            system: systemPrompt,
            messages: conversationMessages,
            tools: [],
            maxTokens: Number(process.env.AGENT_MAX_TOKENS || 1024),
          });

          if (response.text) send({ type: "text", content: response.text });
          send({ type: "done" });
        } catch {
          send({ type: "error", message: streamErrorMessage });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return Response.json(
      { error: await apiErrorMessage("ollamaConnectionFailed") },
      { status: 500 },
    );
  }
}
