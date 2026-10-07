/**
 * Feature flag per controllare quali agenti e quali tool sono disponibili.
 *
 * Perché esistono: permettono di regolare la superficie del prodotto senza
 * toccare il codice:
 * - lanciare solo con alcuni agenti invece dell'intero catalogo
 * - controllare quali tool sono attivi per ogni agente
 * - distribuire gradualmente le feature a clienti specifici
 * - ridurre la superficie per le prime demo
 *
 * La configurazione attiva viene scelta da env var (JSON custom oppure preset
 * verticale) con fallback sulla piattaforma completa.
 */

import { AGENT_RUNTIME } from "./registry";

export type FeatureFlags = {
  // Agenti abilitati (per slug)
  enabledAgents: string[];

  // Tool abilitati globalmente (sovrascrivono le impostazioni a livello agente)
  enabledTools: string[];

  // Sovrascritture dei tool per singolo agente
  // Se specificati, questi tool sono attivi per l'agente a prescindere da defaultTools
  agentToolOverrides: Record<string, string[]>;

  // Se abilitare i tool opzionali di default
  enableOptionalToolsByDefault: boolean;
};

/**
 * Preset di lancio con i primi 10 agenti (verticale Shopify e-commerce).
 */
export const ACTIVE_10_AGENTS = [
  "shopify-agent",
  "lead-capture",
  "support-agent",
  "calendar-booking",
  "quote-agent",
  "reviews-agent",
  "seo-agent",
  "email-manager",
  "copywriter",
  "business-manager",
];

export const ACTIVE_15_AGENTS = [
  ...ACTIVE_10_AGENTS,
  "finance-manager",
  "personal-assistant",
  "hr-recruiter",
  "social-media-agent",
  "inventory-logistics",
];

export const ALL_TOOLS_LIST = [
  "web_search",
  "scrape_page",
  "read_file",
  "write_file",
  "run_python",
  "quote_generate",
  "quote_send_email",
  "google_reviews_list",
  "google_reviews_reply",
  "shopify_create_store",
  "shopify_setup_store",
  "woocommerce_create_store",
  "woocommerce_setup_store",
  "shopify_search_products",
  "shopify_get_order_status",
  "shopify_build_cart_url",
  "shopify_list_customers",
  "shopify_get_analytics",
  "shopify_create_product",
  "shopify_create_discount",
  "shopify_list_collections",
  "shopify_manage_collection",
  "shopify_update_inventory",
  "calendar_search_availability",
  "calendar_book_event",
  "calendar_delete_event",
  "calendar_set_reminder",
  "get_calendar_events",
  "sheets_read_range",
  "sheets_update_range",
  "sheets_append_row",
  "github_list_repos",
  "github_list_issues",
  "github_create_issue",
  "clickup_list_spaces",
  "clickup_list_tasks",
  "clickup_create_task",
  "asana_list_workspaces",
  "asana_list_projects",
  "asana_list_tasks",
  "asana_create_task",
  "list_emails",
  "gmail_send",
  "gmail_trash",
  "lead_capture_submit",
  "lead_capture_enrich",
  "lead_capture_notify_sales",
  "finance_get_cashflow",
  "finance_create_invoice",
  "finance_send_reminder",
  "hr_parse_cv",
  "hr_score_candidate",
  "social_generate_calendar",
  "social_schedule_post",
  // Notion / Slack / HubSpot: tool che rendono usabili le tre integrazioni
  // che altrimenti resterebbero "collegate" ma inerti per gli agenti.
  "notion_search",
  "notion_read_page",
  "notion_create_page",
  "notion_append_blocks",
  "slack_list_channels",
  "slack_post_message",
  "slack_read_channel",
  "hubspot_search_contacts",
  "hubspot_get_contact",
  "hubspot_create_contact",
  "hubspot_update_contact",
  "hubspot_list_companies",
  // Google Drive (batch 2): sola lettura, vedi Open Decision 14.
  "drive_search_files",
  "drive_read_file",
  "drive_list_folder",
  // Airtable (batch 2): sola lettura, vedi Open Decision 14.
  "airtable_list_bases",
  "airtable_list_tables",
  "airtable_list_records",
  // Trello (batch 2): sola lettura, vedi Open Decision 14.
  "trello_list_boards",
  "trello_list_cards",
  // WooCommerce (batch 2): sola lettura, vedi Open Decision 14.
  "woo_list_products",
  "woo_get_product",
  "woo_list_orders",
  "woo_get_order",
  "woo_get_customer",
  // Mailchimp (batch 2): sola lettura, vedi Open Decision 14. Nessun invio
  // campagna e nessun iscritto aggiunto.
  "mailchimp_list_audiences",
  "mailchimp_get_audience_stats",
  "mailchimp_list_campaigns",
  // Microsoft 365 (Word/Excel/PowerPoint/OneNote): una connessione abilita i
  // quattro documenti. Le scritture su contenuto esistente richiedono conferma
  // (vedi lib/agents/tool-confirmation.ts).
  "word_create",
  "word_append",
  "word_read",
  "excel_create",
  "excel_read_range",
  "excel_write_range",
  "powerpoint_create",
  "onenote_list",
  "onenote_create_page",
  "onenote_append",
  "onenote_read",
  "request_integration_connect",
];

