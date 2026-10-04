import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhookSignature } from "@/lib/shopify/verify-webhook";

export const runtime = "nodejs";

/**
 * Ricevitore dei webhook di conformità Shopify (GDPR).
 *
 * POST /api/webhooks/shopify/compliance
 *   Verifica la firma `X-Shopify-Hmac-Sha256` sul corpo grezzo e instrada
 *   in base a `X-Shopify-Topic`:
 *     - customers/data_request → acknowledgement (handler in Fase 2)
 *     - customers/redact       → cancellazione dati cliente (handler in Fase 2)
 *     - shop/redact            → cancellazione dati negozio (handler in Fase 2)
 *
 * Contratto di stato:
 *   - firma mancante o non valida → 401, nessuna logica eseguita;
 *   - topic sconosciuto (ma firma valida) → 400;
 *   - topic noto → 200 rapido. Gli handler sono idempotenti: ricevere due
 *     volte la stessa richiesta non causa errori né duplicazioni.
 *   - nessun dato personale nei log: solo topic, shop_domain ed esito.
 */

// TODO (Fase 2): implementare la raccolta/restituzione dati al merchant.
async function handleCustomersDataRequest(
  _shopDomain: string,
  _payload: unknown,
): Promise<void> {
  return Promise.resolve();
}

// TODO (Fase 2): implementare la cancellazione dei dati del cliente indicato.
async function handleCustomersRedact(
  _shopDomain: string,
  _payload: unknown,
): Promise<void> {
  return Promise.resolve();
}

// TODO (Fase 2): implementare la cancellazione definitiva di tutti i dati
// legati allo shop (token, connessione, dati sincronizzati).
async function handleShopRedact(
  _shopDomain: string,
  _payload: unknown,
): Promise<void> {
  return Promise.resolve();
}

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
  const shopDomain = req.headers.get("x-shopify-shop-domain") || "";

  let payload: unknown = null;
  try {
    payload = rawBody ? (JSON.parse(rawBody) as unknown) : null;
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  switch (topic) {
    case "customers/data_request":
      await handleCustomersDataRequest(shopDomain, payload);
      break;
    case "customers/redact":
      await handleCustomersRedact(shopDomain, payload);
      break;
    case "shop/redact":
      await handleShopRedact(shopDomain, payload);
      break;
    default:
      return NextResponse.json({ error: "unknown topic" }, { status: 400 });
  }

  console.info(
    `Shopify compliance webhook ${topic} for shop ${shopDomain}: acknowledged.`,
  );
  return NextResponse.json({ received: true });
}
