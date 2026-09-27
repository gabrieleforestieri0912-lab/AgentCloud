import type { IntegrationProvider } from "../types";

/**
 * Asana OAuth (per-user).
 * Env: ASANA_CLIENT_ID, ASANA_CLIENT_SECRET.
 * Default scope: default (Asana grants default workspace scopes automatically).
 */
export const asanaProvider: IntegrationProvider = {
  provider: "asana",
  getAuthUrl({ state, redirectUri }) {
    const clientId = process.env.ASANA_CLIENT_ID || "";
    if (!clientId) {
      throw new Error("Asana non configurato (ASANA_CLIENT_ID mancante nel file .env — crea un'app su app.asana.com/0/developer-console)");
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    });
    const scopes = process.env.ASANA_SCOPES?.trim();
    if (scopes) params.set("scope", scopes);
    return `https://app.asana.com/-/oauth_authorize?${params.toString()}`;
  },
  async exchangeCode({ code, redirectUri }) {
    const clientId = process.env.ASANA_CLIENT_ID || "";
    const clientSecret = process.env.ASANA_CLIENT_SECRET || "";
    const res = await fetch("https://app.asana.com/-/oauth_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }).toString(),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error((json.error_description as string) || (json.message as string) || (json.error as string) || `Asana token exchange failed (${res.status})`);
    }
    const accessToken = (json.access_token as string | undefined) ?? (json.token as string | undefined);
    if (!accessToken) throw new Error("Asana: no access_token");
    const refreshToken = (json.refresh_token as string | undefined) ?? null;
    const expiresIn = json.expires_in as number | undefined;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    const data = json.data as { id?: string; name?: string; email?: string } | undefined;
    return {
      accessToken,
      refreshToken,
      expiresAt,
      scope: null,
      externalAccountId: data?.id ?? (data?.email as string | undefined) ?? null,
      metadata: { asana_user: data },
      raw: json,
    };
  },
  async refreshToken({ refreshToken }) {
    const clientId = process.env.ASANA_CLIENT_ID || "";
    const clientSecret = process.env.ASANA_CLIENT_SECRET || "";
    const res = await fetch("https://app.asana.com/-/oauth_token", {
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
    if (!res.ok) throw new Error((json.error_description as string) || "Asana refresh failed");
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("Asana refresh: no access_token");
    const expiresIn = json.expires_in as number | undefined;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    return {
      accessToken,
      refreshToken: (json.refresh_token as string | undefined) ?? refreshToken,
      expiresAt,
      raw: json,
    };
  },
};
