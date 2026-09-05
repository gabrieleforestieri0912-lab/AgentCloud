import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSessionUser } from "@/lib/supabase/server";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";
import {
  buildGoogleConsentUrl,
  encodeGoogleState,
  GOOGLE_STATE_COOKIE,
  GOOGLE_RETURN_COOKIE,
  GOOGLE_STATE_MAX_AGE,
  OAUTH_RETURN_MAX_AGE,
} from "@/lib/google/oauth";

/**
 * Phase 2 — start the Google OAuth flow.
 *
 * GET /api/auth/google/connect[?returnTo=<path>]
 *   1. Requires an authenticated AgentCloud session (tokens are stored per
 *      user). Signing in is part of the flow: signed-out users are sent to
 *      /login?intent=google&next=… and resume here automatically afterwards.
 *   2. Issues a random nonce, embeds { nonce, userId } in the OAuth `state`
 *      (base64url JSON) and stores the nonce in a short-lived httpOnly cookie
 *      for verification at the callback (anti-CSRF).
 *   3. Stores the origin page (returnTo) so the callback can bring the user
 *      back there with ?google=connected|error.
 *   4. Redirects to the Google consent screen with access_type=offline and
 *      prompt=consent so a refresh token is always issued.
 *
 * No secrets are read from the request — GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 * are server-side env vars.
 */
export async function GET(req: NextRequest) {
  const returnParam = req.nextUrl.searchParams.get("returnTo");
  const returnTo = returnParam && isSafeRedirectPath(returnParam) ? returnParam : null;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    const nextPath =
      "/api/auth/google/connect" +
      (returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "");
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("intent", "google");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const url = new URL(returnTo ?? "/dashboard", req.url);
    url.searchParams.set("google", "error");
    url.searchParams.set("reason", "config");
    return NextResponse.redirect(url);
  }

  const nonce = crypto.randomBytes(24).toString("hex");
  const state = encodeGoogleState({ nonce, userId: sessionUser.id });
  const authorizeUrl = buildGoogleConsentUrl(state);

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(GOOGLE_STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GOOGLE_STATE_MAX_AGE,
  });
  if (returnTo) {
    res.cookies.set(GOOGLE_RETURN_COOKIE, returnTo, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: OAUTH_RETURN_MAX_AGE,
    });
  }
  return res;
}
