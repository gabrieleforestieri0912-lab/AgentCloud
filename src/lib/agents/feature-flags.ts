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
];

export const ALL_TOOLS_LIST = [
  "web_search",
  "scrape_page",
  "read_file",
  "write_file",
  "quote_generate",
  "quote_send_email",
  "google_reviews_list",
  "google_reviews_reply",
  "shopify_create_store",
  "shopify_setup_store",
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

  // Infine si filtra con l'elenco globale dei tool abilitati (se presente),
  // così un tool bandito globalmente non può essere riattivato da un agente.
  if (flags.enabledTools.length > 0) {
    return Array.from(enabledTools).filter((tool: string) =>
      flags.enabledTools.includes(tool),
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
