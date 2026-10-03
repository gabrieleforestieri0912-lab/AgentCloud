/**
 * Sistema di attività agentica per la chat.
 *
 * Perché esiste: l'utente deve capire cosa sta facendo l'agente (task,
 * integrazioni, strumenti, approvazioni) SENZA mai vedere il chain-of-thought
 * privato del modello. Tutto ciò che la UI mostra deriva dagli eventi
 * operativi dello stream SSE (`tool_start` / `tool_done` / `connection`) e
 * da etichette curate qui — mai dal ragionamento interno del modello.
 *
 * Il backend esegue gli strumenti in automatico nel loop di
 * `/api/agent/run`: le card di approvazione con pulsanti reali riguardano le
 * connessioni OAuth (l'unica azione che richiede davvero l'utente). Gli
 * strumenti ad alto impatto sono etichettati come tali ("Modifica dati") ma
 * NON mostrano finti pulsanti di approvazione post-esecuzione: un'approvazione
 * preventiva reale richiederebbe pausa/ripresa del loop agentico (fase 2).
 */

export type AgentStatus =
  | "pending"
  | "running"
  | "completed"
  | "attention"
  | "failed"
  | "paused"
  | "approval";

/** Impatto operativo dello strumento: cosa può cambiare per l'utente. */
export type ToolImpact = "read" | "write" | "high";

export interface AgentStep {
  id: string;
  /** Nome tecnico dello strumento, o "connection:<provider>" per le connessioni. */
  tool: string;
  label: string;
  /** Riepilogo leggibile dell'input (mai chiavi, payload o dati sensibili). */
  detail?: string;
  status: AgentStatus;
  impact: ToolImpact;
  /** Brand per il logo (integrazioni), es. "googlecalendar". */
  brand?: string;
  /** Provider OAuth per le card di approvazione connessione. */
  provider?: string;
  startedAt: number;
  endedAt?: number;
}

interface ToolMeta {
  labelIt: string;
  labelEn: string;
  impact: ToolImpact;
  brand?: string;
}

/**
 * Etichette operative curate per ogni strumento. Regola: descrivono l'AZIONE
 * ("Ricerca web", "Prenota evento"), mai il ragionamento del modello.
 */
const TOOL_META: Record<string, ToolMeta> = {
  web_search: { labelIt: "Ricerca web", labelEn: "Web search", impact: "read" },
  scrape_page: { labelIt: "Lettura pagina web", labelEn: "Reading web page", impact: "read" },
  read_file: { labelIt: "Lettura file", labelEn: "Reading file", impact: "read" },
  write_file: { labelIt: "Creazione file", labelEn: "Creating file", impact: "write" },
  run_python: { labelIt: "Esecuzione analisi", labelEn: "Running analysis", impact: "read" },
  shopify_search_products: { labelIt: "Ricerca catalogo Shopify", labelEn: "Searching Shopify catalog", impact: "read", brand: "shopify" },
  shopify_get_order_status: { labelIt: "Controllo ordine Shopify", labelEn: "Checking Shopify order", impact: "read", brand: "shopify" },
  shopify_build_cart_url: { labelIt: "Creazione link carrello", labelEn: "Creating cart link", impact: "write", brand: "shopify" },
  shopify_setup_store: { labelIt: "Configurazione store", labelEn: "Setting up store", impact: "high", brand: "shopify" },
  shopify_create_store: { labelIt: "Creazione store", labelEn: "Creating store", impact: "high", brand: "shopify" },
  shopify_list_customers: { labelIt: "Elenco clienti Shopify", labelEn: "Listing Shopify customers", impact: "read", brand: "shopify" },
  shopify_get_analytics: { labelIt: "Analisi vendite Shopify", labelEn: "Reading Shopify analytics", impact: "read", brand: "shopify" },
  shopify_create_product: { labelIt: "Creazione prodotto", labelEn: "Creating product", impact: "high", brand: "shopify" },
  shopify_create_discount: { labelIt: "Creazione sconto", labelEn: "Creating discount", impact: "high", brand: "shopify" },
  shopify_list_collections: { labelIt: "Elenco collezioni", labelEn: "Listing collections", impact: "read", brand: "shopify" },
  shopify_manage_collection: { labelIt: "Gestione collezione", labelEn: "Managing collection", impact: "high", brand: "shopify" },
  shopify_update_inventory: { labelIt: "Aggiornamento magazzino", labelEn: "Updating inventory", impact: "high", brand: "shopify" },
  calendar_search_availability: { labelIt: "Verifica disponibilità", labelEn: "Checking availability", impact: "read", brand: "googlecalendar" },
  list_emails: { labelIt: "Lettura email", labelEn: "Reading emails", impact: "read", brand: "gmail" },
  get_calendar_events: { labelIt: "Lettura calendario", labelEn: "Reading calendar", impact: "read", brand: "googlecalendar" },
  sheets_read_range: { labelIt: "Lettura foglio", labelEn: "Reading spreadsheet", impact: "read", brand: "googlesheets" },
  sheets_update_range: { labelIt: "Aggiornamento foglio", labelEn: "Updating spreadsheet", impact: "high", brand: "googlesheets" },
  sheets_append_row: { labelIt: "Aggiunta riga al foglio", labelEn: "Adding spreadsheet row", impact: "high", brand: "googlesheets" },
  gmail_send: { labelIt: "Invio email", labelEn: "Sending email", impact: "high", brand: "gmail" },
  gmail_trash: { labelIt: "Eliminazione email", labelEn: "Deleting email", impact: "high", brand: "gmail" },
  calendar_delete_event: { labelIt: "Eliminazione evento", labelEn: "Deleting event", impact: "high", brand: "googlecalendar" },
  calendar_set_reminder: { labelIt: "Impostazione promemoria", labelEn: "Setting reminder", impact: "write", brand: "googlecalendar" },
  calendar_book_event: { labelIt: "Prenotazione evento", labelEn: "Booking event", impact: "write", brand: "googlecalendar" },
  lead_capture_submit: { labelIt: "Salvataggio lead", labelEn: "Saving lead", impact: "write", brand: "hubspot" },
  lead_capture_enrich: { labelIt: "Arricchimento lead", labelEn: "Enriching lead", impact: "read", brand: "hubspot" },
  lead_capture_notify_sales: { labelIt: "Avviso al team vendite", labelEn: "Notifying sales team", impact: "write", brand: "slack" },
  quote_generate: { labelIt: "Preparazione preventivo", labelEn: "Preparing quote", impact: "write" },
  quote_send_email: { labelIt: "Invio preventivo", labelEn: "Sending quote", impact: "high", brand: "gmail" },
  google_reviews_list: { labelIt: "Lettura recensioni", labelEn: "Reading reviews", impact: "read", brand: "google" },
  google_reviews_reply: { labelIt: "Risposta a recensione", labelEn: "Replying to review", impact: "high", brand: "google" },
  finance_get_cashflow: { labelIt: "Analisi flussi di cassa", labelEn: "Analyzing cash flow", impact: "read", brand: "stripe" },
  finance_create_invoice: { labelIt: "Creazione fattura", labelEn: "Creating invoice", impact: "high", brand: "stripe" },
  finance_send_reminder: { labelIt: "Sollecito pagamento", labelEn: "Sending payment reminder", impact: "high", brand: "stripe" },
  hr_parse_cv: { labelIt: "Analisi CV", labelEn: "Parsing CV", impact: "read" },
  hr_score_candidate: { labelIt: "Valutazione candidato", labelEn: "Scoring candidate", impact: "read" },
  social_generate_calendar: { labelIt: "Piano contenuti social", labelEn: "Planning social content", impact: "write", brand: "instagram" },
  social_schedule_post: { labelIt: "Programmazione post", labelEn: "Scheduling post", impact: "high", brand: "instagram" },
  request_integration_connect: { labelIt: "Richiesta connessione", labelEn: "Connection request", impact: "write" },
};

