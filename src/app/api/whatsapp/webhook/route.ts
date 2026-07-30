import { logAudit } from "@/lib/audit";
// use global fetch available in Next.js server runtime

async function forwardToOrchestrator(message: any) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/agent/run`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "personal-assistant",
          messages: [{ role: "user", content: message }],
          userId: "whatsapp",
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  // Facebook/Meta WhatsApp webhook verification
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (
      mode === "subscribe" &&
      token &&
      token === process.env.WHATSAPP_VERIFY_TOKEN
    ) {
      return new Response(challenge || "", { status: 200 });
    }
  } catch (e) {}
  return new Response("", { status: 400 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Minimal validation
    await logAudit("whatsapp_incoming", { body });

    // Forward the incoming text to the default personal assistant agent for processing.
    // Keep this non-blocking: log and acknowledge immediately, then try to forward.
    const text =
      body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body ||
      JSON.stringify(body);
    forwardToOrchestrator(text).then((ok) => {
      logAudit("whatsapp_forward_result", {
        ok,
        snippet: String(text).slice(0, 200),
      });
    });

    return new Response(JSON.stringify({ status: "received" }), {
      status: 200,
    });
  } catch (e) {
    await logAudit("whatsapp_incoming_error", {
      error: e instanceof Error ? e.message : String(e),
    });
    return new Response(JSON.stringify({ status: "error" }), { status: 500 });
  }
}
