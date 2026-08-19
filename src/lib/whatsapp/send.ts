import { logAudit } from "@/lib/audit";

type SendResult = { ok: boolean; status?: number; body?: unknown };

export async function sendWhatsApp(
  to: string,
  text: string,
): Promise<SendResult> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    await logAudit("whatsapp_send_skipped", {
      reason: "not_configured",
      to,
      text: String(text).slice(0, 200),
    });
    return { ok: false };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v16.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text },
        }),
      },
    );
    const body = await res.json().catch(() => null);
    await logAudit("whatsapp_send", {
      to,
      ok: res.ok,
      status: res.status,
      body,
    });
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    await logAudit("whatsapp_send_error", {
      error: e instanceof Error ? e.message : String(e),
    });
    return { ok: false };
  }
}

export default sendWhatsApp;
