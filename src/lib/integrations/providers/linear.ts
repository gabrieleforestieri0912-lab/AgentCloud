import type { IntegrationProvider } from "../types";

/**
 * Linear OAuth (per-workspace).
 * Env: LINEAR_CLIENT_ID, LINEAR_CLIENT_SECRET.
 * Optional: LINEAR_SCOPES (default "read write").
 * Docs: https://linear.app/developers/oauth-2
 */
const DEFAULT_SCOPES = ["read", "write"];

export const linearProvider: IntegrationProvider = {
  provider: "linear",
  getAuthUrl({ state, redirectUri }) {
    const clientId = process.env.LINEAR_CLIENT_ID || "";
    if (!clientId) {
      throw new Error("Linear non configurato (LINEAR_CLIENT_ID mancante nel file .env — crea un'app su linear.app/settings/api)");
    }
    const scopes = (process.env.LINEAR_SCOPES || DEFAULT_SCOPES.join(" ")).split(/[\s,]+/).filter(Boolean).join(" ");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes,
      state,
    });
    return `https://linear.app/oauth/authorize?${params.toString()}`;
  },
  async exchangeCode({ code, redirectUri }) {
    const clientId = process.env.LINEAR_CLIENT_ID || "";
    const clientSecret = process.env.LINEAR_CLIENT_SECRET || "";
    const res = await fetch("https://api.linear.app/oauth/token", {
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
      throw new Error((json.error_description as string) || (json.error as string) || `Linear token exchange failed (${res.status})`);
    }
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("Linear: no access_token");
    const scope = (json.scope as string | undefined) ?? DEFAULT_SCOPES.join(" ");
    return {
      accessToken,
      refreshToken: null,
      expiresAt: null,
      scope,
      externalAccountId: null,
      metadata: { scope },
      raw: json,
    };
  },
};
