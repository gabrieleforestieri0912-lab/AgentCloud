import { NextRequest, NextResponse } from "next/server";
import { AGENT_RUNTIME } from "@/lib/agents/registry";
import { assertRunAllowed } from "@/lib/billing/usage-tracking";
import { checkFreeUsage } from "@/lib/billing/free-usage";
import { getClientIp } from "@/lib/request-ip";
import { resolveIsAdmin } from "@/lib/admin-access";
import { getLocale } from "@/lib/i18n/locale";
import { apiErrorMessageForLocale } from "@/lib/i18n/api-errors";
import {
  isApiKey,
  isPat,
  resolveBearerCredential,
} from "@/lib/supabase/pat";

/**
 * POST /api/v1/run — API pubblica per integrare gli agenti AgentCloud
 * in progetti esterni.
 *
 * Auth:  Authorization: Bearer ack_… (API key da /account → "API keys")
 *        (accettati anche i token CLI act_…).
 * Body:  { "agent": "<slug-agente-abbonato>", "messages": [{role, content}], "stream"?: false }
 *
 * Nel codice si specifica SEMPRE il modello (slug): il server verifica che
 * la key sia valida e che lo scope lo consenta. Con abbonamento attivo vale
 * la quota del piano; senza abbonamento valgono gli stessi 5 messaggi
 * gratuiti al giorno della chat (stesso contatore condiviso).
 *
 * Risposta: JSON { ok, agent, reply } oppure — con "stream": true — lo stesso
 * SSE di /api/agent/run. Le conferme umane dei tool distruttivi non sono
 * supportate via API (409 CONFIRMATION_REQUIRED).
 */
export async function POST(req: NextRequest) {
  const locale = await getLocale();

  let body: { agent?: unknown; messages?: unknown; stream?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: apiErrorMessageForLocale(locale, "invalidJson") },
      { status: 400 },
    );
  }

  const agent = typeof body.agent === "string" ? body.agent : "";
  const messages = body.messages;
  if (!agent || !Array.isArray(messages)) {
    return NextResponse.json(
      { ok: false, error: apiErrorMessageForLocale(locale, "missingAgentOrMessages") },
      { status: 400 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || (!isApiKey(token) && !isPat(token))) {
    return NextResponse.json(
      { ok: false, error: apiErrorMessageForLocale(locale, "unauthorized") },
      { status: 401 },
    );
  }
  const cred = await resolveBearerCredential(token);
  if (!cred) {
    return NextResponse.json(
      { ok: false, error: apiErrorMessageForLocale(locale, "unauthorized") },
      { status: 401 },
    );
  }

  const config = AGENT_RUNTIME[agent];
  if (!config) {
    return NextResponse.json(
      { ok: false, error: apiErrorMessageForLocale(locale, "agentNotFound") },
      { status: 404 },
    );
  }

  // Scope della key: se è legata a un modello preciso, deve essere quello.
  if (cred.scopeAgent && cred.scopeAgent !== agent) {
    return NextResponse.json(
      {
        ok: false,
        code: "KEY_SCOPE_MISMATCH",
        error: apiErrorMessageForLocale(locale, "keyScopeMismatch"),
      },
      { status: 403 },
    );
  }

  // Abbonamento: attivo → quota del piano. Senza abbonamento attivo la key
  // NON viene rifiutata: vale lo stesso freemium della chat (5 messaggi al
  // giorno in totale, stesso contatore condiviso). Solo gli altri blocchi
  // (scaduto ma con piano, limiti mensili superati, …) tornano 402/429.
  const isAdmin = await resolveIsAdmin(cred.user);
  const check = await assertRunAllowed(cred.user.id, agent, locale, isAdmin);
  if (!isAdmin) {
    if (
      !check.allowed &&
      (check.code === "NOT_SUBSCRIBED" ||
        check.code === "SUBSCRIPTION_INACTIVE" ||
        check.code === "SUBSCRIPTION_EXPIRED")
    ) {
      // Stesso freemium della chat, stesso contatore, stessi crediti da
      // referral: qui NON si duplica la regola, si chiama checkFreeUsage
      // (l'unico punto che risponde "posso ancora scrivere?").
      const free = await checkFreeUsage(cred.user.id, {
        ip: getClientIp(req) ?? undefined,
      });
      if (!free.allowed) {
        return NextResponse.json(
          {
            ok: false,
            code: "FREE_LIMIT_REACHED",
            error: apiErrorMessageForLocale(locale, "freeLimitReached"),
            remaining: 0,
            limit: free.limit,
          },
          { status: 402 },
        );
      }
    } else if (!check.allowed) {
      return NextResponse.json(
        { ok: false, code: check.code, error: check.message },
        { status: check.status },
      );
    }
  } else if (!check.allowed) {
    return NextResponse.json(
      { ok: false, code: check.code, error: check.message },
      { status: check.status },
    );
  }

  // Esecuzione: riusa il motore di /api/agent/run via chiamata interna con
  // lo stesso Bearer (la run route ri-autentica la key da sola).
  const upstream = await fetch(new URL("/api/agent/run", req.nextUrl.origin), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ agentId: agent, messages }),
  });

  // Streaming diretto: stesso SSE del motore (per run lunghe).
  if (body.stream === true) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  }

  // JSON: consuma lo stream e ricompone la risposta testuale.
  if (!upstream.ok || !upstream.body) {
    const data = (await upstream.json().catch(() => null)) as {
      error?: string;
      code?: string;
    } | null;
    return NextResponse.json(
      { ok: false, code: data?.code, error: data?.error ?? "execution_failed" },
      { status: upstream.status || 500 },
    );
  }

  const reply = await collectReply(upstream.body);
  if (reply.confirmationRequired) {
    return NextResponse.json(
      {
        ok: false,
        code: "CONFIRMATION_REQUIRED",
        tool: reply.confirmationRequired,
        error: apiErrorMessageForLocale(locale, "confirmationRequired"),
      },
      { status: 409 },
    );
  }
  if (reply.error) {
    return NextResponse.json(
      { ok: false, error: reply.error },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, agent, reply: reply.text });
}

async function collectReply(
  body: ReadableStream<Uint8Array>,
): Promise<{ text: string; error?: string; confirmationRequired?: string }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let confirmationRequired: string | undefined;
  let error: string | undefined;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(line.slice(6)) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (event.type === "text" && typeof event.content === "string") {
        text += event.content;
      } else if (event.type === "tool_confirm") {
        confirmationRequired =
          typeof event.toolName === "string" ? event.toolName : "tool";
      } else if (event.type === "error" && typeof event.message === "string") {
        error = event.message;
      }
    }
  }
  try {
    reader.releaseLock();
  } catch {
    // stream già chiuso: niente da fare
  }
  return { text, error, confirmationRequired };
}
