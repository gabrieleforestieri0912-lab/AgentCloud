import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateMeterUnits,
  calculateOverageAmountCents,
  isOverageBillingEnabled,
} from "./overage";

describe("calculateMeterUnits", () => {
  it("returns 0 for no overage", () => {
    expect(calculateMeterUnits(0)).toBe(0);
    expect(calculateMeterUnits(-5)).toBe(0);
  });

  it("rounds up to whole 1.000-token units", () => {
    expect(calculateMeterUnits(1)).toBe(1);
    expect(calculateMeterUnits(500)).toBe(1);
    expect(calculateMeterUnits(1_000)).toBe(1);
    expect(calculateMeterUnits(1_001)).toBe(2);
    expect(calculateMeterUnits(9_999)).toBe(10);
    expect(calculateMeterUnits(123_456)).toBe(124);
  });
});

describe("calculateOverageAmountCents", () => {
  it("charges whole meter units at the per-1.000-token rate", () => {
    expect(calculateOverageAmountCents(0)).toBe(0);
    expect(calculateOverageAmountCents(500)).toBe(30); // 1 unit
    expect(calculateOverageAmountCents(1_000)).toBe(30);
    expect(calculateOverageAmountCents(1_500)).toBe(60); // 2 units
    expect(calculateOverageAmountCents(9_999)).toBe(300); // 10 units
    expect(calculateOverageAmountCents(10_000)).toBe(300);
  });
});

describe("isOverageBillingEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled when the metered price is missing", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("STRIPE_OVERAGE_PRICE_ID", "");
    expect(isOverageBillingEnabled()).toBe(false);
  });

  it("is disabled when the secret key is missing", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_OVERAGE_PRICE_ID", "price_x");
    expect(isOverageBillingEnabled()).toBe(false);
  });

  it("is enabled when both are configured", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("STRIPE_OVERAGE_PRICE_ID", "price_x");
    expect(isOverageBillingEnabled()).toBe(true);
  });
});