/**
 * Configurazione di default per il lancio verticale Shopify e-commerce.
 */
export const SHOPIFY_LAUNCH_CONFIG: FeatureFlags = {
  enabledAgents: ACTIVE_15_AGENTS,
  enabledTools: ALL_TOOLS_LIST,
  agentToolOverrides: {},
  enableOptionalToolsByDefault: true,
};

/**
 * Configurazione per la verticale servizi (ristoranti, professionisti, immobiliare)
 */
export const SERVICES_LAUNCH_CONFIG: FeatureFlags = {
  enabledAgents: ACTIVE_15_AGENTS,
  enabledTools: ALL_TOOLS_LIST,
  agentToolOverrides: {},
  enableOptionalToolsByDefault: true,
};

/**
 * Configurazione piattaforma completa (tutti i 15 agenti attivi abilitati)
 */
export const FULL_PLATFORM_CONFIG: FeatureFlags = {
  enabledAgents: [
    ...ACTIVE_10_AGENTS,
    "finance-manager",
    "personal-assistant",
    "hr-recruiter",
    "social-media-agent",
    "inventory-logistics",
  ],
  enabledTools: ALL_TOOLS_LIST,
  agentToolOverrides: {},
  enableOptionalToolsByDefault: true,
};

/**
 * Restituisce la configurazione feature flag attiva.
 * Priorità:
 * 1. Variabile d'ambiente AGENTCLOUD_FEATURE_FLAGS (stringa JSON)
 * 2. Variabile d'ambiente AGENTCLOUD_VERTICAL (shopify | services | full)
 * 3. Default: FULL_PLATFORM_CONFIG (15 agenti attivi)
 */
export function getFeatureFlags(): FeatureFlags {
  // Controlla eventuale config JSON custom
  const customConfig = process.env.AGENTCLOUD_FEATURE_FLAGS;
  if (customConfig) {
    try {
      return JSON.parse(customConfig) as FeatureFlags;
    } catch (error) {
      console.error("Impossibile parsare AGENTCLOUD_FEATURE_FLAGS:", error);
    }
  }

  // Controlla il preset verticale
  const vertical = process.env.AGENTCLOUD_VERTICAL?.toLowerCase();

  switch (vertical) {
    case "services":
      return SERVICES_LAUNCH_CONFIG;
    case "shopify":
      return SHOPIFY_LAUNCH_CONFIG;
    case "full":
    case "all":
    default:
      return FULL_PLATFORM_CONFIG;
  }
}

/**
 * Dice se un agente è abilitato dalla configurazione attiva.
 */
export function isAgentEnabled(agentId: string): boolean {
  const flags = getFeatureFlags();
  return flags.enabledAgents.includes(agentId);
}

/**
 * Restituisce l'elenco dei tool abilitati per un agente, rispettando i
 * feature flag e la configurazione dell'agente nel registry.
 */
export function getEnabledToolsForAgent(agentId: string): string[] {
  const flags = getFeatureFlags();
  const config = AGENT_RUNTIME[agentId];

  if (!config) {
    return [];
  }

  // Si parte dai tool di default dell'agente...
  const enabledTools = new Set<string>(config.defaultTools);

  // ...poi si aggiungono eventuali override specifici per l'agente...
  if (flags.agentToolOverrides[agentId]) {
    flags.agentToolOverrides[agentId].forEach((tool: string) =>
      enabledTools.add(tool),
    );
  }

  // ...e i tool opzionali se il flag globale li attiva di default.
  if (flags.enableOptionalToolsByDefault && config.optionalTools) {
    config.optionalTools.forEach((tool: string) => enabledTools.add(tool));
  }

  // Connection card tool is always available (Claude-style inline connect)
  enabledTools.add("request_integration_connect");

  // Infine si filtra con l'elenco globale dei tool abilitati (se presente),
  // così un tool bandito globalmente non può essere riattivato da un agente.
  // request_integration_connect bypasses the global filter.
  if (flags.enabledTools.length > 0) {
    return Array.from(enabledTools).filter(
      (tool: string) => tool === "request_integration_connect" || flags.enabledTools.includes(tool),
    );
  }

  return Array.from(enabledTools);
}

/**
 * Restituisce tutti gli agenti abilitati con la loro configurazione e
 * l'elenco dei tool effettivamente attivi per ciascuno.
 */
export function getEnabledAgents() {
  const flags = getFeatureFlags();

  return Object.entries(AGENT_RUNTIME)
    .filter(([agentId]) => flags.enabledAgents.includes(agentId))
    .map(([agentId, config]) => ({
      ...config,
      enabledTools: getEnabledToolsForAgent(agentId),
    }));
}
