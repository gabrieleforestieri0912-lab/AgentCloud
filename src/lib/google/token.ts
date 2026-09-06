import { getGoogleConnection, updateGoogleTokens } from "./connections";

/**
 * Risolve un access token Google valido (non scaduto) per un utente.
 *
 * Come funziona: legge la connessione cifrata dell'utente da
 * `google_connections`, rinfresca l'access token tramite l'endpoint token di
 * Google quando è scaduto o vicino alla scadenza (margine di 5 minuti), e
 * salva il nuovo token/scadenza. È l'helper interno usato dal proxy API e
 * dai tool degli agenti — mai esposto direttamente al client.
 */

const REFRESH_MARGIN_MS = 5 * 60 * 1000; // rinfresca 5 minuti prima della scadenza

/** True se un token con questa scadenza va rinfrescato ora. */
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
      // Refresh fallito (token revocato, rete, config errata) — ripiega
      // sull'access token salvato solo se non è ancora scaduto.
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
    // La nuova scadenza si calcola sull'orologio corrente: se il token precedente
    // era ancora valido, lo si estende semplicemente da adesso (Google emette token di ~1h).
    return {
      accessToken: json.access_token,
      expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    };
  } catch {
    return null;
  }
}