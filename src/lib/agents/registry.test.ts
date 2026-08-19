import { describe, expect, it } from "vitest";
import {
  AGENT_RUNTIME,
  getAgentRuntimeConfig,
  getEnabledTools,
} from "./registry";

describe("AGENT_RUNTIME", () => {
  it("exposes the six runtime agents", () => {
    for (const slug of [
      "seo-agent",
      "business-manager",
      "personal-assistant",
      "shopify-agent",
      "calendar-booking",
      "lead-capture",
    ]) {
      expect(AGENT_RUNTIME[slug]).toBeDefined();
    }
  });

  it("getAgentRuntimeConfig returns undefined for unknown agents", () => {
    expect(getAgentRuntimeConfig("nope")).toBeUndefined();
  });

  it("every agent defines a system prompt and default tools", () => {
    for (const config of Object.values(AGENT_RUNTIME)) {
      expect(config.systemPrompt.length).toBeGreaterThan(0);
      expect(config.defaultTools.length).toBeGreaterThan(0);
    }
  });
});

describe("getEnabledTools", () => {
  it("returns only default tools by default", () => {
    const tools = getEnabledTools("seo-agent");
    expect(tools).toEqual(["read_file", "write_file"]);
  });

  it("adds optional tools when enableOptional is set", () => {
    const tools = getEnabledTools("seo-agent", { enableOptional: true });
    expect(tools).toContain("web_search");
    expect(tools).toContain("scrape_page");
  });

  it("filters a provided list down to tools the agent knows", () => {
    const tools = getEnabledTools("seo-agent", {
      enabledTools: ["web_search", "write_file", "not_a_tool"],
    });
    expect(tools).toEqual(["web_search", "write_file"]);
  });

  it("returns an empty list for unknown agents", () => {
    expect(getEnabledTools("nope")).toEqual([]);
  });
});
