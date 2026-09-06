/**
 * Notifiche delle azioni degli agenti.
 *
 * Come funziona: mentre un agente gira può compiere azioni con effetti reali:
 * creare un file, pubblicare un prodotto, generare un codice sconto, fissare
 * un evento, catturare un lead. Queste vengono mostrate all'utente come
 * notifiche in-app (la campanella nella Navbar), così sa sempre cosa hanno
 * fatto i suoi agenti.
 *
 * Volutamente NON tutte le tool call notificano: le ricerche in sola lettura
 * (web_search, scrape_page, read_file, calendar_search_availability,
 * shopify_*_search ...) sono passi invisibili, non azioni. Solo i tool il cui
 * successo significa "qualcosa è cambiato / qualcosa è stato consegnato"
 * producono una notifica.
 *
 * Server-only: `createAgentNotification` scrive col client service-role di
 * Supabase; `buildActionNotification` è pura così può essere unit-testata.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type AgentNotificationKind =
  | "file_created"
  | "product_created"
  | "discount_created"
  | "collection_updated"
  | "inventory_updated"
  | "event_booked"
  | "lead_submitted"
  | "lead_notified"
  | "invoice_created"
  | "payment_reminder_sent"
  | "post_scheduled"
  | "cv_analyzed";

/** Parametri neutri (senza lingua) salvati nel DB; la UI li localizza. */
export type AgentNotificationParams = Record<string, string | number>;

export type ActionNotification = {
  kind: AgentNotificationKind;
  params: AgentNotificationParams;
};

type ToolActionRule = {
  kind: AgentNotificationKind;
  /** La stringa di risultato del tool indica se l'azione è riuscita davvero. */
  success: (result: string) => boolean;
  params: (
    input: Record<string, string>,
    result: string,
  ) => AgentNotificationParams;
};

function matchGroup(result: string, re: RegExp): string | undefined {
  return result.match(re)?.[1]?.trim();
}

/**
 * Mappa nome tool → regola di azione. I tool in sola lettura sono assenti di
 * proposito: la loro esecuzione non genera mai una notifica.
 */
const TOOL_ACTION_RULES: Record<string, ToolActionRule> = {
  write_file: {
    kind: "file_created",
    success: (r) => r.startsWith('{"type":"file_created"'),
    params: (input) => ({ filename: input.filename || "file" }),
  },

  shopify_create_product: {
    kind: "product_created",
    success: (r) => r.includes("created successfully"),
    params: (input) => ({
      title: input.title || "Prodotto",
      price: input.price || "",
    }),
  },

  shopify_create_discount: {
    kind: "discount_created",
    success: (r) => r.includes("Discount code created"),
    params: (input) => ({
      code: input.code || "",
      type: input.type || "percentage",
      value: input.value || "",
    }),
  },

  shopify_manage_collection: {
    kind: "collection_updated",
    success: (r) => r.includes("Collection updated"),
    params: (_input, r) => ({
      collection: matchGroup(r, /Collection:\s*(.+)/) ?? "collezione",
      action: r.includes("Added") ? "add" : "remove",
      count: Number(matchGroup(r, /(?:Added|Removed)\s+(\d+)\s+product/)) || 0,
    }),
  },

  shopify_update_inventory: {
    kind: "inventory_updated",
    success: (r) => r.includes("Inventory updated"),
    params: (_input, r) => ({
      product: matchGroup(r, /Product:\s*(.+)/) ?? "prodotto",
      previous: matchGroup(r, /Previous:\s*(\d+)/) ?? "0",
      new: matchGroup(r, /New:\s*(\d+)/) ?? "0",
    }),
  },

  calendar_book_event: {
    kind: "event_booked",
    success: (r) => r.startsWith("Event booked:"),
    params: (input) => ({
      title: input.title || "Evento",
      start: input.start_time || "",
    }),
  },

  lead_capture_submit: {
    kind: "lead_submitted",
    success: (r) => /Response: 2\d\d/.test(r),
    params: (input) => ({
      email: input.email || "",
      name: input.name || "",
    }),
  },

  lead_capture_notify_sales: {
    kind: "lead_notified",
    success: (r) => /Response: 2\d\d/.test(r),
    params: () => ({}),
  },

  finance_create_invoice: {
    kind: "invoice_created",
    success: (r) => r.startsWith('{"type":"file_created"'),
    params: (_input, r) => {
      try {
        const parsed = JSON.parse(r) as { invoiceId?: string; filename?: string };
        return {
          invoice: parsed.invoiceId || parsed.filename || "fattura",
        };
      } catch {
        return { invoice: "fattura" };
      }
    },
  },

  finance_send_reminder: {
    kind: "payment_reminder_sent",
    success: (r) => r.startsWith("payment_reminder_sent"),
    params: (input) => ({
      email: input.client_email || "",
      invoice: input.invoice_id || "",
    }),
  },

  social_schedule_post: {
    kind: "post_scheduled",
    success: (r) => r.startsWith('{"type":"file_created"') && r.includes('"scheduled":true'),
    params: (input) => ({
      platform: input.platform || "social",
      when: input.scheduled_at || "",
    }),
  },

  hr_parse_cv: {
    kind: "cv_analyzed",
    success: (r) => r.startsWith("cv_analyzed"),
    params: (input) => ({
      filename: input.filename || "CV",
    }),
  },
};

/**
 * Pura: decide se un'esecuzione di tool è un'azione importante degna di
 * notifica. Restituisce null per i tool in sola lettura, per le esecuzioni
 * fallite e per i tool sconosciuti.
 */
export function buildActionNotification(
  toolName: string,
  input: Record<string, string>,
  result: string,
): ActionNotification | null {
  const rule = TOOL_ACTION_RULES[toolName];
  if (!rule || !rule.success(result)) return null;
  return { kind: rule.kind, params: rule.params(input, result) };
}

/**
 * Persiste una notifica d'azione per un utente (best-effort — non lancia mai
 * eccezioni). I chiamanti anonimi in anteprima non hanno una casella:
 * devono essere filtrati a monte dal chiamante.
 */
export async function createAgentNotification(input: {
  userId: string;
  agentSlug: string;
  kind: AgentNotificationKind;
  params?: AgentNotificationParams;
}): Promise<boolean> {
  const db = createAdminClient();
  if (!db) return false;

  const { error } = await db.from("agent_notifications").insert({
    user_id: input.userId,
    agent_slug: input.agentSlug,
    kind: input.kind,
    params: input.params ?? {},
  });

  if (error) {
    console.error("createAgentNotification fallita:", error);
    return false;
  }
  return true;
}
