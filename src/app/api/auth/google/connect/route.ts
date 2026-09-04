import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSessionUser } from "@/lib/supabase/server";
import {
  buildGoogleConsentUrl,
  encodeGoogleState,
  GOOGLE_STATE_COOKIE,
  GOOGLE_STATE_MAX_AGE,
} from "@/lib/google/oauth";

/**
 * Phase 2 — start the Google OAuth flow.
 *
 * GET /api/auth/google/connect
 *   1. Requires an authenticated AgentCloud session (tokens are stored per user).
 *   2. Issues a random nonce, embeds { nonce, userId } in the OAuth `state`
 *      (base64url JSON) and stores the nonce in a short-lived httpOnly cookie
 *      for verification at the callback (anti-CSRF).
 *   3. Redirects to the Google consent screen with access_type=offline and
 *      prompt=consent so a refresh token is always issued.
 *
 * No secrets are read from the request — GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 * are server-side env vars.
 */
export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.redirect(
      new URL("/login?google=error&reason=auth", req.url),
    );
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL("/dashboard?google=error&reason=config", req.url),
    );
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
  return res;
}