import { logAudit } from "@/lib/audit";
import { getSiteUrl } from "@/lib/site-url";
import { sendWhatsApp } from "@/lib/whatsapp/send";

/**
 * Elabora il messaggio in arrivo: lo inoltra a /api/agent/run e ricompone la
 * risposta leggendo lo stream SSE (eventi di tipo "text") per poi rimandarla.
 */
export async function processWhatsAppMessage(
  from: string,
  message: string,
  tenantId: string = "default",
  agentId: string = "personal-assistant",
): Promise<string | null> {
  try {
    const res = await fetch(`${getSiteUrl()}/api/agent/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId,
        messages: [{ role: "user", content: message }],
        userId: `wa_${from}`,
        tenantId,
      }),
    });

    if (!res.ok) {
      logAudit("whatsapp_orchestrator_failed", {
        status: res.status,
        tenantId,
      });
      return null;
    }

    // Legge la risposta SSE di /api/agent/run
    const raw = await res.text();
    const lines = raw.split("\n");
    let fullText = "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.type === "text" && typeof parsed.content === "string") {
            fullText += parsed.content;
          }
        } catch {}
      }
    }

    return fullText.trim() || null;
  } catch (err) {
    logAudit("whatsapp_process_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * GET /api/whatsapp/webhook
 * Verifica del webhook per Meta Cloud API.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (
      mode === "subscribe" &&
      token &&
      token === (process.env.WHATSAPP_VERIFY_TOKEN || "agentcloud_verify_token")
    ) {
      return new Response(challenge || "", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
  } catch {
    // va a cadere sul 400/403 qui sotto
  }
  return new Response("Forbidden", { status: 403 });
}

/**
 * POST /api/whatsapp/webhook
 * Riceve i messaggi da Meta Cloud API, li instrada all'agente e risponde via
 * WhatsApp.
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenantId") || "default";
    const agentId = url.searchParams.get("agentId") || "personal-assistant";

    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    logAudit("whatsapp_incoming", {
      tenantId,
      hasEntry: Boolean(body?.entry),
    });

    const change = body?.entry?.[0]?.changes?.[0]?.value;
    const msg = change?.messages?.[0];

    // Le notifiche di stato (consegnato, letto) non hanno messaggi
    if (!msg) {
      return new Response(JSON.stringify({ status: "ignored_non_message" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const from = msg.from;
    const text = msg.text?.body;

    if (!from || !text) {
      return new Response(JSON.stringify({ status: "no_text_or_sender" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Elabora il messaggio in modo asincrono per rispondere senza bloccare
    // l'ACK del webhook
    const replyPromise = (async () => {
      const reply = await processWhatsAppMessage(
        from,
        text,
        tenantId,
        agentId,
      );
      if (reply) {
        await sendWhatsApp(from, reply);
        logAudit("whatsapp_reply_dispatched", {
          tenantId,
          from,
          replyLength: reply.length,
        });
      }
    })();

    // In ambienti serverless / edge, attendi o gestisci con garbo
    try {
      await Promise.race([
        replyPromise,
        new Promise((resolve) => setTimeout(resolve, 8000)),
      ]);
    } catch {}

    return new Response(JSON.stringify({ status: "received", from }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    logAudit("whatsapp_incoming_error", {
      error: e instanceof Error ? e.message : String(e),
    });
    return new Response(JSON.stringify({ status: "error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
