import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhookSignature } from "@/lib/shopify/verify-webhook";
import { markShopifyUninstalled } from "@/lib/shopify/connections";
import {
  markComplianceEvent,
  recordComplianceEvent,
} from "@/lib/shopify/compliance";

export const runtime = "nodejs";

/**
 * Ricevitore dedicato del webhook `app/uninstalled` (Fase 3).
 *
 * POST /api/webhooks/shopify/app-uninstalled
 *   Stessa verifica HMAC della Fase 1 sul corpo grezzo: firma mancante o
 *   non valida → 401, nessuna logica eseguita. Topic diverso da
 *   `app/uninstalled` (ma firma valida) → 400.
 *
 * Comportamento (D4): marca la connessione come disinstallata
 * (`uninstalled_at`), rendendo il token inutilizzabile — tutti i getter
 * (`getShopifyToken`, `getShopifyConnection`) rifiutano le righe con
 * `uninstalled_at` impostato e Shopify revoca il token lato suo
 * all'uninstall. Gli altri dati restano fino a `shop/redact`, che li
 * elimina definitivamente (endpoint compliance, D3).
 *
 * Idempotenza: evento registrato per `X-Shopify-Webhook-Id`, retry già
 * visto salta la riesecuzione; `markShopifyUninstalled` è comunque no-op
 * se la riga è già marcata. Log solo con topic + shop_domain + esito.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "webhook misconfigured" },
      { status: 500 },
    );
  }

  // Corpo grezzo: mai `req.json()` prima della verifica della firma.
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  if (!verifyShopifyWebhookSignature(rawBody, hmac, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic") || "";
  if (topic !== "app/uninstalled") {
    return NextResponse.json({ error: "unknown topic" }, { status: 400 });
  }

  let payload: unknown = null;
  try {
    payload = rawBody ? (JSON.parse(rawBody) as unknown) : null;
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const payloadShop =
    payload && typeof payload === "object"
      ? (payload as { shop_domain?: unknown }).shop_domain
      : null;
  const shopDomain =
    req.headers.get("x-shopify-shop-domain") ||
    (typeof payloadShop === "string" ? payloadShop : "");
  const webhookId = req.headers.get("x-shopify-webhook-id");

  const outcome = await recordComplianceEvent({
    webhookId,
    shopDomain,
    topic,
  });
  if (outcome === "duplicate") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!shopDomain) {
    await markComplianceEvent(webhookId, "failed");
    return NextResponse.json(
      { error: "missing shop_domain" },
      { status: 400 },
    );
  }

  try {
    await markShopifyUninstalled(shopDomain);
  } catch (e) {
    await markComplianceEvent(webhookId, "failed");
    console.error(
      `Shopify webhook ${topic} for shop ${shopDomain}: failed.`,
      e instanceof Error ? e.message : String(e),
    );
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  await markComplianceEvent(webhookId, "completed");
  console.info(
    `Shopify webhook ${topic} for shop ${shopDomain}: acknowledged.`,
  );
  return NextResponse.json({ received: true });
}
