import { describe, expect, it } from "vitest";
import {
  parseCheckoutMetadata,
  resolveCheckoutAgents,
} from "./webhook-helpers";

describe("parseCheckoutMetadata", () => {
  it("parses an agent-based checkout", () => {
    const info = parseCheckoutMetadata({
      agent_id: "shopify-agent",
      source: "agentcloud",
      client_reference_id: "user_123",
      email: "a@b.com",
    });
    expect(info.agentId).toBe("shopify-agent");
    expect(info.userId).toBe("user_123");
    expect(info.email).toBe("a@b.com");
    expect(info.planId).toBeNull();
  });

  it("parses a plan-based checkout", () => {
    const info = parseCheckoutMetadata({
      plan_id: "shopify-growth",
      vertical: "shopify",
      tokens: "1000000",
      source: "agentcloud",
    });
    expect(info.planId).toBe("shopify-growth");
    expect(info.vertical).toBe("shopify");
    expect(info.tokens).toBe(1_000_000);
  });

  it("falls back to the legacy conversations metadata key", () => {
    const info = parseCheckoutMetadata({
      plan_id: "shopify-starter",
      vertical: "shopify",
      conversations: "300",
      source: "agentcloud",
    });
    expect(info.tokens).toBe(300);
  });

  it("falls back to session-level identity fields", () => {
    const info = parseCheckoutMetadata({}, {
      client_reference_id: "user_456",
      email: "session@x.com",
    });
    expect(info.userId).toBe("user_456");
    expect(info.email).toBe("session@x.com");
  });

  it("rejects unknown verticals", () => {
    const info = parseCheckoutMetadata({ vertical: "weird" });
    expect(info.vertical).toBeNull();
  });

  it("ignores non-numeric token values", () => {
    const info = parseCheckoutMetadata({ tokens: "abc" });
    expect(info.tokens).toBeNull();
  });

  it("prefers tokens over the legacy conversations key when both are present", () => {
    const info = parseCheckoutMetadata({
      tokens: "500000",
      conversations: "300",
    });
    expect(info.tokens).toBe(500_000);
  });
});

describe("resolveCheckoutAgents", () => {
  it("resolves a single agent with the default allowance for agent purchases", () => {
    const res = resolveCheckoutAgents({
      agentId: "seo-agent",
      userId: null,
      email: null,
      planId: null,
      vertical: null,
      tokens: null,
      source: null,
    });
    expect(res.agentIds).toEqual(["seo-agent"]);
    expect(res.tokenLimit).toBe(300_000);
  });

  it("honours an explicit tokens value on agent purchases", () => {
    const res = resolveCheckoutAgents({
      agentId: "seo-agent",
      userId: null,
      email: null,
      planId: null,
      vertical: null,
      tokens: 500_000,
      source: null,
    });
    expect(res.tokenLimit).toBe(500_000);
  });

  it("resolves all vertical agents and the plan allowance for plan purchases", () => {
    const res = resolveCheckoutAgents({
      agentId: null,
      userId: null,
      email: null,
      planId: "shopify-growth",
      vertical: "shopify",
      tokens: 1_000_000,
      source: null,
    });
    expect(res.agentIds).toContain("shopify-agent");
    expect(res.agentIds).toContain("lead-capture");
    expect(res.tokenLimit).toBe(1_000_000);
    expect(res.planId).toBe("shopify-growth");
    expect(res.vertical).toBe("shopify");
  });

  it("resolves services vertical agents for services plans", () => {
    const res = resolveCheckoutAgents({
      agentId: null,
      userId: null,
      email: null,
      planId: "services-starter",
      vertical: "services",
      tokens: 300_000,
      source: null,
    });
    expect(res.agentIds).toContain("calendar-booking");
    expect(res.tokenLimit).toBe(300_000);
  });

  it("returns no agents for unresolvable metadata", () => {
    const res = resolveCheckoutAgents({
      agentId: null,
      userId: null,
      email: null,
      planId: null,
      vertical: null,
      tokens: null,
      source: null,
    });
    expect(res.agentIds).toEqual([]);
  });
});
