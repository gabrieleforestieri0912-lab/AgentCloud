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
 * Endpoint chat indipendente dal provider, usato dalla demo hero e dalla UI
 * chat completa.
 *
 * Body: { messages, model?, agentId? }
 *
 * Il backend del modello è risolto con `getLLMProvider()` — quello Anthropic
 * (Claude) quando `ANTHROPIC_API_KEY` è configurata. Il modello predefinito è
 * `claude-sonnet-5` (sovrascrivibile con `AGENT_LLM_MODEL`).
 *
 * Stream SSE: chunk `data: { type: "text", content }`, poi
 * `data: { type: "done" }` (oppure `type: "error"` in caso di errore).
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

    // La locale viene letta subito così la costruzione lenta del prompt di
    // piattaforma (query live sul DB) può avvenire in modo lazy dentro lo
    // stream senza ritardare gli header.
    const locale = await getLocale();

    // Modello dal registry degli agenti quando è indicato un agente. I client
    // possono inviare un nome modello (es. dalla config di un agente). Se non
    // è un modello Claude, il provider Anthropic lo mappa sul default
    // configurato, quindi qui passiamo sempre un modello Claude valido.
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
            // Client disconnesso: lo stream è chiuso. Ignora la scrittura e
            // lascia che l'emitter di parole si fermi al tick successivo.
          }
        };

        // System prompt: specifico dell'agente quando è indicato un agente,
        // altrimenti costruito dai dati REALI della piattaforma (agenti attivi
        // e conteggi letti dal DB agents_registry — vedi platform-context).
        // Viene costruito in modo lazy così gli header arrivano subito al
        // client e cold start / query DB lente non bloccano lo stream prima
        // del primo byte. Un errore degrada al prompt generico, mai a un errore.
        let systemPrompt = "You are a helpful AI assistant.";
        try {
          systemPrompt =
            agentId && AGENT_RUNTIME[agentId]
              ? AGENT_RUNTIME[agentId].systemPrompt
              : await buildPlatformSystemPrompt(locale);
        } catch {
          // Mantieni il prompt generico — non far mai fallire la chat perché
          // il prompt di piattaforma non si è potuto costruire.
        }

        // Re-emette i delta di testo del provider una parola alla volta così
        // il messaggio viene "scritto" in ogni UI chat invece di apparire intero.
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
            // Già chiuso (client disconnesso a metà stream).
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
