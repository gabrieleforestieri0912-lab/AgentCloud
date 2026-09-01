/**
 * Feature flags for controlling which agents and tools are available.
 *
 * This allows you to:
 * - Launch with only a few agents instead of the whole 30-agent catalog
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
export const SHOPIFY_LAUNCH_CONFIG: FeatureFlags = {
  enabledAgents: [
    "shopify-agent",
    "lead-capture",
    "support-agent",
    "copywriter",
    "email-manager",
  ],

  // Enable Shopify, Lead Capture, and the general tools used by the
  // Support and Copywriter agents. Optional tools (web_search, scrape_page)
  // stay off for Shopify/Lead agents because enableOptionalToolsByDefault is
  // false — the global list only widens what a given agent can reach.
  enabledTools: [
    "shopify_search_products",
    "shopify_get_order_status",
    "shopify_build_cart_url",
    "lead_capture_submit",
    "lead_capture_notify_sales",
    "web_search",
    "scrape_page",
    "read_file",
    "write_file",
  ],

  // No agent-specific overrides needed
  agentToolOverrides: {},

  // Keep optional tools disabled by default
  enableOptionalToolsByDefault: false,
};

/**
 * Configuration for services vertical (restaurants, professionals, real estate)
 * 4 agents enabled: Calendar Booking + Lead Capture + Support Agent + Copywriter
 */
export const SERVICES_LAUNCH_CONFIG: FeatureFlags = {
  enabledAgents: [
    "calendar-booking",
    "lead-capture",
    "support-agent",
    "copywriter",
  ],

  enabledTools: [
    "calendar_search_availability",
    "calendar_book_event",
    "lead_capture_submit",
    "lead_capture_notify_sales",
    "web_search",
    "scrape_page",
    "read_file",
    "write_file",
  ],

  agentToolOverrides: {},

  enableOptionalToolsByDefault: false,
};

/**
 * Full platform configuration (all agents enabled)
 * Use this for existing customers or when you're ready to launch everything
 */
export const FULL_PLATFORM_CONFIG: FeatureFlags = {
  enabledAgents: [
    "seo-agent",
    "business-manager",
    "personal-assistant",
    "shopify-agent",
    "calendar-booking",
    "lead-capture",
    "support-agent",
    "copywriter",
  ],

  enabledTools: [
    "web_search",
    "scrape_page",
    "read_file",
    "write_file",
    "run_python",
    "shopify_search_products",
    "shopify_get_order_status",
    "shopify_build_cart_url",
    "calendar_search_availability",
    "calendar_book_event",
    "lead_capture_submit",
    "lead_capture_enrich",
    "lead_capture_notify_sales",
  ],

  agentToolOverrides: {},

  enableOptionalToolsByDefault: true,
};

/**
 * Get the active feature flags configuration.
 * Priority:
 * 1. Environment variable AGENTCLOUD_FEATURE_FLAGS (JSON string)
 * 2. Environment variable AGENTCLOUD_VERTICAL (shopify | services | full)
 * 3. Default to SHOPIFY_LAUNCH_CONFIG
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
    case "full":
    case "all":
      return FULL_PLATFORM_CONFIG;
    case "shopify":
    default:
      return SHOPIFY_LAUNCH_CONFIG;
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
