import type { IntegrationProvider, TokenExchangeResult } from "../types";

/**
 * Google Drive — riusa l'OAuth client Google già presente per Gmail/Calendar/Sheets.
 *
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (gli stessi di google_sheets).
 * Redirect: /api/integrations/google_drive/callback — va registrato tra gli
 * Authorized redirect URI dello STESSO OAuth client, accanto a quello di
 * google_sheets. Non è un client nuovo.
 *
 * Scopi (cfr. PROVIDER_CATALOG): drive.file + drive.readonly.
 *   drive.file       → solo i file creati dall'app (scope "file"), minimo.
 *   drive.readonly   → lettura dei file già dell'utente.
 * Insieme coprono il caso d'uso richiesto. Lo scope `drive` completo chiede
 * accesso a TUTTO il Drive ed è quello che Google sottopone a verifica manuale
 * per le app non verificate: con `drive.file` l'app resta in categoria non
 * sensibile e si evita il blocco allo screening.
 *
 * Accesso offline: `access_type=offline` serve a ottenere il refresh_token.
 * `prompt=consent` è necessario solo per la prima autorizzazione (Google non
 * restituisce il refresh_token a un utente che ha già concesso gli scope), ma
 * forzarlo a ogni connessione mostrebbebbe una schermata di consenso a chi sta
 * solo rinnovando. Trade-off: si forza, così il refresh token c'è sempre; il
 * tenant che riconnette accetta un click in più.
 */
const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
];

function scopes(): string {
  return (process.env.GOOGLE_DRIVE_SCOPES || DRIVE_SCOPES.join(" "))
    .split(/[,\s]+/)
    .filter(Boolean)
    .join(" ");
}

/**
 * Email dell'account Google collegato. Serve solo per l'etichetta nella UI
 * (quale account Drive è collegato): un errore qui non deve far fallire la
 * connessione, quindi il fallimento viene ignorato come in googleSheets.ts.
 */
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

/**
 * Quota di spazio: serve per dire all'utente quanto è pieno il Drive in una
 * frase sola. Best-effort, `about.get` non è sempre disponibile con
 * drive.readonly su tutti gli account.
 */
async function bestEffortStorage(accessToken: string): Promise<{ used?: number; limit?: number }> {
  try {
    const res = await fetch(
      "https://www.googleapis.com/drive/v3/about?fields=storageQuota",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return {};
    const json = (await res.json()) as {
      storageQuota?: { limit?: string; usage?: string };
    };
    const q = json.storageQuota;
    return {
      limit: q?.limit ? Number(q.limit) : undefined,
      used: q?.usage ? Number(q.usage) : undefined,
    };
  } catch {
    return {};
  }
}

export const googleDriveProvider: IntegrationProvider = {
  provider: "google_drive",

  getAuthUrl({ state, redirectUri }) {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    if (!clientId) {
      throw new Error("Google Drive non configurato (GOOGLE_CLIENT_ID mancante nel file .env)");
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
          `Google Drive token exchange failed (${res.status})`,
      );
    }
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("Google Drive: no access_token");

    const refreshToken = (json.refresh_token as string | undefined) ?? null;
    const expiresIn = json.expires_in as number | undefined;
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const [email, storage] = await Promise.all([
      bestEffortEmail(accessToken),
      bestEffortStorage(accessToken),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresAt,
      scope: (json.scope as string | undefined) ?? scopes(),
      externalAccountId: email,
      metadata: {
        token_type: json.token_type,
        google_email: email,
        storage_limit: storage.limit ?? null,
        storage_used: storage.used ?? null,
      },
      // `raw` non viene mai persistito né loggato (vedi store.ts), ma non
      // serve tenere in memoria il token in chiaro: il giorno in cui qualcuno
      // stringify questo oggetto in un log, la connessione è bruciata.
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
        (json.error_description as string) || `Google Drive refresh failed (${res.status})`,
      );
    }
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("Google Drive refresh: no access_token");
    const expiresIn = json.expires_in as number | undefined;
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;
    return {
      accessToken,
      // Google non emette nuovi refresh token: va conservato quello già salvato,
      // altrimenti la riga resterebbe senza refresh e il prossimo rinnovo fallirebbe.
      refreshToken,
      expiresAt,
      scope: (json.scope as string | undefined) ?? scopes(),
      raw: { ...json, access_token: undefined, refresh_token: undefined },
    };
  },

  /**
   * Revoca: `POST /oauth2/v1/revoke?token=...` (OAuth 2.0 token revocation, RFC 7009).
   * Google risponde 200 anche per token già scaduti, quindi non c'è molto da
   * distinguere: l'esito non viene trattato come bloccante perché la riga viene
   * comunque cancellata dal route disconnect.
   */
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