import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhookSignature } from "@/lib/shopify/verify-webhook";
import {
  deleteShopData,
  handleCustomerDataRequest,
  handleCustomerRedact,
  markComplianceEvent,
  recordComplianceEvent,
} from "@/lib/shopify/compliance";

export const runtime = "nodejs";

/**
 * Ricevitore dei webhook di conformità Shopify (GDPR).
 *
 * POST /api/webhooks/shopify/compliance
 *   Verifica la firma `X-Shopify-Hmac-Sha256` sul corpo grezzo e instrada
 *   in base a `X-Shopify-Topic`:
 *     - customers/data_request → nessuna PII persistita: audit + 200 (D5)
 *     - customers/redact       → nessuna PII persistita: audit + 200 (D5)
 *     - shop/redact            → DELETE definitiva delle righe
 *       `shopify_connections` per lo shop (D3); l'account AgentCloud resta
 *
 * Contratto di stato:
 *   - firma mancante o non valida → 401, nessuna logica eseguita;
 *   - topic sconosciuto (ma firma valida) → 400;
 *   - topic noto → 200 rapido (500 solo se la cancellazione `shop/redact`
 *     fallisce, così Shopify ritenta).
 *   - idempotenza: l'evento è registrato per `X-Shopify-Webhook-Id`; un retry
 *     già visto salta la riesecuzione. Le cancellazioni sono comunque
 *     no-op se i dati non esistono più.
 *   - nessun dato personale nei log: solo topic, shop_domain ed esito. Il
 *     payload (che può contenere PII) non viene mai loggato.
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
  if (
    topic !== "customers/data_request" &&
    topic !== "customers/redact" &&
    topic !== "shop/redact"
  ) {
    return NextResponse.json({ error: "unknown topic" }, { status: 400 });
  }

  let payload: unknown = null;
  try {
    payload = rawBody ? (JSON.parse(rawBody) as unknown) : null;
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  // Header autorevole, fallback al payload (entrambi possono mancare nei test).
  const payloadShop =
    payload && typeof payload === "object"
      ? (payload as { shop_domain?: unknown }).shop_domain
      : null;
  const shopDomain =
    req.headers.get("x-shopify-shop-domain") ||
    (typeof payloadShop === "string" ? payloadShop : "");
  const webhookId = req.headers.get("x-shopify-webhook-id");

  // Audit + idempotenza (best-effort: mai bloccare la conformità).
  const outcome = await recordComplianceEvent({
    webhookId,
    shopDomain,
    topic,
  });
  if (outcome === "duplicate") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (topic) {
      case "customers/data_request":
        await handleCustomerDataRequest();
        break;
      case "customers/redact":
        await handleCustomerRedact();
        break;
      case "shop/redact":
        if (!shopDomain) {
          return NextResponse.json(
            { error: "missing shop_domain" },
            { status: 400 },
          );
        }
        await deleteShopData(shopDomain);
        break;
    }
  } catch (e) {
    await markComplianceEvent(webhookId, "failed");
    console.error(
      `Shopify compliance webhook ${topic} for shop ${shopDomain}: failed.`,
      e instanceof Error ? e.message : String(e),
    );
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  await markComplianceEvent(webhookId, "completed");
  console.info(
    `Shopify compliance webhook ${topic} for shop ${shopDomain}: acknowledged.`,
  );
  return NextResponse.json({ received: true });
}
