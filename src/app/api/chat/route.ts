import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { buildPlatformSystemPrompt } from "@/lib/agents/platform-context";
import { getLocale } from "@/lib/i18n/locale";
import {
  lastUserText,
  replyLanguage,
  withLanguageDirective,
} from "@/lib/agents/language";
import { getLLMProvider } from "@/lib/llm";
import type { LLMMessage, LLMResponse, LLMTool, LLMToolResult } from "@/lib/llm";
import { createWordEmitter } from "@/lib/stream";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/agents/tools";
import {
  GITHUB_REPO_TOOL_DEFINITIONS,
  buildGithubRepoContext,
} from "@/lib/agents/github-repo-tools";
import {
  buildApprovalToken,
  toolRequiresConfirmation,
  verifyApprovalToken,
} from "@/lib/agents/tool-confirmation";
import { getSessionUser } from "@/lib/supabase/server";
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
import { checkFreeUsage, consumeFreeUsage } from "@/lib/billing/free-usage";
import { guestUsageCookie, readGuestUsed } from "@/lib/billing/guest-counter";
import {
  assertPrimaryPoolAllowed,
  recordUsage,
} from "@/lib/billing/usage-tracking";
import {
  DEMO_AGENT_SLUG,
  GENERIC_AGENT_SLUG,
  getPrimaryTokenPool,
} from "@/lib/billing/token-pool";

/**
 * POST /api/chat
 *
 * Endpoint chat indipendente dal provider, usato dalla demo hero e dalla UI
 * chat completa.
 *
 * Body: { messages, model?, agentId?, provider?, ephemeral?, webSearch?,
 *         githubRepo?, approval? }
 *
 * `provider` è un override esplicito ("xt" | "anthropic") usato da UNA sola
 * superficie: la demo hero invia `provider: "xt"` così usa sempre la chiave
 * economica xKiro. Tutto il resto (chat con agente, agent/run) usa il default
 * di configurazione (`AGENT_LLM_PROVIDER`: `xt`/xKiro o `anthropic`).
 * Valori non riconosciuti vengono ignorati.
 *
 * `ephemeral: true` marca la richiesta come "chat fantasma" (modalità Ghost):
 * la risposta non viene conservata da nessuna parte e la run non lascia tracce
 * nei log. Questa route non scrive MAI messaggi su DB (la cronologia vive nel
 * browser), ma in modalità Ghost disattiva anche il log di audit: nessun
 * metadata della conversazione deve uscire dal server.
 * Il backend del modello è risolto con `getLLMProvider()`: xKiro
 * (OpenAI-compatible, `XT_API_KEY`) quando è configurato, Anthropic (Claude)
 * altrimenti. Il modello predefinito è quello del backend scelto
 * (`XT_MODEL` su xKiro, `AGENT_LLM_MODEL` su Anthropic).
 *
 * `webSearch: true` espone il tool `web_search` (acceso dal menu "+" della
 * chat): senza quel flag la chat resta senza ricerca sul web.
 *
 * `githubRepo: { owner, repo, branch? }` è il repository GitHub collegato
 * dalla chat: espone i tool `github_repo_*` (leggere i file, scriverci, aprire
 * branch e pull request) e aggiunge il contesto del repository al prompt.
 * Le scritture chiedono la conferma all'utente, come in /api/agent/run.
 *
 * `approval: { token }` riprende una run ferma su una conferma: il token
 * firmato contiene il batch di tool approvato, il client non può cambiarlo.
 *
 * Stream SSE: chunk `data: { type: "text", content }`, poi
 * `data: { type: "done" }` (oppure `type: "error"` in caso di errore).
 */
