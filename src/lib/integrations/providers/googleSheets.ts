import type { IntegrationProvider } from "../types";

/**
 * Google Sheets — reuses existing Google Cloud OAuth client (Phase 0).
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (same as Gmail/Calendar).
 * No new client; just adds spreadsheets scope to consent. Redirect is
 * https://<domain>/api/integrations/google_sheets/callback (dedicated
 * callback for the integrations layer, separate from /api/auth/google/callback).
 * Mirrors src/lib/google/oauth.ts buildGoogleConsentUrl but scoped to sheets.
 */
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export const googleSheetsProvider: IntegrationProvider = {
  provider: "google_sheets",
  getAuthUrl({ state, redirectUri }) {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    // Allow override via GOOGLE_SHEETS_SCOPES, else single sheets scope (reuse still needs consent)
    const scopes = (process.env.GOOGLE_SHEETS_SCOPES || SHEETS_SCOPE).split(/[,\s]+/).filter(Boolean).join(" ");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },
  async exchangeCode({ code, redirectUri }) {
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
      throw new Error((json.error_description as string) || (json.error as string) || `Google Sheets token exchange failed (${res.status})`);
    }
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("Google Sheets: no access_token");
    const refreshToken = (json.refresh_token as string | undefined) ?? null;
    const expiresIn = json.expires_in as number | undefined;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    const scope = (json.scope as string | undefined) ?? SHEETS_SCOPE;
    return {
      accessToken,
      refreshToken,
      expiresAt,
      scope,
      externalAccountId: null,
      metadata: { token_type: json.token_type, scope },
      raw: json,
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
    if (!res.ok) throw new Error((json.error_description as string) || "Google refresh failed");
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("Google refresh: no access_token");
    const expiresIn = json.expires_in as number | undefined;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    return {
      accessToken,
      refreshToken,
      expiresAt,
      scope: json.scope as string | undefined,
      raw: json,
    };
  },
};
