import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Shared Shopify OAuth helpers (server-only). No secrets are hard-coded here —
 * SHOPIFY_API_KEY / SHOPIFY_API_SECRET / SHOPIFY_SCOPES are read from the
 * environment at runtime.
 */

export const SHOPIFY_STATE_COOKIE = "ac_shopify_state";
export const SHOPIFY_STATE_MAX_AGE = 60 * 10; // 10 minutes

/** Agent slug that triggers the in-chat Shopify connection prompt. */
export const SHOPIFY_AGENT_SLUG =
  process.env.SHOPIFY_AGENT_SLUG || "shopify-agent";

/** Default scopes proposed in the spec (Phase 0). Override via SHOPIFY_SCOPES. */
const DEFAULT_SCOPES =
  "read_products write_products read_orders write_orders read_inventory write_inventory";

/**
 * Validate and normalize a Shopify shop domain. Rejects anything containing a
 * scheme, path, query or characters outside a `*.myshopify.com` host, which
 * prevents open-redirect abuse of the authorize endpoint.
 */
export function normalizeShop(shop: string): string | null {
  const s = shop.trim().toLowerCase();
  if (
    s.includes("/") ||
    s.includes(":") ||
    s.includes("?") ||
    s.includes("#")
  ) {
    return null;
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]\.myshopify\.com$/.test(s)) {
    return null;
  }
  return s;
}

export function getShopifyScopes(): string {
  return process.env.SHOPIFY_SCOPES || DEFAULT_SCOPES;
}

export function getShopifyRedirectUri(): string {
  return (
    process.env.SHOPIFY_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_URL ?? ""}/api/shopify/callback`
  );
}

/** Public base URL used for webhook subscription callbacks. */
export function getShopifyWebhookAddress(): string {
  return (
    process.env.SHOPIFY_WEBHOOK_ADDRESS ||
    `${process.env.NEXT_PUBLIC_URL ?? ""}/api/shopify/webhooks`
  );
}

/**
 * Verify a Shopify webhook HMAC: Shopify sends `X-Shopify-Hmac-SHA256`, the
 * base64 of the HMAC-SHA256 of the *raw* request body computed with the app
 * secret. Computed value must match the header in constant time.
 */
export function verifyShopifyWebhookHmac(
  rawBody: string,
  hmacHeader: string,
  secret: string,
): boolean {
  if (!hmacHeader) return false;
  const computed = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

/** Build the Shopify authorize URL the user is redirected to. */
export function buildAuthorizeUrl(shop: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_API_KEY || "",
    scope: getShopifyScopes(),
    redirect_uri: getShopifyRedirectUri(),
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Verify the Shopify request HMAC: hash all query params (except `hmac`),
 * sorted lexicographically as `key=value`, with the client secret, and compare
 * to the `hmac` param in constant time.
 */
export function verifyShopifyHmac(
  params: URLSearchParams,
  secret: string,
): boolean {
  const map: Record<string, string> = {};
  params.forEach((v, k) => {
    if (k !== "hmac") map[k] = v;
  });
  const sorted = Object.keys(map)
    .sort()
    .map((k) => `${k}=${map[k]}`)
    .join("&");
  const computed = createHmac("sha256", secret).update(sorted).digest("hex");
  const hmac = params.get("hmac") || "";
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(hmac));
  } catch {
    return false;
  }
}

/** Read the CSRF state cookie set during the install step. */
export function readShopifyStateCookie(req: NextRequest): string | undefined {
  return req.cookies.get(SHOPIFY_STATE_COOKIE)?.value;
}
