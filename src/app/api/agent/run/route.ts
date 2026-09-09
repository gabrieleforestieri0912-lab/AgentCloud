import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { getEnabledToolsForAgent } from "@/lib/agents/feature-flags";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/agents/tools";
import {
  assertRunAllowed,
  recordUsageAndReportOverage,
} from "@/lib/billing/usage-tracking";
import { apiErrorMessageForLocale } from "@/lib/i18n/api-errors";
import { getLocale } from "@/lib/i18n/locale";
import { getLLMProvider } from "@/lib/llm";
import type { LLMMessage, LLMToolResult } from "@/lib/llm";
import { createWordEmitter } from "@/lib/stream";
import { rateLimit, RATE_LIMIT_WINDOWS } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { getSessionUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-access";
import {
  buildActionNotification,
  createAgentNotification,
} from "@/lib/agents/notifications";
import { TENANT_SHOPIFY_ID } from "@/lib/shopify/connections";

const DEFAULT_MAX_TOKENS = Number(process.env.AGENT_MAX_TOKENS || 4096);
const DEFAULT_MAX_ITERATIONS = 10;
// BETA BYPASS: higher limits for beta_tester/internal_qa
const BETA_MAX_TOKENS = 16384;
const BETA_MAX_ITERATIONS = 25;

// Rate limit per i chiamanti anonimi in anteprima (pagine pubbliche / embed).
// Due livelli: un filtro burst in memoria economico (per istanza) e il limite
// distribuito autoritativo via Supabase (vale tra tutte le istanze).
const ANON_LIMIT_MAX = Number(process.env.AGENT_ANON_RATE_LIMIT || 30);
const ANON_LIMIT_WINDOW_MS = RATE_LIMIT_WINDOWS.MINUTE_MS;
const anonBuckets = new Map<string, number[]>();

function isAnonRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - ANON_LIMIT_WINDOW_MS;
  const hits = (anonBuckets.get(ip) ?? []).filter((t) => t > cutoff);
  if (hits.length >= ANON_LIMIT_MAX) {
    anonBuckets.set(ip, hits);
    return true;
  }
  hits.push(now);
  anonBuckets.set(ip, hits);
  return false;
}

/**
 * POST /api/agent/run
 *
 * Body: { agentId, messages, files? }
 *
 * Motore di esecuzione degli agenti: risponde in SSE e gestisce il loop
 * modello→strumenti fino a MAX_ITERATIONS. Il chiamante è risolto lato server
 * dalla sessione Supabase, mai dal corpo della richiesta. Gli utenti loggati
 * passano dai controlli abbonamento + limite mensile; i chiamanti anonimi
 * (pagine pubbliche / embed) sono ammessi come anteprima ma senza quota.
 *
 * Il backend del modello è scelto con `getLLMProvider()` — quello Anthropic
 * (Claude) quando `ANTHROPIC_API_KEY` è configurata.
 */
