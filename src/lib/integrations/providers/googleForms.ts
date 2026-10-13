import type { IntegrationProvider, TokenExchangeResult } from "../types";

/**
 * Google Forms — riusa l'OAuth client Google già presente (stesso client id di
 * Drive/Sheets/Docs, redirect dedicato da registrare accanto agli altri).
 *
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (gli stessi di google_drive).
 * Redirect: /api/integrations/google_forms/callback.
 *
 * Scope minimi (verifica docs ottobre 2026, API gratuita, quote solo
 * per-minuto, per-day illimitato):
 *   forms.body              → creare/modificare form (non restricted: niente
 *                             assessment CASA a pagamento).
 *   forms.responses.readonly → leggere le risposte (stesso, non restricted).
 *   drive.file              → NON-SENSITIVE: serve alla creazione del file del
 *                             form su Drive (ogni form ha un file collegato).
 * Niente Pub/Sub: le risposte si sincronizzano con polling incrementale
 * on-demand (nessun servizio cloud aggiuntivo, costo zero).
 *
 * Accesso offline + prompt=consent: stesso trade-off di googleDrive.ts.
 */
const FORMS_SCOPES = [
  "https://www.googleapis.com/auth/forms.body",
  "https://www.googleapis.com/auth/forms.responses.readonly",
  "https://www.googleapis.com/auth/drive.file",
];

function scopes(): string {
  return (process.env.GOOGLE_FORMS_SCOPES || FORMS_SCOPES.join(" "))
    .split(/[,\s]+/)
    .filter(Boolean)
    .join(" ");
}

/** Email dell'account Google collegato (etichetta UI, best-effort). */
async function bestEffortEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const info = (await res.json()) as { email?: string };
    return info.email ?? null;
  } catch {
    return null;
  }
}

export const googleFormsProvider: IntegrationProvider = {
  provider: "google_forms",

  getAuthUrl({ state, redirectUri }) {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    if (!clientId) {
      throw new Error("Google Forms non configurato (GOOGLE_CLIENT_ID mancante nel file .env)");
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes(),
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  async exchangeCode({ code, redirectUri }): Promise<TokenExchangeResult> {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(
        (json.error_description as string) ||
          (json.error as string) ||
          `Google Forms token exchange failed (${res.status})`,
      );
    }
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("Google Forms: no access_token");

    const refreshToken = (json.refresh_token as string | undefined) ?? null;
    const expiresIn = json.expires_in as number | undefined;
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const email = await bestEffortEmail(accessToken);

    return {
      accessToken,
      refreshToken,
      expiresAt,
      scope: (json.scope as string | undefined) ?? scopes(),
      externalAccountId: email,
      metadata: {
        token_type: json.token_type,
        google_email: email,
      },
      raw: { ...json, access_token: undefined, refresh_token: undefined },
    };
  },

  async refreshToken({ refreshToken }) {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(
        (json.error_description as string) || `Google Forms refresh failed (${res.status})`,
      );
    }
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("Google Forms refresh: no access_token");
    const expiresIn = json.expires_in as number | undefined;
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;
    return {
      accessToken,
      // Google non emette nuovi refresh token: si conserva quello salvato.
      refreshToken,
      expiresAt,
      scope: (json.scope as string | undefined) ?? scopes(),
      raw: { ...json, access_token: undefined, refresh_token: undefined },
    };
  },

  async revokeToken({ accessToken }) {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: accessToken,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    }).catch(() => {});
  },
};
