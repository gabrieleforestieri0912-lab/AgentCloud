/**
 * Feature flags for controlling which agents and tools are available.
 *
 * This allows you to:
 * - Launch with only a few agents instead of the whole 10-agent catalog
 * - Control which tools are enabled per agent
 * - Gradually roll out features to specific customers
 * - Reduce surface area for initial demos
 */

import { AGENT_RUNTIME } from "./registry";

export type FeatureFlags = {
  // Agents that are enabled (by slug)
  enabledAgents: string[];

  // Tools that are globally enabled (overrides agent-level settings)
  enabledTools: string[];

  // Agent-specific tool overrides
  // If specified, these tools are enabled for the agent regardless of defaultTools
  agentToolOverrides: Record<string, string[]>;

  // Whether to enable optional tools by default
  enableOptionalToolsByDefault: boolean;
};

/**
 * Default configuration for Shopify e-commerce vertical launch.
 * 5 agents enabled: Shopify Agent + Lead Capture + Support Agent + Copywriter
 * + Email Manager
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
 * Default configuration for Shopify e-commerce vertical launch.
 */
export const SHOPIFY_LAUNCH_CONFIG: FeatureFlags = {
  enabledAgents: ACTIVE_15_AGENTS,
  enabledTools: ALL_TOOLS_LIST,
  agentToolOverrides: {},
  enableOptionalToolsByDefault: true,
};

/**
 * Configuration for services vertical (restaurants, professionals, real estate)
 */
export const SERVICES_LAUNCH_CONFIG: FeatureFlags = {
  enabledAgents: ACTIVE_15_AGENTS,
  enabledTools: ALL_TOOLS_LIST,
  agentToolOverrides: {},
  enableOptionalToolsByDefault: true,
};

/**
 * Full platform configuration (all 15 active agents enabled)
 */
export const FULL_PLATFORM_CONFIG: FeatureFlags = {
  enabledAgents: ACTIVE_15_AGENTS,
  enabledTools: ALL_TOOLS_LIST,
  agentToolOverrides: {},
  enableOptionalToolsByDefault: true,
};

/**
 * Get the active feature flags configuration.
 * Priority:
 * 1. Environment variable AGENTCLOUD_FEATURE_FLAGS (JSON string)
 * 2. Environment variable AGENTCLOUD_VERTICAL (shopify | services | full)
 * 3. Default to FULL_PLATFORM_CONFIG (15 active agents)
 */
export function getFeatureFlags(): FeatureFlags {
  // Check for custom JSON config
  const customConfig = process.env.AGENTCLOUD_FEATURE_FLAGS;
  if (customConfig) {
    try {
      return JSON.parse(customConfig) as FeatureFlags;
    } catch (error) {
      console.error("Failed to parse AGENTCLOUD_FEATURE_FLAGS:", error);
    }
  }

  // Check for vertical preset
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
 * Check if an agent is enabled.
 */
export function isAgentEnabled(agentId: string): boolean {
  const flags = getFeatureFlags();
  return flags.enabledAgents.includes(agentId);
}

/**
 * Get the list of enabled tools for an agent.
 * Respects feature flags and agent configuration.
 */
export function getEnabledToolsForAgent(agentId: string): string[] {
  const flags = getFeatureFlags();
  const config = AGENT_RUNTIME[agentId];

  if (!config) {
    return [];
  }

  // Start with default tools
  const enabledTools = new Set<string>(config.defaultTools);

  // Check for agent-specific overrides
  if (flags.agentToolOverrides[agentId]) {
    flags.agentToolOverrides[agentId].forEach((tool: string) =>
      enabledTools.add(tool),
    );
  }

  // If global flag is set, add optional tools
  if (flags.enableOptionalToolsByDefault && config.optionalTools) {
    config.optionalTools.forEach((tool: string) => enabledTools.add(tool));
  }

  // Filter by globally enabled tools (if specified)
  if (flags.enabledTools.length > 0) {
    return Array.from(enabledTools).filter((tool: string) =>
      flags.enabledTools.includes(tool),
    );
  }

  return Array.from(enabledTools);
}

/**
 * Get all enabled agents with their configurations.
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
