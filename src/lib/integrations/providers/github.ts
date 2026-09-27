import type { IntegrationProvider } from "../types";

/**
 * GitHub OAuth (per-user, repo/user scopes).
 * Env: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET.
 * Optional: GITHUB_SCOPES (default "repo read:user user:email").
 */
const DEFAULT_SCOPES = ["repo", "read:user", "user:email"];

export const githubProvider: IntegrationProvider = {
  provider: "github",
  getAuthUrl({ state, redirectUri }) {
    const clientId = process.env.GITHUB_CLIENT_ID || "";
    if (!clientId) {
      throw new Error("GitHub non configurato (GITHUB_CLIENT_ID mancante nel file .env — crea un OAuth App su github.com/settings/developers)");
    }
    const scopes = (process.env.GITHUB_SCOPES || DEFAULT_SCOPES.join(" ")).split(/[\s,]+/).filter(Boolean).join(" ");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state,
      allow_signup: "true",
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  },
  async exchangeCode({ code, redirectUri }) {
    const clientId = process.env.GITHUB_CLIENT_ID || "";
    const clientSecret = process.env.GITHUB_CLIENT_SECRET || "";
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || (json.error as string)) {
      throw new Error((json.error_description as string) || (json.error as string) || `GitHub token exchange failed (${res.status})`);
    }
    const accessToken = json.access_token as string | undefined;
    if (!accessToken) throw new Error("GitHub: no access_token");
    const scope = (json.scope as string | undefined) ?? DEFAULT_SCOPES.join(" ");

    // Fetch user for label (best-effort)
    let login: string | null = null;
    let userId: string | null = null;
    try {
      const uRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
      });
      if (uRes.ok) {
        const u = (await uRes.json()) as { login?: string; id?: number };
        login = u.login ?? null;
        userId = u.id ? String(u.id) : null;
      }
    } catch {
      // ignore
    }

    return {
      accessToken,
      refreshToken: null,
      expiresAt: null,
      scope,
      externalAccountId: login || userId,
      metadata: { login, github_user_id: userId, scope },
      raw: json,
    };
  },
};
