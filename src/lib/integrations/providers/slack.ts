import type { IntegrationProvider } from "../types";

/**
 * Slack bot OAuth (per-workspace).
 * Env: SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_SIGNING_SECRET (for webhooks, not OAuth).
 * Default scopes: chat:write, channels:read (minimal, per spec fallback). user_scope left empty.
 * Bot tokens (xoxb-...) typically don't expire.
 */
const DEFAULT_BOT_SCOPES = ["chat:write", "channels:read"];

export const slackProvider: IntegrationProvider = {
  provider: "slack",
  getAuthUrl({ state, redirectUri }) {
    const clientId = process.env.SLACK_CLIENT_ID || "";
    const scopes = process.env.SLACK_BOT_SCOPES || DEFAULT_BOT_SCOPES.join(",");
    const params = new URLSearchParams({
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state,
    });
    // user_scope left empty by default (needs confirmation if ever needed)
    const userScopes = process.env.SLACK_USER_SCOPES?.trim();
    if (userScopes) params.set("user_scope", userScopes);
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  },
  async exchangeCode({ code, redirectUri }) {
    const clientId = process.env.SLACK_CLIENT_ID || "";
    const clientSecret = process.env.SLACK_CLIENT_SECRET || "";
    const res = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!json.ok) {
      throw new Error((json.error as string) || "Slack oauth.v2.access failed");
    }
    // slack response: { access_token (bot), token_type, scope, bot_user_id, team:{id,name}, authed_user, ... }
    const accessToken = (json.access_token as string | undefined) ?? (json as unknown as { token?: string }).token;
    if (!accessToken) throw new Error("Slack: no access_token");
    const scope = (json.scope as string | undefined) ?? DEFAULT_BOT_SCOPES.join(",");
    const team = json.team as { id?: string; name?: string } | undefined;
    return {
      accessToken,
      refreshToken: null,
      expiresAt: null,
      scope,
      externalAccountId: team?.id ?? null,
      metadata: { team, bot_user_id: json.bot_user_id, scope, authed_user: json.authed_user },
      raw: json,
    };
  },
};
