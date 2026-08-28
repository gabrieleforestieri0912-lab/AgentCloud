import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSessionUser } from "@/lib/supabase/server";
import {
  normalizeShop,
  buildAuthorizeUrl,
  SHOPIFY_STATE_COOKIE,
  SHOPIFY_STATE_MAX_AGE,
} from "@/lib/shopify/oauth";

/**
 * Phase 2 — start the Shopify OAuth flow.
 *
 * GET /api/shopify/install?shop=<store>.myshopify.com
 *   1. Requires an authenticated AgentCloud session (token is stored per user).
 *   2. Validates the shop domain (must be *.myshopify.com) to avoid open redirect.
 *   3. Issues a random CSRF `state`, stores it in an httpOnly cookie.
 *   4. Redirects to Shopify's authorize endpoint.
 *
 * No secrets are read from the request body — SHOPIFY_API_KEY is server-side.
 */
export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.redirect(new URL("/login?shopify=error&reason=auth", req.url));
  }

  const shopParam = req.nextUrl.searchParams.get("shop") || "";
  const shop = normalizeShop(shopParam);
  if (!shop) {
    return NextResponse.redirect(
      new URL("/dashboard?shopify=error&reason=invalid_shop", req.url),
    );
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
  return res;
}
