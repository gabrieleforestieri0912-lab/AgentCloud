import { describe, it, expect } from "vitest";
import { normalizeShopInput } from "./shopify-input";

describe("normalizeShopInput", () => {
  it("accepts a bare myshopify domain", () => {
    expect(normalizeShopInput("demo-store.myshopify.com")).toBe(
      "demo-store.myshopify.com",
    );
  });

  it("extracts the store host from a full store URL", () => {
    expect(
      normalizeShopInput("https://demo-store.myshopify.com/admin/products"),
    ).toBe("demo-store.myshopify.com");
  });

  it("lowercases and trims mixed input", () => {
    expect(normalizeShopInput("  HTTPS://My-Store.myshopify.com/path ")).toBe(
      "my-store.myshopify.com",
    );
  });

  it("rejects Shopify admin URLs without a store subdomain", () => {
    expect(
      normalizeShopInput("https://admin.shopify.com/store/whatever"),
    ).toBeNull();
  });

  it("rejects non-Shopify input", () => {
    expect(normalizeShopInput("not-a-shop")).toBeNull();
    expect(normalizeShopInput("demo-store.myshopify.com.br")).toBeNull();
  });
});
