import { describe, expect, it } from "vitest";
import { isPublicPath } from "./public-paths";

describe("isPublicPath", () => {
  it("protects the dashboard, chat and billing portal", () => {
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/chat")).toBe(false);
    expect(isPublicPath("/api/billing/portal")).toBe(false);
  });

  it("keeps marketing pages public", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/demo")).toBe(true);
    expect(isPublicPath("/agents")).toBe(true);
    expect(isPublicPath("/agents/shopify-agent")).toBe(true);
    expect(isPublicPath("/waitlist")).toBe(true);
    expect(isPublicPath("/contact")).toBe(true);
    expect(isPublicPath("/privacy")).toBe(true);
    expect(isPublicPath("/terms")).toBe(true);
    expect(isPublicPath("/refunds")).toBe(true);
  });

  it("keeps auth pages public", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/signup")).toBe(true);
    expect(isPublicPath("/reset-password")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
  });

  it("keeps public agent previews open (the /a prefix covers /agent too)", () => {
    expect(isPublicPath("/a/shopify-agent")).toBe(true);
    expect(isPublicPath("/agent/seo-agent")).toBe(true);
  });

  it("keeps public APIs and webhooks open, incl. token-gated admin routes", () => {
    expect(isPublicPath("/api/agent/run")).toBe(true);
    expect(isPublicPath("/api/billing/webhook")).toBe(true);
    expect(isPublicPath("/api/billing/payment-link")).toBe(true);
    expect(isPublicPath("/api/email/send")).toBe(true);
    expect(isPublicPath("/api/admin/tenants")).toBe(true);
    expect(isPublicPath("/api/whatsapp/webhook")).toBe(true);
    expect(isPublicPath("/api/embed/shopify-agent")).toBe(true);
  });

  it("does not leak protection to similar prefixes", () => {
    // "/contact" must not open "/contacts-admin" and "/a" must not open
    // protected "/api/billing/portal".
    expect(isPublicPath("/contacts-admin")).toBe(false);
    expect(isPublicPath("/api/billing/portal")).toBe(false);
  });
});
