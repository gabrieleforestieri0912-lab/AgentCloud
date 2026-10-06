import type { IntegrationProvider, TokenExchangeResult } from "../types";

/**
 * Mailchimp Marketing API, OAuth 2.0.
 *
 * Env: MAILCHIMP_CLIENT_ID, MAILCHIMP_CLIENT_SECRET (li chiama "API Key" e
 * "Secret" nella schermata OAuth2 di Mailchimp).
 * Redirect: /api/integrations/mailchimp/callback.
 *
 * IL DATA CENTER. Mailchimp non ha un host unico: ogni account vive in un
 * datacenter (us1, us21, eu1...) e ogni chiamata va a
 * `https://<dc>.api.mailchimp.com/3.0`. Il `dc` e l'`api_url` arrivano nella
 * risposta allo scambio del token e sono l'unica fonte: non si possono dedurre.
 *
 * Per questo il `dc` finisce in `metadata` e l'adapter riceve `metadata` anche in
 * `refreshToken`: l'endpoint di rinnovo è
 * `https://<dc>.api.mailchimp.com/oauth2/token`, quindi senza il dc salvato il
 * rinnovo non saprebbe nemmeno dove scrivere.
 *
 * Scope: Mailchimp non usa scope OAuth. L'accesso è per-account e i permessi
 * dipendono dall'integrazione registrata ("Read-Write" o "Read Only"). Per
 * questo nel catalogo `scopes` è vuoto e l'unica leva è il tipo di integrazione.
 *
 * Autenticazione API: HTTP Basic con una stringa qualsiasi come username
 * (`anystring`) e l'access token come password. Non è `Bearer`.
 */
export const mailchimpProvider: IntegrationProvider = {
  provider: "mailchimp",

  getAuthUrl({ state, redirectUri }) {
    const clientId = process.env.MAILCHIMP_CLIENT_ID || "";
    if (!clientId) {
      throw new Error("Mailchimp non configurato (MAILCHIMP_CLIENT_ID mancante nel file .env)");
    }
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });
    return `https://login.mailchimp.com/oauth2/authorize?${params.toString()}`;
  },

  async exchangeCode({ code, redirectUri }): Promise<TokenExchangeResult> {
    const clientId = process.env.MAILCHIMP_CLIENT_ID || "";
    const clientSecret = process.env.MAILCHIMP_CLIENT_SECRET || "";
    const res = await fetch("https://login.mailchimp.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(
        (json.error_description as string) ||
          (json.error as string) ||
          `Mailchimp token exchange failed (${res.status})`,
      );
    }
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("Mailchimp: no access_token");

    // `dc` (es. "us21") e `api_url`: obbligatori, e insieme sono l'unico modo di
    // sapere a quale datacenter appartiene l'account.
    const dc = typeof json.dc === "string" ? json.dc : null;
    const apiUrl = typeof json.api_url === "string" ? json.api_url : null;
    if (!dc && !apiUrl) {
      throw new Error("Mailchimp: la risposta non contiene dc/api_url, data center sconosciuto");
    }

    const expiresIn = json.expires_in as number | undefined; // 3600 (1h)
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    return {
      accessToken,
      refreshToken: (json.refresh_token as string | undefined) ?? null,
      expiresAt,
      scope: null,
      externalAccountId: null,
      metadata: {
        dc,
        api_url: apiUrl,
        // Username Basic: qualsiasi stringa non vuota, convenzione Mailchimp.
        basic_username: "anystring",
      },
      raw: { ...json, access_token: undefined, refresh_token: undefined },
    };
  },

  /**
   * Il refresh va sull'host del datacenter: senza il `dc` salvato in metadata non
   * c'è un endpoint noto a cui scrivere, quindi l'assenza del dc è un errore
   * esplicito e non un fallback silenzioso a un host generico.
   */
  async refreshToken({ refreshToken, metadata }) {
    const clientId = process.env.MAILCHIMP_CLIENT_ID || "";
    const clientSecret = process.env.MAILCHIMP_CLIENT_SECRET || "";

    const dc =
      typeof metadata?.dc === "string" && metadata.dc
        ? metadata.dc
        : dcFromApiUrl(typeof metadata?.api_url === "string" ? metadata.api_url : "");
    if (!dc) {
      throw new Error("Mailchimp refresh: data center sconosciuto, riconnetti l'account");
    }

    const res = await fetch(`https://${dc}.api.mailchimp.com/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(
        (json.error_description as string) ||
          (json.error as string) ||
          `Mailchimp refresh failed (${res.status})`,
      );
    }
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("Mailchimp refresh: no access_token");
    const expiresIn = json.expires_in as number | undefined;
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    // Mailchimp restituisce un refresh token nuovo a ogni rinnovo: va salvato.
    // Se manca, si conserva il precedente, altrimenti la riga si troverebbe senza
    // rinnovo al successivo.
    const newRefresh = (json.refresh_token as string | undefined) ?? refreshToken;
    return {
      accessToken,
      refreshToken: newRefresh,
      expiresAt,
      scope: null,
      raw: { ...json, access_token: undefined, refresh_token: undefined },
    };
  },
};

/** "https://us21.api.mailchimp.com/3.0" → "us21". Usato solo come fallback. */
function dcFromApiUrl(apiUrl: string): string | null {
  if (!apiUrl) return null;
  const m = /^https:\/\/([a-z0-9-]+)\.api\.mailchimp\.com\//i.exec(apiUrl);
  return m ? m[1] : null;
}