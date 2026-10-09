import type { NextRequest, NextResponse } from "next/server";
import { receiveShopifyWebhook } from "@/lib/shopify/compliance";

export const runtime = "nodejs";

/**
 * ⚠️ DEPRECATO — non registrare questo URL. Usa /api/webhooks/shopify/*
 *
 * POST /api/shopify/webhooks
 *   Existente dalla Fase 4, quando era l'unico ricevitore. Oggi delega
 *   all'handler condiviso invece di duplicare la logica.
 *
 *   Prima esisteva un difetto: questa route gestiva `shop/redact` Limitandosi
 *   a marcare la connessione come disinstallata, mentre la rotta di conformità
 *   cancellava davvero le righe. Lo stesso topic produceva effetti diversi a
 *   seconda dell'URL registrato nel Partner Dashboard. Ora il comportamento è
 *   identico, quindi la route è innocua — ma è un doppione.
 *
 *   Resta per non rompere le installazioni che hanno già questo URL salvato:
 *   se lo togliessi, Shopify riceverebbe 404 e ritenterebbe invano.
 *
 *   Per un nuovo negozio registrare:
 *     - conformità  → https://www.agentcloud.agency/api/webhooks/shopify/compliance
 *     - disinstallazione → https://www.agentcloud.agency/api/webhooks/shopify/app-uninstalled
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  return receiveShopifyWebhook(req, {
    allowedTopics: [
      "customers/data_request",
      "customers/redact",
      "shop/redact",
      "app/uninstalled",
    ],
  });
}