import type { IntegrationProvider } from "../types";

/**
 * ClickUp OAuth (per-workspace) — sostituisce Linear, il cui OAuth richiede un
 * piano Business/Enterprise. ClickUp è gratuito (anche il piano Free) e l'app
 * OAuth si crea da ClickUp → avatar → Settings → Apps → Create new app.
 *
 * Env: CLICKUP_CLIENT_ID, CLICKUP_CLIENT_SECRET.
 * Docs: https://developer.clickup.com/docs/authentication
 *
 * Note API ClickUp:
 * - authorize: https://app.clickup.com/api?client_id&redirect_uri&state (no scope, no PKCE)
 * - token: POST https://api.clickup.com/api/v2/oauth/token (client_id/client_secret/code)
 * - l'access token non scade e non viene emesso alcun refresh token.
 */
export const clickupProvider: IntegrationProvider = {
  provider: "clickup",
  getAuthUrl({ state, redirectUri }) {
    const clientId = process.env.CLICKUP_CLIENT_ID || "";
    if (!clientId) {
      throw new Error(
        "ClickUp non configurato (CLICKUP_CLIENT_ID mancante nel file .env — crea un'app gratis su ClickUp → Settings → Apps → Create new app)",
      );
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });
    return `https://app.clickup.com/api?${params.toString()}`;
  },
  async exchangeCode({ code }) {
    const clientId = process.env.CLICKUP_CLIENT_ID || "";
    const clientSecret = process.env.CLICKUP_CLIENT_SECRET || "";
    if (!clientId || !clientSecret) {
      throw new Error(
        "ClickUp non configurato (CLICKUP_CLIENT_ID / CLICKUP_CLIENT_SECRET mancanti nel file .env)",
      );
    }
    const qs = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code });
    const res = await fetch(`https://api.clickup.com/api/v2/oauth/token?${qs.toString()}`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(
        (json.err as string) ||
          (json.error as string) ||
          `ClickUp token exchange failed (${res.status})`,
      );
    }
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("ClickUp: no access_token");

    // Etichetta leggibile per la dashboard: primo workspace autorizzato.
    // Best-effort — se fallisce la connessione resta valida.
    let workspaceName: string | null = null;
    let teamId: string | null = null;
    try {
      const teamsRes = await fetch("https://api.clickup.com/api/v2/team", {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      });
      if (teamsRes.ok) {
        const teamsJson = (await teamsRes.json()) as {
          teams?: Array<{ id?: string; name?: string }>;
        };
        const first = teamsJson.teams?.[0];
        workspaceName = first?.name ?? null;
        teamId = first?.id ?? null;
      }
    } catch {
      // ignore
    }

    return {
      accessToken,
      refreshToken: null,
      expiresAt: null,
      scope: null,
      externalAccountId: teamId,
      metadata: workspaceName ? { workspace_name: workspaceName, team_id: teamId } : {},
      raw: json,
    };
  },
};
