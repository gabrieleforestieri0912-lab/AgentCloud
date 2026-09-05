import { NextRequest, NextResponse } from "next/server";
import {
  decodeGoogleState,
  getGoogleRedirectUri,
  googleStatesMatch,
  readGoogleStateCookie,
  GOOGLE_STATE_COOKIE,
  GOOGLE_RETURN_COOKIE,
} from "@/lib/google/oauth";
import { upsertGoogleConnection } from "@/lib/google/connections";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin-access";
import { isSafeRedirectPath } from "@/lib/safe-redirect-path";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Phase 2 — Google OAuth callback + token exchange.
 *
 * GET /api/auth/google/callback?code&state&error...
 *   1. Verifies the `state` nonce against the httpOnly cookie (CSRF) and uses
 *      the user_id embedded in `state` (the connect step is authenticated).
 *   2. Exchanges `code` for access_token + refresh_token + expires_in.
 *   3. Fetches the connected Google account email (userinfo). The email is
 *      NOT persisted when the connecting account is an admin (privacy rule).
 *   4. Encrypts both tokens (AES-256-GCM) and upserts the per-user row.
 *
 * Every failure redirects back to the page the user started from (returnTo
 * cookie) with ?google=error&reason=... — never a blank page or a 500.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const returnBase = () => {
    const c = req.cookies.get(GOOGLE_RETURN_COOKIE)?.value;
    return c && isSafeRedirectPath(c) ? c : "/dashboard";
  };
  const done = (search: string) => {
    const base = returnBase();
    const sep = base.includes("?") ? "&" : "?";
    const res = NextResponse.redirect(new URL(`${base}${sep}${search}`, req.url));
    res.cookies.delete(GOOGLE_STATE_COOKIE);
    res.cookies.delete(GOOGLE_RETURN_COOKIE);
    return res;
  };
  const fail = (reason: string) => done(`google=error&reason=${reason}`);

  // User denied consent on the Google screen — readable message, not a 500.
  const oauthError = params.get("error");
  if (oauthError) {
    return fail(oauthError === "access_denied" ? "denied" : "consent");
  }

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) {
    return fail("missing_params");
  }

  // 1. CSRF check: state must decode and its nonce must match the httpOnly
  // cookie set by /connect. The user_id comes from the verified state.
  const payload = decodeGoogleState(state);
  const cookieNonce = readGoogleStateCookie(req);
  if (
    !payload ||
    !cookieNonce ||
    !googleStatesMatch(payload.nonce, cookieNonce)
  ) {
    return fail("state_mismatch");
  }
  if (!UUID_RE.test(payload.userId)) {
    return fail("state_mismatch");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return fail("config");
  }

  // 2. Exchange the authorization code for tokens (form-encoded, per Google).
  let tokenData: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getGoogleRedirectUri(),
        grant_type: "authorization_code",
      }).toString(),
    });
    if (!tokenRes.ok) {
      return fail("token_exchange");
    }
    tokenData = (await tokenRes.json()) as typeof tokenData;
  } catch {
    return fail("token_exchange");
  }

  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  if (!accessToken || !refreshToken) {
    return fail("no_token");
  }

  // 3. Connected Google account email (display nicety — non-fatal on failure).
  // Admins opt out: their connected email is never persisted.
  let googleEmail: string | null = null;
  let isAdmin = false;
  try {
    const admin = createAdminClient();
    if (admin) {
      const { data: u } = await admin.auth.admin.getUserById(payload.userId);
      isAdmin = isAdminEmail(u?.user?.email ?? null);
    }
  } catch {
    // fall back to non-admin (store the email)
  }
  if (!isAdmin) {
    try {
      const infoRes = await fetch(USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (infoRes.ok) {
        const info = (await infoRes.json()) as { email?: string };
        googleEmail = info.email ?? null;
      }
    } catch {
      // ignore — tokens are what matter
    }
  }

  // 4. Encrypt + persist (one row per user).
  try {
    await upsertGoogleConnection({
      userId: payload.userId,
      googleEmail,
      accessToken,
      refreshToken,
      scopes: (tokenData.scope ?? "").split(" ").filter(Boolean),
      expiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null,
    });
  } catch {
    return fail("store");
  }

  return done("google=connected");
}
