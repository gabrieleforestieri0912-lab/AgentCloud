import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { buildPlatformSystemPrompt } from "@/lib/agents/platform-context";
import { getLocale } from "@/lib/i18n/locale";
import {
  lastUserText,
  replyLanguage,
  withLanguageDirective,
} from "@/lib/agents/language";
import { getLLMProvider } from "@/lib/llm";
import type { LLMMessage, LLMResponse, LLMToolResult } from "@/lib/llm";
import { createWordEmitter } from "@/lib/stream";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/agents/tools";
import { logAudit } from "@/lib/audit";
import {
  CONNECT_GUIDANCE_CHAT,
  STUDY_DIRECTIVE,
  buildAgentSystemPrompt,
  sharedAgentDirectives,
} from "@/lib/agents/system-prompt";
import {
  EXAMPLE_LINKS_DIRECTIVE,
  LINK_ANALYSIS_DIRECTIVE,
} from "@/lib/agents/output-format";
import { extractConnectMarkers, requestedConnectProviders } from "@/lib/integrations";
import { apiErrorMessage, apiErrorMessageForLocale } from "@/lib/i18n/api-errors";
import { getClientIp } from "@/lib/request-ip";
import { RATE_LIMIT_WINDOWS, rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/chat
 *
 * Endpoint chat indipendente dal provider, usato dalla demo hero e dalla UI
 * chat completa.
 *
 * Body: { messages, model?, agentId?, provider? }
 *
 * `provider` è un override esplicito ("xt" | "anthropic") usato da UNA sola
 * superficie: la demo hero invia `provider: "xt"` così usa sempre la chiave
 * economica xKiro. Tutto il resto (chat con agente, agent/run) usa il default
 * di configurazione (Anthropic in produzione). Valori non riconosciuti
 * vengono ignorati.
 * Il backend del modello è risolto con `getLLMProvider()` — quello Anthropic
 * (Claude) quando `ANTHROPIC_API_KEY` è configurata. Il modello predefinito è
 * `claude-sonnet-5` (sovrascrivibile con `AGENT_LLM_MODEL`).
 *
 * Stream SSE: chunk `data: { type: "text", content }`, poi
 * `data: { type: "done" }` (oppure `type: "error"` in caso di errore).
 */
export async function POST(req: Request) {
  try {
    const { messages, model, agentId, provider: providerOverride } = await req.json();

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
        if (Array.isArray(msg.content)) {
          return {
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content as unknown as LLMMessage["content"],
          };
        }
        return {
          role: msg.role === "assistant" ? "assistant" : "user",
          content:
            typeof msg.content === "string" ? msg.content : (msg.content as string) ?? "",
        };
      },
    );

    // Lingua della risposta: quella dell'ultimo messaggio, con la lingua della
    // piattaforma come default quando il messaggio non ne indica una.
    const replyLocale = replyLanguage(
      locale,
      lastUserText(conversationMessages),
    );

    // Override esplicito solo dalla hero (provider: "xt"); tutto il resto
    // usa il default di configurazione. La allowlist vive in getLLMProvider.
    const provider = getLLMProvider(
      typeof providerOverride === "string" ? providerOverride : undefined,
    );
    const encoder = new TextEncoder();
    // Riusa la locale già risolta sopra: `apiErrorMessage` rileggerebbe i
    // cookie con una seconda `getLocale()`.
    const streamErrorMessage = apiErrorMessageForLocale(locale, "aiStreamError");

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
        // La direttiva di lingua è accodata a ogni variante del prompt
        // (anche a quella generica di ripiego).
        // Direttive condivise (connect guidance + blocchi fenced con bottone
        // "Copia" + identità AgentCloud + regola di consegna): definite una
        // volta sola in lib/agents/system-prompt.ts, come per /api/agent/run.
        const connectGuidanceChat = sharedAgentDirectives(CONNECT_GUIDANCE_CHAT);
        let systemPrompt = withLanguageDirective(
          "You are a helpful AI assistant." + connectGuidanceChat,
          replyLocale,
        );
        try {
          systemPrompt =
            agentId && AGENT_RUNTIME[agentId]
              ? buildAgentSystemPrompt(
                  AGENT_RUNTIME[agentId].systemPrompt,
                  replyLocale,
                )
              : // Il prompt di piattaforma è scritto nella lingua della
                // risposta (contiene elenchi, prezzi e regole) e chiude già
                // con la direttiva.
                (await buildPlatformSystemPrompt(replyLocale)) + connectGuidanceChat + "\n\n" + EXAMPLE_LINKS_DIRECTIVE + "\n\n" + LINK_ANALYSIS_DIRECTIVE + "\n\n" + STUDY_DIRECTIVE;
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
          // Loop dei tool: il modello può chiedere di LEGGERE una pagina
          // (scrape_page) prima di rispondere — è quello che rende possibile
          // analizzare un link che l'utente incolla. Prima questa route
          // passava `tools: []`, quindi in chat nessun link era leggibile.
          const MAX_TOOL_ITERATIONS = 3;
          const chatTools = [TOOL_DEFINITIONS.scrape_page].filter(Boolean);

          const chatWithTools = async (messages: LLMMessage[]) => {
            try {
              return await provider.chat(
                {
                  model: finalModel,
                  system: systemPrompt,
                  messages,
                  tools: chatTools,
                  maxTokens: Number(process.env.AGENT_MAX_TOKENS || 2048),
                },
                (delta) => emitter.push(delta),
              );
            } catch {
              // Provider che non supportano i tool (backend economico della
              // demo): si ripiega su una chiamata senza tool invece di far
              // fallire l'intera risposta.
              return await provider.chat(
                {
                  model: finalModel,
                  system: systemPrompt,
                  messages,
                  tools: [],
                  maxTokens: Number(process.env.AGENT_MAX_TOKENS || 2048),
                },
                (delta) => emitter.push(delta),
              );
            }
          };

          let chatMessages = conversationMessages;
          let response: LLMResponse | null = null;

          for (let iteration = 0; iteration <= MAX_TOOL_ITERATIONS; iteration++) {
            response = await chatWithTools(chatMessages);
            await emitter.flush();

            if (response.stopReason !== "tool_use" || response.toolUses.length === 0) {
              break;
            }

            const results: LLMToolResult[] = [];
            for (const use of response.toolUses) {
              // Le letture di pagina costano banda e tempo di server: un tetto
              // per IP evita che la chat diventi un proxy per siti terzi. Superato
              // il tetto, il tool risponde con un messaggio e la chat va avanti.
              const rl = await rateLimit("chat-page-fetch", getClientIp(req), {
                limit: 20,
                windowMs: RATE_LIMIT_WINDOWS.MINUTE_MS,
              });
              if (!rl.allowed) {
                results.push({
                  id: use.id,
                  content: `Fetch error: too many page reads from this address. Try again in ${rl.retryAfterSeconds} seconds.`,
                });
                continue;
              }
              const startedAt = Date.now();
              const content = await executeTool(
                use.name,
                use.input as Record<string, string>,
                { userId: "anonymous", tenantId: undefined, files: undefined },
              );
              results.push({ id: use.id, content });
              logAudit("tool_exec", {
                tool: use.name,
                durationMs: Date.now() - startedAt,
                resultBytes: content.length,
                surface: "chat",
              });
            }

            // Il modello riceve l'esito del tool e continua: è il giro
            // successivo a trasformarlo in risposta.
            chatMessages = [
              ...chatMessages,
              { role: "assistant", content: response.toolUses },
              { role: "user", content: results },
            ];
          }

          if (!response) {
            emitter.stop();
            send({ type: "error", message: streamErrorMessage });
            return;
          }

          // Card di connessione solo su richiesta esplicita dell'utente in
          // questo turno ("collega Gmail"). Qui il modello non ha tool, quindi
          // l'unico segnale è il marker nel testo — ma se l'utente non ha
          // chiesto di collegare nulla, nessun evento parte e nessuna card
          // compare. La UI deduplica i marker con gli eventi.
          const requested = new Set(
            requestedConnectProviders(lastUserText(conversationMessages) ?? ""),
          );
          const seenConnections = new Set<string>();
          for (const provider of extractConnectMarkers(response.text)) {
            if (!requested.has(provider)) continue;
            if (seenConnections.has(provider)) continue;
            seenConnections.add(provider);
            send({ type: "connection", provider });
          }

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
