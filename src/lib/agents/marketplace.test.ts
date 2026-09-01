import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_BACKUP = { ...process.env };

type AgentsModule = typeof import("../agents");

async function loadAgentsModule(): Promise<AgentsModule> {
  vi.resetModules();
  return import("../agents");
}

beforeEach(() => {
  process.env = { ...ENV_BACKUP };
  delete process.env.AGENTCLOUD_FEATURE_FLAGS;
  delete process.env.AGENTCLOUD_VERTICAL;
});

afterEach(() => {
  process.env = ENV_BACKUP;
});

describe("flag-driven marketplace", () => {
  it("defaults to the shopify launch set when no env is configured", async () => {
    const mod = await loadAgentsModule();
    expect(mod.isAvailable("shopify-agent")).toBe(true);
    expect(mod.isAvailable("lead-capture")).toBe(true);
    expect(mod.isAvailable("support-agent")).toBe(true);
    expect(mod.isAvailable("copywriter")).toBe(true);
    // Not part of the default shopify vertical.
    expect(mod.isAvailable("calendar-booking")).toBe(false);
    expect(mod.isAvailable("seo-agent")).toBe(false);
    expect(mod.isAvailable("business-manager")).toBe(false);
  });

  it("AVAILABLE_AGENTS and COMING_SOON_AGENTS partition the whole catalog", async () => {
    const mod = await loadAgentsModule();
    const available = mod.AVAILABLE_AGENTS.map((a) => a.slug);
    const comingSoon = mod.COMING_SOON_AGENTS.map((a) => a.slug);

    expect(available.length + comingSoon.length).toBe(mod.AGENTS.length);
    expect(available).toContain("shopify-agent");
    expect(comingSoon).not.toContain("shopify-agent");
    // No overlaps between the two lists.
    expect(available.some((slug) => comingSoon.includes(slug))).toBe(false);
  });

  it("respects the services vertical preset", async () => {
    process.env.AGENTCLOUD_VERTICAL = "services";
    const mod = await loadAgentsModule();

    expect(mod.isAvailable("calendar-booking")).toBe(true);
    expect(mod.isAvailable("lead-capture")).toBe(true);
    expect(mod.isAvailable("shopify-agent")).toBe(false);
  });

  it("enables every runtime agent under the full platform config", async () => {
    process.env.AGENTCLOUD_VERTICAL = "full";
    const mod = await loadAgentsModule();

    for (const slug of [
      "seo-agent",
      "business-manager",
      "personal-assistant",
      "email-manager",
      "shopify-agent",
      "calendar-booking",
      "lead-capture",
      "support-agent",
      "copywriter",
    ]) {
      expect(mod.isAvailable(slug)).toBe(true);
    }
    expect(mod.AVAILABLE_AGENTS.length).toBe(9);
  });

  it("respects a custom JSON feature-flag override", async () => {
    process.env.AGENTCLOUD_FEATURE_FLAGS = JSON.stringify({
      enabledAgents: ["seo-agent"],
      enabledTools: [],
      agentToolOverrides: {},
      enableOptionalToolsByDefault: false,
    });
    const mod = await loadAgentsModule();

    expect(mod.isAvailable("seo-agent")).toBe(true);
    expect(mod.isAvailable("shopify-agent")).toBe(false);
    expect(mod.AVAILABLE_AGENTS.map((a) => a.slug)).toEqual(["seo-agent"]);
  });
});