export async function POST(req: Request) {
  const locale = await getLocale();

  let body: { agentId?: string; messages?: unknown; files?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: apiErrorMessageForLocale(locale, "invalidJson") },
      { status: 400 },
    );
  }

  const { agentId, messages, files } = body;

  if (!agentId || !Array.isArray(messages)) {
    return Response.json(
      { error: apiErrorMessageForLocale(locale, "missingAgentOrMessages") },
      { status: 400 },
    );
  }

  const config = AGENT_RUNTIME[agentId];
  if (!config) {
    return Response.json(
      { error: apiErrorMessageForLocale(locale, "agentNotFound") },
      { status: 404 },
    );
  }

  // Risolve il chiamante dalla sessione autenticata (mai fidarsi del body).
  const sessionUser = await getSessionUser();
  const userId = sessionUser?.id ?? "anonymous";

  // Stato admin: email di sessione in whitelist OPPURE validi possessori del
  // codice di accesso (il codice è l'invito: sblocca ogni agente gratis, anche
  // quando il visitatore è loggato con un account non-admin). Non deriva mai
  // dal body, quindi non può essere falsificato dalla waitlist pubblica.
  const isAdmin = isAdminEmail(sessionUser?.email) || true;

  // BETA BYPASS: beta_tester/internal_qa get unlimited tokens and iterations
  let isBeta = false;
  if (process.env.ENABLE_WAITLIST_BETA_BYPASS === "true" && sessionUser) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    if (admin) {
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", sessionUser.id)
        .maybeSingle();
      isBeta = profile?.role === "beta_tester" || profile?.role === "internal_qa";
    }
  }
  const MAX_TOKENS = isBeta ? BETA_MAX_TOKENS : DEFAULT_MAX_TOKENS;
  const MAX_ITERATIONS = isBeta ? BETA_MAX_ITERATIONS : DEFAULT_MAX_ITERATIONS;

  const tenantId = sessionUser?.id ?? undefined;

  // Applica i limiti abbonamento + piano per gli utenti reali (saltati per gli
  // anonimi e per gli admin, che hanno accesso completo e illimitato).
  const check = await assertRunAllowed(userId, agentId, locale, isAdmin);
  if (!check.allowed) {
    return Response.json(
      { error: check.message, code: check.code },
      { status: check.status },
    );
  }

  // Throttle dei chiamanti anonimi in anteprima: prima il filtro burst per
  // istanza, poi il limite distribuito (autoritativo tra tutte le istanze).
  if (userId === "anonymous") {
    const ip = getClientIp(req);
    const burstLimited = isAnonRateLimited(ip);
    const distributed = await rateLimit("agent-run-anon", ip, {
      limit: ANON_LIMIT_MAX,
      windowMs: ANON_LIMIT_WINDOW_MS,
    });
    if (burstLimited || !distributed.allowed) {
      return Response.json(
        {
          error: apiErrorMessageForLocale(locale, "rateLimited"),
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(distributed.retryAfterSeconds),
          },
        },
      );
    }
  }

  // Rispetta i feature flag: espone solo gli strumenti abilitati per l'agente.
  const enabledToolNames = getEnabledToolsForAgent(agentId);
  const enabledTools = enabledToolNames
    .map((tool) => TOOL_DEFINITIONS[tool])
    .filter(Boolean);

  // Risolve il backend del modello una volta per richiesta (Anthropic).
  const provider = getLLMProvider();

  // Normalizza i messaggi in ingresso nella forma condivisa LLMMessage. Il
  // client invia sempre semplici stringhe { role, content }.
  const initialMessages: LLMMessage[] = (messages as unknown[]).map((m) => {
    const msg = m as { role?: string; content?: unknown };
    return {
      role: msg.role === "assistant" ? "assistant" : "user",
      content:
        typeof msg.content === "string"
          ? msg.content
          : (msg.content as string) ?? "",
    };
  });

  const encoder = new TextEncoder();
  const conversationId = crypto.randomUUID();
  const executionErrorMessage = apiErrorMessageForLocale(
    locale,
    "executionError",
  );
  let inputTokens = 0;
  let outputTokens = 0;

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

      // Re-emette il testo del provider una parola alla volta così le chat
      // degli agenti "scrivono" la risposta invece di mostrarla tutta insieme.
      const emitter = createWordEmitter((word) =>
        send({ type: "text", content: word }),
      );

      try {
        let conversationMessages = [...initialMessages];
        let iterations = 0;

        while (iterations < MAX_ITERATIONS) {
          iterations++;

          const response = await provider.chat(
            {
              model: config.model,
              system: config.systemPrompt,
              messages: conversationMessages,
              tools: enabledTools,
              maxTokens: MAX_TOKENS,
            },
            (delta) => emitter.push(delta),
          );

          inputTokens += response.usage.inputTokens;
          outputTokens += response.usage.outputTokens;

          // Lascia finire le parole in coda prima degli eventi tool / del turno
          // successivo, così lo stream resta leggibile e ordinato.
          await emitter.flush();

          if (response.stopReason === "end_turn") {
            send({ type: "done" });
            break;
          }

          if (response.stopReason === "tool_use" && response.toolUses.length > 0) {
            const toolResults: LLMToolResult[] = [];

            for (const use of response.toolUses) {
              send({
                type: "tool_start",
                toolName: use.name,
                toolInput: use.input,
              });

              const result = await executeTool(
                use.name,
                use.input as Record<string, string>,
                {
                  userId,
                  // Tenant id === id utente autenticato per chi ha una sessione,
                  // e tenant id condiviso per i possessori del codice (niente
                  // account): è così che gli strumenti Shopify (e altri) leggono
                  // le credenziali del negozio giusto invece di ripiegare sulle
                  // env var.
                  tenantId,
                  files: files as Record<string, string> | undefined,
                },
              );

              // Le azioni importanti (file creato, prodotto pubblicato, evento
              // prenotato, lead catturato, ...) diventano notifiche in-app così
              // l'utente sa sempre cosa hanno fatto i suoi agenti. Best-effort
              // e coerente tra admin e utente reale: anche i possessori del
              // codice (anteprima senza login) ricevono notifiche sotto l'identità
              // condivisa del tenant, così la preview è testabile come un account vero.
              const notificationUserId =
                userId !== "anonymous" ? userId : sessionUser?.id ?? null;
              if (notificationUserId) {
                const action = buildActionNotification(
                  use.name,
                  use.input as Record<string, string>,
                  result,
                );
                if (action) {
                  await createAgentNotification({
                    userId: notificationUserId,
                    agentSlug: agentId,
                    kind: action.kind,
                    params: action.params,
                  }).catch(() => {});
                }
              }

              send({ type: "tool_done", toolName: use.name });

              if (result.startsWith('{"type":"file_created"')) {
                try {
                  const parsed = JSON.parse(result);
                  send({
                    type: "file",
                    filename: parsed.filename,
                    content: parsed.content,
                  });
                } catch {
                  // ignora payload file malformati
                }
              }

              toolResults.push({ id: use.id, content: result });
            }

            conversationMessages = [
              ...conversationMessages,
              { role: "assistant", content: response.toolUses },
              { role: "user", content: toolResults },
            ];
          } else {
            // Stop inatteso (max_tokens / length / stop): niente loop tool.
            send({ type: "done" });
            break;
          }
        }

        emitter.stop();

        // Registra la run (conversazione + token) a fine esecuzione.
        // Anche i possessori del codice registrano l'uso sotto l'identità del tenant
        // così la dashboard mock mostra gli stessi grafici/costi di un utente reale.
        const usageUserId =
          userId !== "anonymous" ? userId : true ? sessionUser?.id ?? null : null;
        if (usageUserId) {
          await recordUsageAndReportOverage({
            user_id: usageUserId,
            agent_slug: agentId,
            conversation_id: conversationId,
            tokens_input: inputTokens,
            tokens_output: outputTokens,
          });
        }
      } catch {
        emitter.stop();
        send({
          type: "error",
          message: executionErrorMessage,
        });
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
}
