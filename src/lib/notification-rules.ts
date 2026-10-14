/**
 * Regole pure delle notifiche: categorie, chiavi di dedup e raggruppamento.
 *
 * Niente DB, niente import `@/`: testabile con `node --experimental-strip-types`.
 * `createAgentNotification` (lib/agents/notifications.ts) applica queste regole
 * prima di scrivere: preferenze disabilitate e raffiche raggruppate.
 */

export type NotificationCategory =
  | "runs"
  | "commerce"
  | "scheduling"
  | "leads"
  | "finance"
  | "messaging"
  | "documents";

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "runs",
  "commerce",
  "scheduling",
  "leads",
  "finance",
  "messaging",
  "documents",
];

/** Categoria di ogni kind di notifica agente (db → UI/settings). */
const KIND_CATEGORY: Record<string, NotificationCategory> = {
  file_created: "runs",
  product_created: "commerce",
  discount_created: "commerce",
  collection_updated: "commerce",
  inventory_updated: "commerce",
  store_created: "commerce",
  event_booked: "scheduling",
  calendar_event_deleted: "scheduling",
  calendar_reminder_set: "scheduling",
  lead_submitted: "leads",
  lead_notified: "leads",
  invoice_created: "finance",
  payment_reminder_sent: "finance",
  email_sent: "messaging",
  email_trashed: "messaging",
  quote_sent: "messaging",
  review_replied: "messaging",
  post_scheduled: "messaging",
  quote_generated: "documents",
  cv_analyzed: "documents",
};

export function categoryForKind(kind: string): NotificationCategory {
  return KIND_CATEGORY[kind] ?? "runs";
}

/**
 * Chiave di dedup: stesso evento sulla stessa entità collassa in una riga.
 * Solo campi identificativi stabili (niente timestamp/cifre che cambiano):
 * una raffica di 20 lead diversi NON collassa (giusto: sono 20 lead), mentre
 * 20 retry dello stesso invio sì.
 */
export function dedupeKeyFor(
  kind: string,
  params: Record<string, string | number>,
): string | null {
  const pick = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = params[k];
      if (typeof v === "string" && v.trim()) return `${kind}:${k}=${v.trim().slice(0, 120)}`;
      if (typeof v === "number" && Number.isFinite(v)) return `${kind}:${k}=${v}`;
    }
    return null;
  };
  switch (kind) {
    case "file_created":
      return pick("filename");
    case "lead_submitted":
      return pick("email");
    case "email_sent":
    case "quote_sent":
    case "payment_reminder_sent":
      return pick("to", "client_email", "email");
    case "event_booked":
      return pick("title");
    case "invoice_created":
      return pick("invoice");
    case "product_created":
      return pick("title");
    case "discount_created":
      return pick("code");
    case "review_replied":
      return pick("review_id");
    case "post_scheduled":
      return pick("platform");
    case "cv_analyzed":
      return pick("filename");
    case "store_created":
      return pick("shop_name");
    default:
      return null;
  }
}

/** Testo del badge per righe raggruppate ("×12"). */
export function groupBadge(count: number): string {
  return count > 1 ? `×${count}` : "";
}
