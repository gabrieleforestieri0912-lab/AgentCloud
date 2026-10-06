import type { IntegrationProvider, TokenExchangeResult } from "../types";

/**
 * Airtable OAuth 2.0 con PKCE.
 *
 * Env: AIRTABLE_CLIENT_ID, AIRTABLE_CLIENT_SECRET.
 * Redirect: /api/integrations/airtable/callback — da registrare sull'integrazione
 * creata su airtable.com/develop.
 *
 * PKCE (S256) obbligatorio in questo repo per Airtable: il `code_verifier` resta
 * nel cookie httpOnly e nello state finisce solo la `code_challenge`. Il
 * verifier non transita mai dalla barra degli indirizzi, quindi un state
 * intercettato non basta a completare lo scambio.
 *
 * Scope (cfr. PROVIDER_CATALOG): data.records:read, data.records:write,
 * schema.bases:read. `data.records:write` è dichiarato perché i tool
 * airtable_create_record / update_record sono previsti; in questa versione i
 * tool esposti sono read-only (Open Decision 14).
 */
const DEFAULT_SCOPES = [
  "data.records:read",
  "data.records:write",
  "schema.bases:read",
];

function scopes(): string {
  return (process.env.AIRTABLE_SCOPES || DEFAULT_SCOPES.join(" "))
    .split(/[,\s]+/)
    .filter(Boolean)
    .join(" ");
}

/**
 * Identità del token: GET /v2/meta/whoami.
 * Serve per l'etichetta in UI e per capire se il token è scaduto. Best-effort:
 * l'id dell'utente non è essenziale per la connessione.
 */
async function bestEffortWhoami(accessToken: string): Promise<{ id?: string; email?: string; scopes?: string[] }> {
  try {
    const res = await fetch("https://api.airtable.com/v2/meta/whoami", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return {};
    return (await res.json()) as { id?: string; email?: string; scopes?: string[] };
  } catch {
    return {};
  }
}

export const airtableProvider: IntegrationProvider = {
  provider: "airtable",

  getAuthUrl({ state, redirectUri, pkce }) {
    const clientId = process.env.AIRTABLE_CLIENT_ID || "";
    if (!clientId) {
      throw new Error("Airtable non configurato (AIRTABLE_CLIENT_ID mancante nel file .env)");
    }
    if (!pkce?.codeChallenge) {
      // Non è un errore recuperabile: senza challenge Airtable rifiuta lo scambio.
      throw new Error("Airtable richiede PKCE: code_challenge non disponibile");
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes(),
      state,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: "S256",
    });
    return `https://airtable.com/oauth2/v1/authorize?${params.toString()}`;
  },

  async exchangeCode({ code, redirectUri, codeVerifier }): Promise<TokenExchangeResult> {
    const clientId = process.env.AIRTABLE_CLIENT_ID || "";
    const clientSecret = process.env.AIRTABLE_CLIENT_SECRET || "";
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });
    if (!codeVerifier) {
      throw new Error("Airtable PKCE: code_verifier mancante");
    }
    body.set("code_verifier", codeVerifier);

    const res = await fetch("https://airtable.com/oauth2/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(
        (json.error_description as string) ||
          (json.error as string) ||
          `Airtable token exchange failed (${res.status})`,
      );
    }
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("Airtable: no access_token");

    const expiresIn = json.expires_in as number | undefined; // tipicamente 3600 (1h)
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;
    // I refresh token Airtable scadono (refresh_expires_in, tipicamente 60gg):
    // lo teniamo per poter dire in UI che è il tempo che resta.
    const refreshExpiresIn = json.refresh_expires_in as number | undefined;
    const refreshExpiresAt = refreshExpiresIn
      ? new Date(Date.now() + refreshExpiresIn * 1000).toISOString()
      : null;

    const who = await bestEffortWhoami(accessToken);

    return {
      accessToken,
      refreshToken: (json.refresh_token as string | undefined) ?? null,
      expiresAt,
      scope: (json.scope as string | undefined) ?? scopes(),
      externalAccountId: who.email ?? who.id ?? null,
      metadata: {
        token_type: json.token_type,
        airtable_user_id: who.id ?? null,
        airtable_email: who.email ?? null,
        granted_scopes: who.scopes ?? null,
        refresh_expires_at: refreshExpiresAt,
      },
      raw: json,
    };
  },

  async refreshToken({ refreshToken }) {
    const clientId = process.env.AIRTABLE_CLIENT_ID || "";
    const clientSecret = process.env.AIRTABLE_CLIENT_SECRET || "";
    const res = await fetch("https://airtable.com/oauth2/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }).toString(),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(
        (json.error_description as string) || `Airtable refresh failed (${res.status})`,
      );
    }
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("Airtable refresh: no access_token");
    const expiresIn = json.expires_in as number | undefined;
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;
    // Come per Google, se Airtable non rimanda un refresh token va conservato
    // quello vecchio: azzerarlo renderebbe la riga irrecuperabile al rinnovo dopo.
    const newRefresh = (json.refresh_token as string | undefined) ?? refreshToken;
    return {
      accessToken,
      refreshToken: newRefresh,
      expiresAt,
      scope: (json.scope as string | undefined) ?? scopes(),
      raw: json,
    };
  },
};