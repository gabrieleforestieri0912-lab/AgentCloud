/**
 * Autonomy Ladder (Fase 4) — risoluzione dei livelli e contatore delle
 * approvazioni.
 *
 * Livelli (D11): L0 osserva · L1 propone (serve approvazione) · L2 agisce e
 * notifica · L3 autonomo entro budget.
 *
 * Default per nuovi agenti/azioni (nessuna riga in `agent_autonomy`):
 *   • tool con effetti collaterali → L1;
 *   • tool di sola lettura → L3.
 * La riga esplicita (per azione, o default agente con azione NULL) vince
 * sempre sul default: prima quella specifica per tool, poi quella del
 * default agente, poi il default statico.
 *
/**
 * D12 (preso dal prompt): dopo 10 approvazioni CONSECUTIVE senza modifiche il flag
 * `promozione_suggerita` passa a true — il sistema SUGGERISCE, non applica:
 * la promozione la decide solo l'utente. Una approvazione "modificata"
 * azzera il contatore e disattiva il suggerimento.
 *
 * Classificazione dei tool: `SIDE_EFFECT_TOOLS` è l'elenco esplicito dei
 * tool che modificano lo stato del mondo esterno (scrivono in Shopify,
 * inviano email, creano documenti…). Tutto il resto è lettura: errare
 * mettendo in L1 un tool di lettura è solo pesante, errare al contrario
 * fa firmare scritture all'autonomia — quindi la lista degli effetti è
 * quella che viene ripassata, e i generatori di artefatti stanno dentro di essa.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { AutonomyLevel } from "@/types/agents-db";

/** Soglia D12: approvazioni consecutive senza modifiche prima del suggerimento. */
export const PROMOTION_THRESHOLD = 10;

export const SIDE_EFFECT_TOOLS: ReadonlySet<string> = new Set([
  // Contenuti / file (scrittura)
  "write_file",
  "create_artifact",
  "rewrite_artifact",
  "update_artifact",
  "flashcards_create",
  "quiz_create",
  "run_python",
  // Shopify / WooCommerce (scrittura)
  "shopify_create_product",
  "shopify_create_discount",
  "shopify_manage_collection",
  "shopify_update_inventory",
  "shopify_setup_store",
  "shopify_create_store",
  "woocommerce_setup_store",
  "woocommerce_create_store",
  // Google (Gmail / Calendar / Sheets)
  "sheets_update_range",
  "sheets_append_row",
  "gmail_send",
  "gmail_trash",
  "calendar_delete_event",
  "calendar_set_reminder",
  "calendar_book_event",
  // Lead / preventivi / finanza / social
  "lead_capture_submit",
  "lead_capture_enrich",
  "lead_capture_notify_sales",
  "quote_send_email",
  "finance_create_invoice",
  "finance_send_reminder",
  "social_schedule_post",
  "google_reviews_reply",
  // Piattaforma
  "marketplace_add_to_cart",
  "request_integration_connect",
  "integration_disconnect",
]);

export function isSideEffectTool(toolName: string): boolean {
  return SIDE_EFFECT_TOOLS.has(toolName);
}

/** Default statico: L1 per le scritture, L3 per le letture. */
export function defaultLevelForTool(toolName: string): AutonomyLevel {
  return isSideEffectTool(toolName) ? "L1" : "L3";
}

export type AutonomyResolution = {
  level: AutonomyLevel;
  /** true se `level` viene da una riga esplicita (utente sopra default). */
  explicit: boolean;
  approvazioniConsecutiveOk: number;
  promozioneSuggerita: boolean;
};

type AutonomyRow = {
  livello: string;
  approvazioni_consecutive_ok: number;
  promozione_suggerita: boolean;
};

/**
 * Risolve il livello per (tenant, agente, tool): riga specifica per azione →
 * riga di default agente (azione NULL) → default statico. Uso di servizio
 * (worker / route): client admin con filtro esplicito per tenant.
 */
export async function resolveAutonomy(
  tenantId: string,
  agentSlug: string,
  toolName: string,
): Promise<AutonomyResolution> {
  const fallback: AutonomyResolution = {
    level: defaultLevelForTool(toolName),
    explicit: false,
    approvazioniConsecutiveOk: 0,
    promozioneSuggerita: false,
  };
  const client = createAdminClient();
  if (!client) return fallback;
  try {
    const { data, error } = await client
      .from("agent_autonomy")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("agent_slug", agentSlug);
    if (error || !data) return fallback;
    const rows = data as (AutonomyRow & { azione: string | null })[];
    const specific = rows.find(
      (r) => r.azione !== null && r.azione.toLowerCase() === toolName.toLowerCase(),
    );
    const agentDefault = rows.find((r) => r.azione === null);
    const chosen = specific ?? agentDefault;
    if (!chosen) return fallback;
    const level = (["L0", "L1", "L2", "L3"] as AutonomyLevel[]).includes(
      chosen.livello as AutonomyLevel,
    )
      ? (chosen.livello as AutonomyLevel)
      : fallback.level;
    return {
      level,
      explicit: true,
      approvazioniConsecutiveOk: chosen.approvazioni_consecutive_ok,
      promozioneSuggerita: chosen.promozione_suggerita,
    };
  } catch {
    return fallback;
  }
}

/**
 * Aggiorna il contatore di approvazioni consecutive per (tenant, agente,
 * tool) — chiave della promozione D12. `modificata=true` azzera; `false`
 * incrementa e a soglia soglia il flag di suggerimento. La riga specifica
 * del tool è aggiornata se esiste; altrimenti quella di default; altrimenti
 * viene creata (specific: così il contatore ha una riga dedicata).
 */
export async function recordApprovalOutcome(
  tenantId: string,
  agentSlug: string,
  toolName: string,
  modificata: boolean,
): Promise<void> {
  const client = createAdminClient();
  if (!client) return;
  try {
    const { data } = await client
      .from("agent_autonomy")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("agent_slug", agentSlug)
      .eq("azione", toolName)
      .maybeSingle();
    const row = (data ?? null) as {
      id: string;
      approvazioni_consecutive_ok: number;
    } | null;
    const next = modificata
      ? 0
      : Math.min((row?.approvazioni_consecutive_ok ?? 0) + 1, PROMOTION_THRESHOLD);
    const promotionSuggested = next >= PROMOTION_THRESHOLD;
    if (row) {
      await client
        .from("agent_autonomy")
        .update({
          approvazioni_consecutive_ok: next,
          promozione_suggerita: promotionSuggested,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      return;
    }
    // Nessuna riga specifica: prova la riga di default (azione NULL).
    const { data: defaultRow } = await client
      .from("agent_autonomy")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("agent_slug", agentSlug)
      .is("azione", null)
      .maybeSingle();
    if (defaultRow) {
      await client
        .from("agent_autonomy")
        .update({
          approvazioni_consecutive_ok: next,
          promozione_suggerita: promotionSuggested,
          updated_at: new Date().toISOString(),
        })
        .eq("id", defaultRow.id);
      return;
    }
    await client.from("agent_autonomy").insert({
      tenant_id: tenantId,
      agent_slug: agentSlug,
      azione: toolName,
      livello: defaultLevelForTool(toolName),
      approvazioni_consecutive_ok: next,
      promozione_suggerita: promotionSuggested,
    });
  } catch {
    // il contatore non deve mai far fallire il run
  }
}
