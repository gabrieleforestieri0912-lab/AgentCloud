import type { IntegrationProvider } from "../types";

/**
 * HubSpot OAuth (developer app, per-portal).
 * Env: HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET.
 * Default scopes: crm.objects.contacts.read, crm.objects.contacts.write (minimal, per spec).
 */
const DEFAULT_SCOPES = ["crm.objects.contacts.read", "crm.objects.contacts.write"];

export const hubspotProvider: IntegrationProvider = {
  provider: "hubspot",
  getAuthUrl({ state, redirectUri }) {
    const clientId = process.env.HUBSPOT_CLIENT_ID || "";
    const scopes = process.env.HUBSPOT_SCOPES || DEFAULT_SCOPES.join(" ");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state,
    });
    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
  },
  async exchangeCode({ code, redirectUri }) {
    const clientId = process.env.HUBSPOT_CLIENT_ID || "";
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET || "";
    const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
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
      throw new Error((json.message as string) || (json.error as string) || `HubSpot token exchange failed (${res.status})`);
    }
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("HubSpot: no access_token");
    const refreshToken = (json.refresh_token as string | undefined) ?? null;
    const expiresIn = json.expires_in as number | undefined; // typically 21600 (6h)
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    const hubId = (json.hub_id as number | string | undefined)?.toString() ?? null;
    const hubDomain = (json.hub_domain as string | undefined) ?? null;
    return {
      accessToken,
      refreshToken,
      expiresAt,
      scope: (json.scope as string | undefined) ?? DEFAULT_SCOPES.join(" "),
      externalAccountId: hubId,
      metadata: { hub_id: hubId, hub_domain: hubDomain, user: json.user, token_type: json.token_type },
      raw: json,
    };
  },
  async refreshToken({ refreshToken }) {
    const clientId = process.env.HUBSPOT_CLIENT_ID || "";
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET || "";
    const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
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
    if (!res.ok) throw new Error((json.message as string) || "HubSpot refresh failed");
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("HubSpot refresh: no access_token");
    const expiresIn = json.expires_in as number | undefined;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    return {
      accessToken,
      refreshToken: (json.refresh_token as string | undefined) ?? refreshToken,
      expiresAt,
      scope: json.scope as string | undefined,
      externalAccountId: (json.hub_id as string | undefined) ?? null,
      raw: json,
    };
  },
};
