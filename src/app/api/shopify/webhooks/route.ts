import { NextRequest, NextResponse } from "next/server";
import { markShopifyUninstalled } from "@/lib/shopify/connections";
import { verifyShopifyWebhookHmac } from "@/lib/shopify/oauth";

/**
 * Fase 4 — ricevitore dei webhook Shopify.
 *
 * POST /api/shopify/webhooks
 *   Verifica la firma `X-Shopify-Hmac-SHA256` sul corpo grezzo, poi instrada
 *   in base a `X-Shopify-Topic`:
 *     - APP_UNINSTALLED      → revoca la connessione del negozio
 *     - SHOP_REDACT          → revoca la connessione del negozio (cancellazione GDPR)
 *     - CUSTOMERS_DATA_REQUEST / CUSTOMERS_REDACT → acknowledgement (non
 *       salviamo PII dei clienti Shopify; il token criptato è già per-negozio)
 *
 * Risponde sempre 200 così Shopify non ritenta all'infinito; le firme non
 * valide ricevono 401.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook misconfigured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256") || "";
  const topic = req.headers.get("x-shopify-topic") || "";
  const shopDomain = req.headers.get("x-shopify-shop-domain") || "";

  if (!verifyShopifyWebhookHmac(rawBody, hmac, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  try {
    switch (topic) {
      case "app/uninstalled":
      case "shop/redact": {
        if (shopDomain) await markShopifyUninstalled(shopDomain);
        break;
      }
      case "customers/data_request":
      case "customers/redact": {
        // Nessuna PII dei clienti è salvata fuori da Shopify; qui non c'è nulla
        // da cancellare. Solo un log per la traccia di audit.
        console.info(
          `Shopify GDPR webhook ${topic} for shop ${shopDomain} acknowledged.`,
        );
        break;
      }
      default:
        // Topic sconosciuto: accetta per evitare retry, ma annotalo.
        console.info(`Shopify webhook unhandled topic: ${topic}`);
    }
  } catch (e) {
    console.error(
      "Shopify webhook processing error:",
      e instanceof Error ? e.message : String(e),
    );
  }

  return NextResponse.json({ received: true });
}