function humanizeToolName(tool: string): string {
  return tool
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function getToolLabel(tool: string, locale: string): string {
  const meta = TOOL_META[tool];
  if (!meta) return humanizeToolName(tool);
  return locale === "it" ? meta.labelIt : meta.labelEn;
}

export function getToolImpact(tool: string): ToolImpact {
  return TOOL_META[tool]?.impact ?? "read";
}

export function getToolBrand(tool: string): string | undefined {
  return TOOL_META[tool]?.brand;
}

/** Campi input sicuri da mostrare (mai segreti o payload interni). */
const SUMMARY_FIELDS = [
  "query",
  "url",
  "filename",
  "to",
  "subject",
  "title",
  "topic",
  "shop",
  "domain",
  "order",
  "product",
  "provider",
  "text",
  "message",
] as const;

function truncate(value: string, max = 64): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * Riepilogo leggibile dell'input dello strumento. Mostra solo il primo campo
 * significativo (query, URL/host, file, destinatario...), troncato. Per gli
 * URL mostra solo l'host per non esporre token o path sensibili.
 */
export function summarizeToolInput(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const record = input as Record<string, unknown>;
  for (const field of SUMMARY_FIELDS) {
    const value = record[field];
    if (typeof value !== "string" || !value.trim()) continue;
    if (field === "url") {
      try {
        return truncate(new URL(value).hostname, 48);
      } catch {
        return truncate(value, 48);
      }
    }
    return truncate(value);
  }
  return undefined;
}

let stepCounter = 0;

export function createToolStep(
  tool: string,
  input: unknown,
  locale: string,
): AgentStep {
  stepCounter += 1;
  return {
    id: `step-${Date.now()}-${stepCounter}`,
    tool,
    label: getToolLabel(tool, locale),
    detail: summarizeToolInput(input),
    status: "running",
    impact: getToolImpact(tool),
    brand: getToolBrand(tool),
    startedAt: Date.now(),
  };
}

export function createConnectionStep(provider: string): AgentStep {
  stepCounter += 1;
  const name = provider.charAt(0).toUpperCase() + provider.slice(1);
  return {
    id: `step-${Date.now()}-${stepCounter}`,
    tool: `connection:${provider}`,
    label: name,
    status: "approval",
    impact: "write",
    provider,
    startedAt: Date.now(),
  };
}

export function completeStep(step: AgentStep): AgentStep {
  return { ...step, status: "completed", endedAt: Date.now() };
}

export function failStep(step: AgentStep): AgentStep {
  return { ...step, status: "failed", endedAt: Date.now() };
}

/** Secondi con un decimale per il badge di durata. */
export function stepDurationSecs(step: AgentStep): string | null {
  if (!step.endedAt) return null;
  const secs = (step.endedAt - step.startedAt) / 1000;
  if (secs < 0.1) return null;
  return `${secs.toFixed(1)}s`;
}
