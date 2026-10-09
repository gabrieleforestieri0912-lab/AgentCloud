import type { NextRequest, NextResponse } from "next/server";
import { receiveShopifyWebhook } from "@/lib/shopify/compliance";

export const runtime = "nodejs";

/**
 * Webhook `app/uninstalled` — URL canonico.
 *
 * POST /api/webhooks/shopify/app-uninstalled
 *   Marca la connessione come disinstallata (`uninstalled_at`), rendendo il
 *   token inutilizzabile: i getter in lib/shopify/connections.ts rifiutano le
 *   righe con `uninstalled_at` impostato, e Shopify revoca il token lato suo.
 *
 *   Non cancella niente: la cancellazione definitiva spetta a `shop/redact`,
 *   che Shopify invia ~48h dopo la disinstallazione, e che è il webhook di
 *   conformità vero e proprio.
 *
 * Stessa verifica HMAC sul corpo grezzo e stesso handler di
 * lib/shopify/compliance.ts della rotta di conformità.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  return receiveShopifyWebhook(req, { allowedTopics: ["app/uninstalled"] });
}