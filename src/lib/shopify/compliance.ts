import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Logica di cancellazione dati per i webhook di conformità Shopify (Fase 2).
 *
 * Server-only: scrive sempre con il client service-role, mai esposto al
 * client. Nessun dato personale finisce nei log o nella tabella di audit.
 *
 * Stato dei fatti (Fase 0):
 * - `shopify_connections` contiene solo `shop_domain` + token cifrato + scope:
 *   NESSUNA PII dei clienti dello shop è persistita fuori da Shopify.
 * - I tool agente leggono prodotti/ordini/clienti live dalle Admin API e non
 *   li salvano in alcuna tabella dedicata.
 */

/** Elimina DEFINITIVAMENTE tutte le righe legate allo shop (D3). */
export async function deleteShopData(shopDomain: string): Promise<number> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Supabase admin client unavailable.");
  }
  const { error, count } = await admin
    .from("shopify_connections")
    .delete({ count: "exact" })
    .eq("shop_domain", shopDomain);
  if (error) {
    throw new Error(`Failed to delete Shopify data: ${error.message}`);
  }
  return count ?? 0;
}

/**
 * Richiesta dati cliente (D5): nessuna PII clienti persistita → non c'è nulla
 * da raccogliere o restituire al merchant. L'evento viene solo registrato
 * nella tabella di audit e si risponde 200.
 */
export async function handleCustomerDataRequest(): Promise<{ found: boolean }> {
  return { found: false };
}

/**
 * Cancellazione dati cliente (D5): nessuna PII clienti persistita (né
 * `customer` né `orders_to_redact` in alcuna tabella) → non c'è nulla da
 * eliminare. L'evento viene solo registrato e si risponde 200.
 */
export async function handleCustomerRedact(): Promise<{ deleted: boolean }> {
  return { deleted: false };
}

export type ComplianceEventOutcome = "new" | "duplicate" | "unavailable";

/**
 * Registra l'evento nella tabella di audit (solo metadati, mai PII).
 * Non lancia mai: un fallimento del logging non deve bloccare la
 * conformità. Ritorna `duplicate` se questo `webhook_id` è già stato visto
 * (retry Shopify) così il chiamante può saltare la riesecuzione.
 */
export async function recordComplianceEvent(opts: {
  webhookId: string | null;
  shopDomain: string;
  topic: string;
}): Promise<ComplianceEventOutcome> {
  try {
    const admin = createAdminClient();
    if (!admin) return "unavailable";
    const { error } = await admin.from("shopify_compliance_events").insert({
      webhook_id: opts.webhookId,
      shop_domain: opts.shopDomain,
      topic: opts.topic,
      status: "received",
    });
    if (!error) return "new";
    if ((error as { code?: string }).code === "23505") return "duplicate";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

/** Aggiorna lo stato dell'evento (best-effort, non lancia mai). */
export async function markComplianceEvent(
  webhookId: string | null,
  status: "completed" | "failed",
): Promise<void> {
  if (!webhookId) return;
  try {
    const admin = createAdminClient();
    if (!admin) return;
    await admin
      .from("shopify_compliance_events")
      .update({ status })
      .eq("webhook_id", webhookId);
  } catch {
    // best-effort: lo stato dell'audit non deve mai rompere la risposta
  }
}
