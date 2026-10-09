import type { NextRequest, NextResponse } from "next/server";
import {
  COMPLIANCE_TOPICS,
  receiveShopifyWebhook,
} from "@/lib/shopify/compliance";

export const runtime = "nodejs";

/**
 * Webhook di conformità Shopify (privacy webhooks) — URL canonico.
 *
 * POST /api/webhooks/shopify/compliance
 *   Un endpoint per i tre topic obbligatori, smistati in base a
 *   `X-Shopify-Topic`:
 *     - customers/data_request → dati del cliente richiesti dal merchant
 *     - customers/redact       → dati del cliente da cancellare
 *     - shop/redact            → cancellazione di tutti i dati del negozio
 *
 * È questo l'URL da registrare nel Partner Dashboard. La logica (verifica
 * HMAC sul corpo grezzo, idempotenza, gestione dei topic) sta in
 * lib/shopify/compliance.ts ed è condivisa con le altre route Shopify, così
 * nessun endpoint può divergere sul comportamento di `shop/redact`.
 *
 * Contratto di risposta:
 *   - firma mancante o non valida → 401, nessuna logica eseguita;
 *   - topic diverso dai tre previsti → 400;
 *   - shop_domain assente → 400;
 *   - elaborazione riuscita → 200 (un retry già visto risponde 200 duplicate);
 *   - elaborazione fallita → 500, così Shopify ritenta.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  return receiveShopifyWebhook(req, { allowedTopics: COMPLIANCE_TOPICS });
}