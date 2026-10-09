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

/**
 * Cookie separato per il PKCE `code_verifier`. Non sta nello `state` perché lo
 * state attraversa la barra degli indirizzi del browser e del provider: il
 * verifier è la metà segreta dello scambio e deve restare httpOnly. Viene
 * riletto nel callback e confrontato con il tenant per non poter essere
 * riutilizzato su un authorize di un altro account.
 */
export const INTEGRATIONS_PKCE_COOKIE = "ac_integrations_pkce";
export const INTEGRATIONS_PKCE_MAX_AGE = 60 * 10; // 10 min

function keyForHmac(): string {
  return process.env.INTEGRATIONS_STATE_SECRET || process.env.TENANT_STORE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-integrations-state";
}

export type IntegrationsStatePayload = {
  t: string; // tenantId (auth.users.id)
  p: string; // provider
  n: string; // nonce
  e: number; // exp epoch ms
  /**
   * Dati raccolti dall'utente prima di autorizzare (es. `store_url` WooCommerce).
   * Firmati insieme al resto: senza la firma l'attaccante cambierebbe l'host
   * verso cui il server chiama, che è esattamente l'attacco SSRF da bloccare.
   */
  x?: Record<string, string>;
};

export function buildState(
  tenantId: string,
  provider: string,
  tenantInput?: Record<string, string>,
): { state: string; cookieValue: string } {
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload: IntegrationsStatePayload = {
    t: tenantId,
    p: provider,
    n: nonce,
    e: Date.now() + INTEGRATIONS_STATE_MAX_AGE * 1000,
  };
  if (tenantInput && Object.keys(tenantInput).length > 0) payload.x = tenantInput;
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

// ---------------------------------------------------------------------------
// Token firmato che viaggia NELLA URL (WooCommerce)
// ---------------------------------------------------------------------------

/**
 * Come `buildState`, ma il token è pensato per stare dentro `return_url` /
 * `callback_url` invece che nel parametro `state` di OAuth.
 *
 * Serve a WooCommerce, che NON ha un concetto di `state`: `WC_Auth::build_url()`
 * ricostruisce ogni hop interno da una allowlist fissa di cinque parametri e
 * scarta tutto il resto, quindi uno `state` finirebbe perso alla prima
 * redirezione. Di conseguenza il tenant non si ricava dai cookie — la POST con
 * le credenziali arriva dal server di WooCommerce, senza alcun cookie — e deve
 * poter essere letto dalla sola URL.
 *
 * `verifySignedState` fa quindi la verifica HMAC senza confrontare nulla con un
 * cookie: l'autenticità viene dalla firma, non dalla sessione del browser. Il
 * payload porta già `e` (scadenza), verificata insieme all'HMAC.
 */
export function buildSignedUrlToken(
  tenantId: string,
  provider: string,
  tenantInput?: Record<string, string>,
): string {
  return buildState(tenantId, provider, tenantInput).state;
}

/** Verifica un token firmato viaggiato nella URL, senza cookie. */
export function verifySignedUrlToken(token: string | null): IntegrationsStatePayload | null {
  if (!token) return null;
  const [b64, sig, extra] = token.split(".");
  if (!b64 || !sig || extra !== undefined) return null;
  const expected = crypto.createHmac("sha256", keyForHmac()).update(b64).digest("hex");
  // La lunghezza va controllata PRIMA di timingSafeEqual: `Buffer.from(s, "hex")`
  // è permissivo e si ferma al primo carattere non esadecimale, quindi una firma
  // con un suffisso spazzatura decodificherebbe negli stessi 32 byte e il confronto
  // passerebbe. Senza questo controllo, `token + "x"` sarebbe accettato come
  // valido. `verifyState` non ne ha bisogno perché prima confronta la lunghezza
  // dell'intero token con quella del cookie.
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as IntegrationsStatePayload;
    if (!payload.t || !payload.p || !payload.n || typeof payload.e !== "number") return null;
    if (Date.now() > payload.e) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// PKCE (per i provider che lo richiedono, es. Airtable)
// ---------------------------------------------------------------------------

export type PkcePair = { codeVerifier: string; codeChallenge: string };

/**
 * Genera la coppia PKCE (S256). Il verifier resta nel cookie httpOnly, nello
 * state finisce solo la challenge.
 */
export function createPkcePair(): PkcePair {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function readPkceCookie(req: NextRequest): string | undefined {
  return req.cookies.get(INTEGRATIONS_PKCE_COOKIE)?.value;
}
