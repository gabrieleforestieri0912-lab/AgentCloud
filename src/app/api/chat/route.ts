import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { buildPlatformSystemPrompt } from "@/lib/agents/platform-context";
import { getLocale } from "@/lib/i18n/locale";
import { getLLMProvider } from "@/lib/llm";
import type { LLMMessage } from "@/lib/llm";
import { createWordEmitter } from "@/lib/stream";
import { apiErrorMessage } from "@/lib/i18n/api-errors";

/**
 * POST /api/chat
 *
 * Provider-agnostic chat endpoint used by the hero demo and the full chat UI.
 *
 * Body: { messages, model?, agentId? }
 *
 * The model backend is resolved via `getLLMProvider()` — the Anthropic
 * (Claude) backend when `ANTHROPIC_API_KEY` is configured. The default model
 * is `claude-sonnet-5` (override with `AGENT_LLM_MODEL`).
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

    // Locale is read up-front so the slow platform-prompt build (live DB
    // query) can happen lazily inside the stream without delaying headers.
    const locale = await getLocale();

    // Model from the agent registry when an agent is targeted. Clients may
    // send a model name (e.g. from an agent config). If it isn't a Claude
    // model, the Anthropic provider maps it to the configured default, so
    // here we always pass a valid Claude model to the backend.
    let resolvedModel = model;
    if (agentId && AGENT_RUNTIME[agentId]) {
      resolvedModel = AGENT_RUNTIME[agentId].model;
    }
    const finalModel =
      resolvedModel && resolvedModel.startsWith("claude")
        ? resolvedModel
        : (process.env.AGENT_LLM_MODEL || "claude-sonnet-5");

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
    const streamErrorMessage = await apiErrorMessage("aiStreamError");

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
            );
          } catch {
            // Client disconnected: the stream is closed. Ignore the write and
            // let the word emitter stop itself on its next tick.
          }
        };

        // System prompt: agent-specific when an agent is targeted, otherwise
        // built from the REAL platform data (active agents and counts read
        // from the agents_registry database — see platform-context). It is
        // built lazily here so headers reach the client immediately and cold
        // starts / slow DB queries never stall the stream before the first
        // byte. A failure degrades to the generic prompt, never to an error.
        let systemPrompt = "You are a helpful AI assistant.";
        try {
          systemPrompt =
            agentId && AGENT_RUNTIME[agentId]
              ? AGENT_RUNTIME[agentId].systemPrompt
              : await buildPlatformSystemPrompt(locale);
        } catch {
          // Keep the generic prompt — never fail the chat because the
          // platform prompt could not be built.
        }

        // Re-emit the provider's text deltas one word at a time so the
        // message types out in every chat UI instead of appearing whole.
        const emitter = createWordEmitter((word) =>
          send({ type: "text", content: word }),
        );

        try {
          await provider.chat(
            {
              model: finalModel,
              system: systemPrompt,
              messages: conversationMessages,
              tools: [],
              maxTokens: Number(process.env.AGENT_MAX_TOKENS || 1024),
            },
            (delta) => emitter.push(delta),
          );

          await emitter.flush();
          send({ type: "done" });
        } catch {
          emitter.stop();
          send({ type: "error", message: streamErrorMessage });
        } finally {
          try {
            controller.close();
          } catch {
            // Already closed (client disconnected mid-stream).
          }
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
      { error: await apiErrorMessage("aiConnectionFailed") },
      { status: 500 },
    );
  }
}
