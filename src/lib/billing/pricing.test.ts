import { describe, expect, it } from "vitest";
import {
  DEFAULT_TOKEN_LIMIT,
  OVERAGE_HARD_CAP_MULTIPLIER,
  OVERAGE_RATE_PER_1000_TOKENS,
  SHOPIFY_PRICING,
  SERVICES_PRICING,
  calculateCostPerToken,
  getPlan,
  getPricing,
  isWithinLimit,
} from "./pricing";

describe("pricing", () => {
  it("exposes both verticals with starter and growth plans", () => {
    expect(getPricing("shopify")).toBe(SHOPIFY_PRICING);
    expect(getPricing("services")).toBe(SERVICES_PRICING);
    expect(getPricing("shopify").plans.starter.tokens).toBe(300_000);
    expect(getPricing("shopify").plans.growth.tokens).toBe(1_000_000);
  });

  it("getPlan returns the requested plan or null", () => {
    const plan = getPlan("shopify", "growth");
    expect(plan?.id).toBe("shopify-growth");
    expect(plan?.price).toBe(3900);
    expect(plan?.tokens).toBe(1_000_000);
    expect(getPlan("services", "starter")?.price).toBe(2900);
    expect(getPlan("shopify", "enterprise" as never)).toBeNull();
  });

  it("isWithinLimit allows usage below the limit and blocks at/above it", () => {
    expect(isWithinLimit(299_999, 300_000)).toBe(true);
    expect(isWithinLimit(300_000, 300_000)).toBe(false);
    expect(isWithinLimit(300_001, 300_000)).toBe(false);
    expect(isWithinLimit(0, 0)).toBe(false);
  });

  it("calculateCostPerToken returns cents per 1000 tokens", () => {
    expect(calculateCostPerToken(2900, 300_000)).toBeCloseTo(9.67, 1);
    expect(calculateCostPerToken(3900, 1_000_000)).toBeCloseTo(3.9, 1);
    expect(calculateCostPerToken(2900, 0)).toBe(0);
  });

  it("exposes the overage rate and hard cap", () => {
    // €0,30 per 1.000 extra tokens, safety cap at 2x the allowance.
    expect(OVERAGE_RATE_PER_1000_TOKENS).toBe(30);
    expect(OVERAGE_HARD_CAP_MULTIPLIER).toBe(2);
  });

  it("exposes a sane default token allowance", () => {
    expect(DEFAULT_TOKEN_LIMIT).toBe(300_000);
  });
});
