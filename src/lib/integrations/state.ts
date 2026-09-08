import crypto from "crypto";
import type { NextRequest } from "next/server";

/**
 * Signed state for generic OAuth CSRF protection (Phase 2).
 * Payload: { t: tenantId, p: provider, n: nonce, e: expMs }
 * state = base64url(JSON payload) + "." + hex(HMAC-SHA256(payload, key))
 * Cookie: ac_integrations_state = state (httpOnly); callback verifies timingSafeEqual + HMAC + exp + tenant/provider match.
 * Mirrors SHOPIFY_STATE_COOKIE / GOOGLE_STATE_COOKIE pattern, but provider-agnostic.
 */

export const INTEGRATIONS_STATE_COOKIE = "ac_integrations_state";
export const INTEGRATIONS_STATE_MAX_AGE = 60 * 10; // 10 min
export const INTEGRATIONS_RETURN_COOKIE = "ac_integrations_return";
export const OAUTH_RETURN_MAX_AGE = 60 * 15; // 15 min

function keyForHmac(): string {
  return process.env.INTEGRATIONS_STATE_SECRET || process.env.TENANT_STORE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-integrations-state";
}

export type IntegrationsStatePayload = {
  t: string; // tenantId (auth.users.id)
  p: string; // provider
  n: string; // nonce
  e: number; // exp epoch ms
};

export function buildState(tenantId: string, provider: string): { state: string; cookieValue: string } {
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload: IntegrationsStatePayload = {
    t: tenantId,
    p: provider,
    n: nonce,
    e: Date.now() + INTEGRATIONS_STATE_MAX_AGE * 1000,
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", keyForHmac()).update(b64).digest("hex");
  const state = `${b64}.${sig}`;
  return { state, cookieValue: state };
}

export function verifyState(state: string, cookieValue: string | undefined): IntegrationsStatePayload | null {
  if (!state || !cookieValue) return null;
  if (state.length !== cookieValue.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(state), Buffer.from(cookieValue))) return null;
  } catch {
    return null;
  }
  const [b64, sig] = state.split(".");
  if (!b64 || !sig) return null;
  const expected = crypto.createHmac("sha256", keyForHmac()).update(b64).digest("hex");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as IntegrationsStatePayload;
    if (!payload.t || !payload.p || !payload.n || !payload.e) return null;
    if (typeof payload.e !== "number" || Date.now() > payload.e) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readStateCookie(req: NextRequest): string | undefined {
  return req.cookies.get(INTEGRATIONS_STATE_COOKIE)?.value;
}
