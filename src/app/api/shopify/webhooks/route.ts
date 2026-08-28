import { NextRequest, NextResponse } from "next/server";
import { markShopifyUninstalled } from "@/lib/shopify/connections";
import { verifyShopifyWebhookHmac } from "@/lib/shopify/oauth";

/**
 * Phase 4 — Shopify webhook receiver.
 *
 * POST /api/shopify/webhooks
 *   Verifies the `X-Shopify-Hmac-SHA256` signature over the raw body, then
 *   routes by `X-Shopify-Topic`:
 *     - APP_UNINSTALLED      → revoke the shop's connection
 *     - SHOP_REDACT          → revoke the shop's connection (GDPR erasure)
 *     - CUSTOMERS_DATA_REQUEST / CUSTOMERS_REDACT → acknowledge (we store no
 *       Shopify customer PII; the encrypted token is already per-shop)
 *
 * Always responds 200 so Shopify does not retry indefinitely; invalid
 * signatures get 401.
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
        // No customer PII is persisted outside Shopify; nothing to erase here.
        // Log for audit trail only.
        console.info(
          `Shopify GDPR webhook ${topic} for shop ${shopDomain} acknowledged.`,
        );
        break;
      }
      default:
        // Unknown topic: accept to avoid retries, but note it.
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
