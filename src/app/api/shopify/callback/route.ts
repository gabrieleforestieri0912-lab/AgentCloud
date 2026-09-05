import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getSessionUser } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import {
  normalizeShop,
  verifyShopifyHmac,
  readShopifyStateCookie,
  SHOPIFY_STATE_COOKIE,
  SHOPIFY_RETURN_COOKIE,
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
 *
 * The user is sent back to the page they started from (returnTo cookie) with
 * ?shopify=connected|error&reason=... — never a bare redirect to a dead end.
 */
export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    // Session expired mid-flow: the one-time code can't be replayed, so the
    // user just needs to start the connection again after signing in.
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("intent", "shopify");
    return NextResponse.redirect(loginUrl);
  }

  const returnBase = () => {
    const c = req.cookies.get(SHOPIFY_RETURN_COOKIE)?.value;
    return c && isSafeRedirectPath(c) ? c : "/dashboard";
  };
  const out = (search: string) => {
    const base = returnBase();
    const sep = base.includes("?") ? "&" : "?";
    const res = NextResponse.redirect(new URL(`${base}${sep}${search}`, req.url));
    res.cookies.delete(SHOPIFY_STATE_COOKIE);
    res.cookies.delete(SHOPIFY_RETURN_COOKIE);
    return res;
  };
  const fail = (reason: string) => out(`shopify=error&reason=${reason}`);

  const params = req.nextUrl.searchParams;
  const shopParam = params.get("shop") || "";
  const code = params.get("code");
  const state = params.get("state");
  const hmac = params.get("hmac");

  const shop = normalizeShop(shopParam);
  if (!shop || !code || !state || !hmac) {
    return fail("missing_params");
  }

  // 2. CSRF state check
  const cookieState = readShopifyStateCookie(req);
  if (
    !cookieState ||
    cookieState.length !== state.length ||
    !timingSafeEqual(Buffer.from(cookieState), Buffer.from(state))
  ) {
    return fail("state_mismatch");
  }

  const secret = process.env.SHOPIFY_API_SECRET;
  const clientId = process.env.SHOPIFY_API_KEY;
  if (!secret || !clientId) {
    return fail("config");
  }

  // 3. HMAC integrity check
  if (!verifyShopifyHmac(params, secret)) {
    return fail("hmac");
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
      return fail("token_exchange");
    }
    tokenData = await tokenRes.json();
  } catch {
    return fail("token_exchange");
  }

  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return fail("no_token");
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
    return fail("store");
  }

  // 6. Best-effort: register mandatory webhooks (app/uninstalled + GDPR).
  // Non-fatal — missing webhooks only degrade uninstall/revocation handling.
  void registerShopifyWebhooks(shop, accessToken).catch(() => {});

  return out("shopify=connected");
}
