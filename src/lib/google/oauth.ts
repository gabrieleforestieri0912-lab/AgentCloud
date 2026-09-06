import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Helper condivisi OAuth Google (server-only). Nessun segreto è hard-codato
 * qui: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI vengono
 * letti dall'ambiente a runtime. Specchia src/lib/shopify/oauth.ts.
 */

export const GOOGLE_STATE_COOKIE = "ac_google_state";
export const GOOGLE_STATE_MAX_AGE = 60 * 10; // 10 minutes

/** Cookie che ricorda la pagina a cui tornare dopo il round-trip OAuth. */
export const GOOGLE_RETURN_COOKIE = "ac_google_return";
export const OAUTH_RETURN_MAX_AGE = 60 * 15; // 15 minutes

/**
 * Write scopes: gli agenti devono poter inviare/eliminare email e creare/
 * eliminare eventi con promemoria. Include Gmail modify + Calendar full.
 * Override via GOOGLE_SCOPES se necessario.
 */
const DEFAULT_GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar",
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
 * Pagina dell'app a cui il flusso OAuth rimanda con ?google=connected|error.
 */
export const GOOGLE_SETTINGS_PATH = "/dashboard";

/**
 * Costruisce l'URL di consenso Google. `access_type=offline` è necessario
 * per ottenere un refresh token; `prompt=consent` garantisce che ne venga
 * (ri)emesso uno a ogni autorizzazione, anche quando l'utente ha già
 * concesso l'accesso in precedenza.
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

/** Payload dello `state` = { nonce, userId } codificato come JSON base64url. */
export type GoogleStatePayload = { nonce: string; userId: string };

export function encodeGoogleState(payload: GoogleStatePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/** Decodifica + valida un valore `state`. Restituisce null su input malformato. */
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

/** Confronto a tempo costante del nonce CSRF con il cookie httpOnly. */
export function googleStatesMatch(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/** Legge il cookie del nonce CSRF impostato durante il passo di connessione. */
export function readGoogleStateCookie(req: NextRequest): string | undefined {
  return req.cookies.get(GOOGLE_STATE_COOKIE)?.value;
}