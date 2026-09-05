import { getGoogleConnection, updateGoogleTokens } from "./connections";

/**
 * Phase 3 — resolve a valid (non-expired) Google access token for a user.
 *
 * Reads the user's encrypted connection from `google_connections`, refreshes
 * the access token via Google's token endpoint when it is expired or within
 * the refresh margin (5 minutes), and persists the new token/expiry. Internal
 * helper used by the API proxy and the agent tools — never exposed to the
 * client directly.
 */

const REFRESH_MARGIN_MS = 5 * 60 * 1000; // refresh 5 minutes before expiry

/** True when a token with this expiry should be refreshed now. */
export function shouldRefreshToken(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return true;
  return expiry - Date.now() <= REFRESH_MARGIN_MS;
}

export type ResolvedGoogleToken = {
  accessToken: string;
  googleEmail: string | null;
  scopes: string[];
};

/**
 * Get a fresh access token for a user. Returns null when the user has no
 * Google connection (or it cannot be decrypted / refreshed).
 */
export async function getValidGoogleAccessToken(
  userId: string,
): Promise<ResolvedGoogleToken | null> {
  if (!userId || userId === "anonymous") return null;

  const conn = await getGoogleConnection(userId);
  if (!conn) return null;

  let accessToken = conn.accessToken;

  if (shouldRefreshToken(conn.expiresAt)) {
    const refreshed = await refreshGoogleAccessToken(
      conn.refreshToken,
      conn.expiresAt,
    );
    if (!refreshed) {
      // Refresh failed (revoked token, network, misconfig) — only fall back to
      // the stored access token if it hasn't expired yet.
      if (shouldRefreshToken(conn.expiresAt)) {
        return null;
      }
      return {
        accessToken,
        googleEmail: conn.googleEmail,
        scopes: conn.scopes,
      };
    }
    accessToken = refreshed.accessToken;
    await updateGoogleTokens(userId, refreshed.accessToken, refreshed.expiresAt);
  }

  return {
    accessToken,
    googleEmail: conn.googleEmail,
    scopes: conn.scopes,
  };
}

/** Refresh an access token with Google's token endpoint. */
export async function refreshGoogleAccessToken(
  refreshToken: string,
  currentExpiresAt: string | null,
): Promise<{ accessToken: string; expiresAt: string } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!json.access_token) return null;
    const expiresInMs = (json.expires_in || 3600) * 1000;
    // Base the new expiry on the current wall time; if the previous token was
    // still valid we simply extend from now (Google issues ~1h tokens).
    return {
      accessToken: json.access_token,
      expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    };
  } catch {
    return null;
  }
}