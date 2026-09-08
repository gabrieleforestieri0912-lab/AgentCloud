import type { IntegrationProvider } from "../types";

/**
 * Notion public integration (per-workspace OAuth).
 * Env: NOTION_OAUTH_CLIENT_ID (3d5d...), NOTION_OAUTH_CLIENT_SECRET (secret_...).
 * Capabilities (read/insert/update) are pre-configured in notion.so/my-integrations;
 * no scope param in authorize URL. Tokens don't expire.
 */
export const notionProvider: IntegrationProvider = {
  provider: "notion",
  getAuthUrl({ state, redirectUri }) {
    const clientId = process.env.NOTION_OAUTH_CLIENT_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      owner: "user",
      redirect_uri: redirectUri,
      state,
    });
    return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  },
  async exchangeCode({ code, redirectUri }) {
    const clientId = process.env.NOTION_OAUTH_CLIENT_ID || "";
    const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET || "";
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error((json.error_description as string) || (json.error as string) || `Notion token exchange failed (${res.status})`);
    }
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("Notion: no access_token");
    const workspaceId = (json.workspace_id as string | undefined) ?? null;
    const workspaceName = (json.workspace_name as string | undefined) ?? null;
    const botId = (json.bot_id as string | undefined) ?? null;
    const owner = json.owner as Record<string, unknown> | undefined;
    return {
      accessToken,
      refreshToken: null,
      expiresAt: null,
      scope: null,
      externalAccountId: workspaceId,
      metadata: { workspace_id: workspaceId, workspace_name: workspaceName, bot_id: botId, owner },
      raw: json,
    };
  },
};