export async function POST(req: Request) {
  try {
    const {
      messages,
      model,
      agentId,
      provider: providerOverride,
      // Modalità Ghost: la richiesta non deve lasciare tracce.
      ephemeral,
      // Ricerca web e repository GitHub collegato (menu "+" della chat).
      webSearch,
      githubRepo,
      approval,
      // Superficie della richiesta: "demo" (chat di prova sulla home) o
      // "chat" (la chat vera, con o senza agente).
      surface,
    } = await req.json();
    const isEphemeral = ephemeral === true;
    const isDemoSurface = surface === "demo";

    if (!Array.isArray(messages)) {
      return Response.json(
        { error: "messages must be an array" },
        { status: 400 },
      );
    }

    // Repository collegato: solo forma nota (owner/repo/branch), niente URL.
    const linkedRepo =
      githubRepo &&
      typeof githubRepo === "object" &&
      typeof (githubRepo as { owner?: unknown }).owner === "string" &&
      typeof (githubRepo as { repo?: unknown }).repo === "string"
        ? {
            owner: String((githubRepo as { owner: string }).owner).trim(),
            repo: String((githubRepo as { repo: string }).repo).trim(),
            branch:
              typeof (githubRepo as { branch?: unknown }).branch === "string" &&
              (githubRepo as { branch: string }).branch
                ? String((githubRepo as { branch: string }).branch).trim()
                : undefined,
          }
        : null;
    const repoRef = linkedRepo?.owner && linkedRepo?.repo ? linkedRepo : null;

    // La locale viene letta subito così la costruzione lenta del prompt di
    // piattaforma (query live sul DB) può avvenire in modo lazy dentro lo
    // stream senza ritardare gli header.
    const locale = await getLocale();

    // Il chiamante è risolto lato server dalla sessione (mai dal body): serve
    // per il token GitHub del tenant e per la conferma dei tool che scrivono.
    const sessionUser = await getSessionUser();
    const userId = sessionUser?.id ?? "anonymous";
    const tenantId = sessionUser?.id ?? undefined;
    // Tenant per i token di conferma: non vuoto mai ("anonymous" per chi non
    // ha una sessione), altrimenti il token firmato non supererebbe la
    // validazione della forma e la conferma non potrebbe mai riprendersi.
    const effectiveTenant = userId;

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

    // ── Piano gratuito: un solo contatore per tutta la piattaforma ─────────
    //
    // Il freemium è 5 messaggi al giorno IN TOTALE: demo della home, chat
    // generica e agenti contano sullo stesso contatore (è quello che la copy
    // promette). Chi non è abbonato e ha finito i suoi 5 non può più scrivere
    // da nessuna parte; chi è abbonato non ha limiti (il suo vincolo è il pool
    // di token, vedi assertPrimaryPoolAllowed).
    const ip = getClientIp(req);
    const primaryPool = userId === "anonymous" ? null : await getPrimaryTokenPool(userId);
    const isSubscriber = Boolean(primaryPool);

    if (!isSubscriber) {
      const guestUsed = readGuestUsed(req);
      const free = await checkFreeUsage(userId, {
        ip: ip ?? undefined,
        guestUsed,
      });
      if (!free.allowed) {
        return Response.json(
          {
            error: apiErrorMessageForLocale(locale, "freeLimitReached"),
            code: "FREE_LIMIT_REACHED",
            remaining: free.remaining,
            limit: free.limit,
          },
          { status: 402 },
        );
      }
    } else if (!isDemoSurface) {
      // Abbonato: la chat generica consuma il pool principale.
      const check = await assertPrimaryPoolAllowed(userId, locale);
      if (!check.allowed) {
        return Response.json(
          { error: check.message, code: check.code },
          { status: check.status },
        );
      }
    }

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
        // client e cold start / query DB lenta non bloccano lo stream prima
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
        // Repository collegato: il modello deve sapere che esiste e quali tool
        // usare, altrimenti non li chiama mai.
        const repoContext = buildGithubRepoContext(repoRef);
        if (repoContext) systemPrompt = `${systemPrompt}\n\n${repoContext}`;

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
          // Con il menu "+" l'utente può accendere la ricerca web e
          // collegare un repository GitHub: in quel caso i tool corrispondenti
          // vengono esposti (le scritture sul repository chiedono conferma).
          const MAX_TOOL_ITERATIONS = 3;
          const chatTools: LLMTool[] = [TOOL_DEFINITIONS.scrape_page].filter(Boolean);
          if (webSearch === true) {
            const webTool = TOOL_DEFINITIONS.web_search;
            if (webTool) chatTools.push(webTool);
          }
          if (repoRef) {
            chatTools.push(...Object.values(GITHUB_REPO_TOOL_DEFINITIONS));
          }

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

          // Ripresa dopo una conferma: il token firmato porta il batch di
          // tool_use approvato. Lo eseguiamo e iniettiamo
          // assistant(tool_use) + user(results), così il loop continua come se
          // la conferma non fosse mai esistita.
          if (approval?.token) {
            const pending = verifyApprovalToken(approval.token);
            const confirmed = pending ? pending.u[pending.c] : undefined;
            if (
              !pending ||
              pending.t !== effectiveTenant ||
              !confirmed ||
              !toolRequiresConfirmation(confirmed.name)
            ) {
              emitter.stop();
              send({ type: "error", message: streamErrorMessage });
              return;
            }
            const results: LLMToolResult[] = [];
            for (const use of pending.u) {
              const startedAt = Date.now();
              const content = await executeTool(
                use.name,
                use.input as Record<string, string>,
                {
                  userId,
                  tenantId,
                  files: undefined,
                  ephemeral: isEphemeral,
                  githubRepo: repoRef ?? undefined,
                },
              );
              results.push({ id: use.id, content });
              if (!isEphemeral) {
                logAudit("tool_exec", {
                  tool: use.name,
                  durationMs: Date.now() - startedAt,
                  resultBytes: content.length,
                  surface: "chat",
                });
              }
            }
            chatMessages = [
              ...chatMessages,
              { role: "assistant", content: pending.u },
              { role: "user", content: results },
            ];
          }

          for (let iteration = 0; iteration <= MAX_TOOL_ITERATIONS; iteration++) {
            response = await chatWithTools(chatMessages);
            await emitter.flush();

            if (response.stopReason !== "tool_use" || response.toolUses.length === 0) {
              break;
            }

            // Scritture (es. su un file del repository GitHub): prima di
            // eseguire, l'utente conferma. Il token firmato contiene il batch
            // approvato, quindi il client non può cambiarne i parametri.
            const confirmIndex = response.toolUses.findIndex((u) =>
              toolRequiresConfirmation(u.name),
            );
            if (confirmIndex >= 0) {
              const pendingUse = response.toolUses[confirmIndex];
              const token = buildApprovalToken({
                t: effectiveTenant,
                a: agentId || "chat",
                u: response.toolUses.map((u) => ({
                  id: u.id,
                  name: u.name,
                  input: u.input,
                })),
                c: confirmIndex,
              });
              send({
                type: "tool_confirm",
                toolName: pendingUse.name,
                toolInput: pendingUse.input,
                toolUseId: pendingUse.id,
                token,
              });
              send({ type: "awaiting_confirmation" });
              emitter.stop();
              return;
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
                {
                  userId,
                  tenantId,
                  files: undefined,
                  ephemeral: isEphemeral,
                  githubRepo: repoRef ?? undefined,
                },
              );
              results.push({ id: use.id, content });
              // Modalità Ghost: nessun log di audit (il log di tool è un
              // metadata della conversazione e non deve essere scritto).
              if (!isEphemeral) {
                logAudit("tool_exec", {
                  tool: use.name,
                  durationMs: Date.now() - startedAt,
                  resultBytes: content.length,
                  surface: "chat",
                });
              }
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

          // ── Uso registrato ────────────────────────────────────────────────
          // Solo token: nessun contenuto della conversazione viene scritto,
          // quindi la modalità Ghost resta garantita. La run fa avanzare il
          // contatore del piano gratuito (utenti autenticati: conta le run
          // di oggi) e consuma il pool (abbonati: la chat generica pesa sul
          // pool principale).
          const inputTokens = response.usage.inputTokens;
          const outputTokens = response.usage.outputTokens;
          await recordUsage({
            user_id: userId,
            agent_slug: isDemoSurface ? DEMO_AGENT_SLUG : GENERIC_AGENT_SLUG,
            // In modalità Ghost nessuna conversazione: il collegamento resta
            // vuoto (la run non appartiene a nessuna chat salvata).
            conversation_id: isEphemeral ? undefined : crypto.randomUUID(),
            tokens_input: inputTokens,
            tokens_output: outputTokens,
            ephemeral: isEphemeral,
          });
          await consumeFreeUsage(userId, ip ?? undefined);

          // Quota residua: la UI (la demo della home) mostra "3/5 rimasti"
          // senza dover ricontare i messaggi da sola.
          //
          // Il contatore del dispositivo va letto +1: il messaggio appena
          // consumato l'ha già incrementato, e la quota mostrata deve
          // riflettere quello (non il valore di prima della richiesta).
          const guestUsed = readGuestUsed(req);
          const quota = isSubscriber
            ? null
            : await checkFreeUsage(userId, {
                ip: ip ?? undefined,
                guestUsed: guestUsed === null ? null : guestUsed + 1,
              });
          send({
            type: "done",
            quota: quota
              ? { remaining: quota.remaining, limit: quota.limit }
              : null,
          });
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
        // Modalità Ghost: niente cache, niente memorizzazione intermediate.
        "Cache-Control": isEphemeral ? "no-store" : "no-cache",
        Connection: "keep-alive",
        // Contatore del dispositivo per l'ospite: così chi sta dietro una
        // NAT non consuma la quota dei colleghi (vedi guest-counter.ts).
        ...(userId === "anonymous" && !isSubscriber
          ? {
              "Set-Cookie": guestUsageCookie((readGuestUsed(req) ?? 0) + 1),
            }
          : {}),
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
