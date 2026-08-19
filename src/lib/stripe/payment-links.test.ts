import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPaymentLinkUrl,
  getAllPaymentLinks,
  getPaymentLink,
} from "./payment-links";

const ENV_BACKUP = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ENV_BACKUP };
});

afterEach(() => {
  process.env = ENV_BACKUP;
});

describe("payment-links", () => {
  it("getPaymentLink resolves the env var for an agent slug", () => {
    process.env.STRIPE_PAYMENT_LINK_SEO_AGENT = "https://buy.stripe.com/test-seo";
    expect(getPaymentLink("seo-agent")).toBe(
      "https://buy.stripe.com/test-seo",
    );
  });

  it("getPaymentLink returns null when the env var is missing", () => {
    delete process.env.STRIPE_PAYMENT_LINK_SEO_AGENT;
    expect(getPaymentLink("seo-agent")).toBeNull();
  });

  it("getAllPaymentLinks returns only STRIPE_PAYMENT_LINK_* vars", () => {
    process.env.STRIPE_PAYMENT_LINK_SHOPIFY_AGENT = "https://buy.stripe.com/a";
    process.env.STRIPE_PAYMENT_LINK_LEAD_CAPTURE = "https://buy.stripe.com/b";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    const links = getAllPaymentLinks();
    expect(links["shopify-agent"]).toBe("https://buy.stripe.com/a");
    expect(links["lead-capture"]).toBe("https://buy.stripe.com/b");
    expect(Object.keys(links)).not.toContain("secret-key");
  });

  it("buildPaymentLinkUrl returns null when no base link is configured", () => {
    delete process.env.STRIPE_PAYMENT_LINK_SEO_AGENT;
    expect(
      buildPaymentLinkUrl("seo-agent", { userId: "user_1" }),
    ).toBeNull();
  });

  it("buildPaymentLinkUrl appends identity and metadata params", () => {
    process.env.STRIPE_PAYMENT_LINK_SEO_AGENT =
      "https://buy.stripe.com/base";
    const url = buildPaymentLinkUrl("seo-agent", {
      userId: "user_123",
      email: "a@b.com",
      metadata: { vertical: "shopify" },
    });
    expect(url).toContain("client_reference_id=user_123");
    expect(url).toContain("prefilled_email=a%40b.com");
    expect(url).toContain("metadata%5Bagent_id%5D=seo-agent");
    expect(url).toContain("metadata%5Bvertical%5D=shopify");
    expect(url).toContain("metadata%5Bsource%5D=agentcloud");
  });
});
