import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Shared Google OAuth helpers (server-only). No secrets are hard-coded here —
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI are read from
 * the environment at runtime (Phase 2). Mirrors src/lib/shopify/oauth.ts.
 */

export const GOOGLE_STATE_COOKIE = "ac_google_state";
export const GOOGLE_STATE_MAX_AGE = 60 * 10; // 10 minutes

/**
 * Read-only scopes per the Fase 1-4 scope decision (sensitive, not
 * restricted, per Google). Override via GOOGLE_SCOPES (space- or
 * comma-separated) when Fase 5 write scopes are later enabled.
 */
const DEFAULT_GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export function getGoogleScopes(): string[] {
  const override = process.env.GOOGLE_SCOPES;
  return override
    ? override.split(/[\s,]+/).filter(Boolean)
    : DEFAULT_GOOGLE_SCOPES;
}

export function getGoogleRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_URL ?? ""}/api/auth/google/callback`
  );
}

/**
 * App page the OAuth flow redirects back to with ?google=connected|error.
 * Phase 6 will build the settings UI there (alongside ShopifyConnect).
 */
export const GOOGLE_SETTINGS_PATH = "/dashboard";

/**
 * Build the Google consent URL. `access_type=offline` is required to obtain a
 * refresh token; `prompt=consent` guarantees one is (re)issued on every
 * authorization, even when the user has previously granted access.
 */
export function buildGoogleConsentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: getGoogleScopes().join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** `state` payload = { nonce, userId } encoded as base64url JSON. */
export type GoogleStatePayload = { nonce: string; userId: string };

export function encodeGoogleState(payload: GoogleStatePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/** Decode + validate a `state` value. Returns null on any malformed input. */
export function decodeGoogleState(state: string): GoogleStatePayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8"),
    ) as GoogleStatePayload;
    if (
      typeof parsed.nonce !== "string" ||
      parsed.nonce.length < 16 ||
      typeof parsed.userId !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Constant-time comparison of the CSRF nonce with the httpOnly cookie. */
export function googleStatesMatch(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/** Read the CSRF nonce cookie set during the connect step. */
export function readGoogleStateCookie(req: NextRequest): string | undefined {
  return req.cookies.get(GOOGLE_STATE_COOKIE)?.value;
}