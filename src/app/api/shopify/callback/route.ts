import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getSessionUser } from "@/lib/supabase/server";
import {
  normalizeShop,
  verifyShopifyHmac,
  readShopifyStateCookie,
  SHOPIFY_STATE_COOKIE,
} from "@/lib/shopify/oauth";
import { upsertShopifyConnection } from "@/lib/shopify/connections";
import { registerShopifyWebhooks } from "@/lib/shopify/webhooks";

/**
 * Phase 3 — Shopify OAuth callback + token exchange.
 *
 * GET /api/shopify/callback?code&shop&state&hmac&timestamp&...
 *   1. Requires an authenticated AgentCloud session.
 *   2. Verifies the `state` CSRF cookie (rejects on mismatch).
 *   3. Verifies the request HMAC with SHOPIFY_API_SECRET (integrity of redirect).
 *   4. Exchanges `code` for an access token via the Shopify token endpoint.
 *   5. Encrypts the token and stores it per (user, shop) in shopify_connections.
 *   Errors are surfaced via ?shopify=error&reason=... — never silent.
 */
export async function GET(req: NextRequest) {
  const dashboardError = (reason: string) =>
    NextResponse.redirect(
      new URL(`/dashboard?shopify=error&reason=${reason}`, req.url),
    );

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.redirect(new URL("/login?shopify=error&reason=auth", req.url));
  }

  const params = req.nextUrl.searchParams;
  const shopParam = params.get("shop") || "";
  const code = params.get("code");
  const state = params.get("state");
  const hmac = params.get("hmac");

  const shop = normalizeShop(shopParam);
  if (!shop || !code || !state || !hmac) {
    return dashboardError("missing_params");
  }

  // 2. CSRF state check
  const cookieState = readShopifyStateCookie(req);
  if (
    !cookieState ||
    cookieState.length !== state.length ||
    !timingSafeEqual(Buffer.from(cookieState), Buffer.from(state))
  ) {
    return dashboardError("state_mismatch");
  }

  const secret = process.env.SHOPIFY_API_SECRET;
  const clientId = process.env.SHOPIFY_API_KEY;
  if (!secret || !clientId) {
    return dashboardError("config");
  }

  // 3. HMAC integrity check
  if (!verifyShopifyHmac(params, secret)) {
    return dashboardError("hmac");
  }

  // 4. Exchange code for an access token
  let tokenData: { access_token?: string; scope?: string };
  try {
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: secret, code }),
    });
    if (!tokenRes.ok) {
      return dashboardError("token_exchange");
    }
    tokenData = await tokenRes.json();
  } catch {
    return dashboardError("token_exchange");
  }

  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return dashboardError("no_token");
  }

  // 5. Encrypt + persist (per user, per shop)
  try {
    await upsertShopifyConnection({
      userId: sessionUser.id,
      shopDomain: shop,
      accessToken,
      scope: tokenData.scope,
    });
  } catch {
    return dashboardError("store");
  }

  // 6. Best-effort: register mandatory webhooks (app/uninstalled + GDPR).
  // Non-fatal — missing webhooks only degrade uninstall/revocation handling.
  void registerShopifyWebhooks(shop, accessToken).catch(() => {});

  const res = NextResponse.redirect(
    new URL("/dashboard?shopify=connected", req.url),
  );
  res.cookies.delete(SHOPIFY_STATE_COOKIE);
  return res;
}
