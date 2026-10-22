import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readLimitParam, readTypeParam } from "@/lib/memory/query";
import { resolveMemoryConfig, computeExpiry } from "@/lib/memory/config";
import { rowToOverrides } from "@/lib/memory/config-store";

describe("memory api parameters", () => {
  it("reads a valid type", () => {
    assert.equal(readTypeParam("preference"), "preference");
    assert.equal(readTypeParam("fact"), "fact");
  });

  it("ignores an unknown type", () => {
    assert.equal(readTypeParam("secret"), undefined);
    assert.equal(readTypeParam(null), undefined);
  });

  it("caps the limit", () => {
    assert.equal(readLimitParam("10", 100), 10);
    assert.equal(readLimitParam(null, 100), 100);
    assert.equal(readLimitParam("abc", 100), 100);
    assert.equal(readLimitParam("0", 100), 100);
    assert.equal(readLimitParam("100000", 100), 200);
  });
});

describe("per agent configuration", () => {
  it("the tenant overrides win over the defaults", () => {
    const config = resolveMemoryConfig("agent-1", {
      enabled: false,
      retrievalK: 2,
      ttlDays: 7,
    });
    assert.equal(config.enabled, false);
    assert.equal(config.retrievalK, 2);
    assert.equal(config.ttlDays, 7);
    assert.equal(config.tokenBudget, 800, "the other values keep the default");
  });

  it("ignores the undefined overrides", () => {
    const config = resolveMemoryConfig("agent-1", {
      enabled: undefined,
      retrievalK: 3,
    });
    assert.equal(config.retrievalK, 3);
    assert.equal(config.enabled, true);
  });

  it("maps the database row to the overrides", () => {
    const overrides = rowToOverrides({
      tenant_id: "tenant-a",
      agent_id: "agent-1",
      enabled: false,
      ttl_days: 30,
      retrieval_k: null,
      token_budget: 1200,
      short_term_token_threshold: null,
      dedupe_threshold: null,
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    assert.equal(overrides.enabled, false);
    assert.equal(overrides.ttlDays, 30);
    assert.equal(overrides.tokenBudget, 1200);
    assert.equal("retrievalK" in overrides, false);
  });

  it("expires the important items later than the trivial ones", () => {
    const config = resolveMemoryConfig("agent-1");
    const important = computeExpiry(config, 0.9, new Date("2026-01-01T00:00:00Z"));
    const trivial = computeExpiry(config, 0.1, new Date("2026-01-01T00:00:00Z"));
    assert.ok(important && trivial);
    assert.ok(
      Date.parse(important) > Date.parse(trivial),
      "a low importance item expires sooner",
    );
  });

  it("never expires with a zero ttl", () => {
    const config = resolveMemoryConfig("agent-1", { ttlDays: 0 });
    assert.equal(computeExpiry(config, 0.9), null);
  });
});
