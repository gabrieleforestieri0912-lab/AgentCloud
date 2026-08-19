import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FULL_PLATFORM_CONFIG,
  SERVICES_LAUNCH_CONFIG,
  SHOPIFY_LAUNCH_CONFIG,
  getEnabledToolsForAgent,
  getFeatureFlags,
  isAgentEnabled,
} from "./feature-flags";

const ENV_BACKUP = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ENV_BACKUP };
});

afterEach(() => {
  process.env = ENV_BACKUP;
});

describe("getFeatureFlags", () => {
  it("defaults to the Shopify launch config", () => {
    delete process.env.AGENTCLOUD_VERTICAL;
    delete process.env.AGENTCLOUD_FEATURE_FLAGS;
    expect(getFeatureFlags()).toEqual(SHOPIFY_LAUNCH_CONFIG);
  });

  it("reads the services vertical preset", () => {
    process.env.AGENTCLOUD_VERTICAL = "services";
    delete process.env.AGENTCLOUD_FEATURE_FLAGS;
    expect(getFeatureFlags()).toEqual(SERVICES_LAUNCH_CONFIG);
  });

  it("reads the full platform preset", () => {
    process.env.AGENTCLOUD_VERTICAL = "full";
    delete process.env.AGENTCLOUD_FEATURE_FLAGS;
    expect(getFeatureFlags()).toEqual(FULL_PLATFORM_CONFIG);
  });

  it("prefers a custom JSON config over presets", () => {
    process.env.AGENTCLOUD_VERTICAL = "full";
    process.env.AGENTCLOUD_FEATURE_FLAGS = JSON.stringify({
      enabledAgents: ["seo-agent"],
      enabledTools: [],
      agentToolOverrides: {},
      enableOptionalToolsByDefault: false,
    });
    expect(getFeatureFlags().enabledAgents).toEqual(["seo-agent"]);
  });

  it("falls back to the default when the JSON is malformed", () => {
    process.env.AGENTCLOUD_FEATURE_FLAGS = "{not json";
    expect(getFeatureFlags()).toEqual(SHOPIFY_LAUNCH_CONFIG);
  });
});

describe("isAgentEnabled", () => {
  it("respects the active feature flags", () => {
    delete process.env.AGENTCLOUD_VERTICAL;
    delete process.env.AGENTCLOUD_FEATURE_FLAGS;
    expect(isAgentEnabled("shopify-agent")).toBe(true);
    expect(isAgentEnabled("lead-capture")).toBe(true);
    expect(isAgentEnabled("seo-agent")).toBe(false);
  });
});

describe("getEnabledToolsForAgent", () => {
  it("enables Shopify tools under the default config", () => {
    delete process.env.AGENTCLOUD_VERTICAL;
    delete process.env.AGENTCLOUD_FEATURE_FLAGS;
    const tools = getEnabledToolsForAgent("shopify-agent");
    expect(tools).toContain("shopify_search_products");
    expect(tools).not.toContain("web_search");
  });

  it("enables optional tools under the full config", () => {
    process.env.AGENTCLOUD_VERTICAL = "full";
    delete process.env.AGENTCLOUD_FEATURE_FLAGS;
    const tools = getEnabledToolsForAgent("seo-agent");
    expect(tools).toContain("web_search");
    expect(tools).toContain("scrape_page");
  });

  it("returns an empty list for unknown agents", () => {
    expect(getEnabledToolsForAgent("nope")).toEqual([]);
  });
});
