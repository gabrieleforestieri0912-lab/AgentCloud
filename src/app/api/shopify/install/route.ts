import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSessionUser } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import { ACCESS_COOKIE } from "@/lib/waitlist-constants";
import {
  normalizeShop,
  buildAuthorizeUrl,
  SHOPIFY_STATE_COOKIE,
  SHOPIFY_RETURN_COOKIE,
  SHOPIFY_STATE_MAX_AGE,
  OAUTH_RETURN_MAX_AGE,
} from "@/lib/shopify/oauth";

/**
 * Phase 2 — start the Shopify OAuth flow.
 *
 * GET /api/shopify/install?shop=<store>.myshopify.com[&returnTo=<path>]
 *   1. Requires an authenticated AgentCloud session (token is stored per
 *      user). Signing in is part of the flow: signed-out users are sent to
 *      /login?intent=shopify&next=… and resume here automatically after
 *      signing in — never a dead end.
 *   2. Validates the shop domain (must be *.myshopify.com) to avoid open
 *      redirect.
 *   3. Issues a random CSRF `state`, stores it in an httpOnly cookie.
 *   4. Stores where the user came from (returnTo) so the OAuth callback can
 *      bring them back to the same page with ?shopify=connected|error.
 *   5. Redirects to Shopify's authorize endpoint.
 *
 * No secrets are read from the request body — SHOPIFY_API_KEY is server-side.
 */
export async function GET(req: NextRequest) {
  // Where to land after the OAuth round-trip (same-origin relative path).
  const returnParam = req.nextUrl.searchParams.get("returnTo");
  const returnTo = returnParam && isSafeRedirectPath(returnParam) ? returnParam : null;

  const shopParam = req.nextUrl.searchParams.get("shop") || "";
  const shop = normalizeShop(shopParam);
  if (!shop) {
    const url = new URL(returnTo ?? "/dashboard", req.url);
    url.searchParams.set("shopify", "error");
    url.searchParams.set("reason", "invalid_shop");
    return NextResponse.redirect(url);
  }

  // Who is connecting?
  //  - Access-code holder (admin) → the store is stored as the shared tenant
  //    connection; no email is recorded and no login is required. Even when
  //    an admin happens to be signed in, the store goes to the tenant so the
  //    client's store is the one every code holder tests against.
  //  - Regular signed-in user → the store is stored on their account
  //    (per-user), which is what the callback persists.
  //  - Anyone else → sign in first, then this route runs again.
  const sessionUser = await getSessionUser();
  const isAccessHolder = req.cookies.get(ACCESS_COOKIE)?.value === "1";
  if (!sessionUser && !isAccessHolder) {
    const nextPath =
      `/api/shopify/install?shop=${encodeURIComponent(shop)}` +
      (returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "");
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("intent", "shopify");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  const state = crypto.randomBytes(32).toString("hex");
  const authorizeUrl = buildAuthorizeUrl(shop, state);

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(SHOPIFY_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SHOPIFY_STATE_MAX_AGE,
  });
  if (returnTo) {
    res.cookies.set(SHOPIFY_RETURN_COOKIE, returnTo, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: OAUTH_RETURN_MAX_AGE,
    });
  }
  return res;
}
