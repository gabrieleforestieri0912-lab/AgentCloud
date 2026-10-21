/**
 * Gestore dei token condiviso da tutte le integrazioni.
 *
 * Regole:
 *   - i token viaggiano CIFRATI (AES-256-GCM) e non escono mai dal server;
 *   - si rinnovano PRIMA della scadenza, non quando il provider risponde 401;
 *   - se il provider ha revocato il token, la connessione passa a
 *     `reconnect_required` e l'agente lo dice all'utente invece di fare
 *     crash;
 *   - la disconnessione revoca (se possibile) e CANCELLA la riga: nessun
 *     segreto resta nel DB.
 *
 * Le funzioni pure (`isExpired`, `shouldRefresh`, `expiresAtFrom`) sono
 * separate dal codice che parla col DB, così sono testabili da sole.
 */

import { logAudit } from "@/lib/audit";

import {
  discoverMcpAuth,
  fromStoredRegistration,
  refreshMcpTokens,
  revokeMcpTokens,
  type StoredClientRegistration,
} from "./oauth";
import {
  decryptMcpSecrets,
  deleteMcpConnection,
  getMcpConnection,
  setMcpConnectionStatus,
  upsertMcpConnection,
  type McpConnectionRow,
} from "./store";

/** Anticipo con cui si rinnova il token: 60 secondi prima della scadenza. */
export const REFRESH_SKEW_MS = 60_000;

/**
 * Il token è scaduto? `expiresAt` null significa "non scade" (GitHub, Notion
 * e molti altri emettono token senza scadenza).
 */
export function isExpired(expiresAt: number | null | undefined, now = Date.now()): boolean {
  if (!expiresAt) return false;
  return expiresAt <= now;
}

/** Il token va rinnovato adesso? */
export function shouldRefresh(
  expiresAt: number | null | undefined,
  now = Date.now(),
  skew = REFRESH_SKEW_MS,
): boolean {
  if (!expiresAt) return false;
  return expiresAt - skew <= now;
}

/** Scadenza in epoch ms a partire da `expires_in` in secondi. */
export function expiresAtFrom(expiresInSeconds: number | null | undefined, now = Date.now()): number | null {
  if (typeof expiresInSeconds !== "number" || !Number.isFinite(expiresInSeconds)) return null;
  return now + expiresInSeconds * 1000;
}

/**
 * Copertura per i log: mostra solo gli ultimi 4 caratteri.
 * I token NON devono mai finire in un log: questo helper esiste perché il
 * chiamante non debba inventarsi l'occasione di stamparlo per intero.
 */
export function redactSecret(value: string | null | undefined): string {
  if (!value) return "[none]";
  if (value.length <= 4) return "****";
  return `****${value.slice(-4)}`;
}

export type ResolvedToken =
  | { ok: true; accessToken: string; refreshed: boolean }
  | { ok: false; error: string; code: "not_connected" | "reconnect_required" | "no_token" | "refresh_failed" };

/**
 * Restituisce un access token valido per la connessione, rinnovandolo se
 * necessario. Non lancia mai: gli errori tornano come dati, perché il
 * chiamante è il loop dei tool e un'eccezione qui ucciderebbe la run.
 */
export async function resolveAccessToken(
  tenantId: string,
  serverId: string,
  opts: { force?: boolean } = {},
): Promise<ResolvedToken> {
  if (!tenantId) return { ok: false, error: "Not connected", code: "not_connected" };

  const row = await getMcpConnection(tenantId, serverId);
  if (!row) return { ok: false, error: "Not connected", code: "not_connected" };
  if (row.status === "disconnected") {
    return { ok: false, error: "Not connected", code: "not_connected" };
  }

  const secrets = decryptMcpSecrets(row);

  // API key: non scade, non si rinnova.
  if (secrets.apiKey) {
    return { ok: true, accessToken: secrets.apiKey, refreshed: false };
  }

  if (!secrets.accessToken) {
    return {
      ok: false,
      error: "This connection has no credentials. Please reconnect the app.",
      code: row.status === "reconnect_required" ? "reconnect_required" : "no_token",
    };
  }

  const expiresAt = row.expires_at ? Date.parse(row.expires_at) : null;
  const needsRefresh = opts.force || shouldRefresh(expiresAt);

  if (!needsRefresh) {
    return { ok: true, accessToken: secrets.accessToken, refreshed: false };
  }

  if (!secrets.refreshToken) {
    // Scaduto e non rinnovabile: il provider va riautorizzato. Non è un
    // errore "da nascondere": l'utente deve sapere che deve ricollegare l'app.
    await setMcpConnectionStatus(tenantId, serverId, "reconnect_required").catch(() => {});
    return {
      ok: false,
      error: "The authorization has expired. Please reconnect the app to continue.",
      code: "reconnect_required",
    };
  }

  const refreshed = await performRefresh(tenantId, serverId, row, secrets.refreshToken);
  if (!refreshed.ok) {
    await setMcpConnectionStatus(tenantId, serverId, "reconnect_required").catch(() => {});
    return {
      ok: false,
      error: "Could not renew the authorization. Please reconnect the app.",
      code: "refresh_failed",
    };
  }
  return { ok: true, accessToken: refreshed.accessToken, refreshed: true };
}

/** Esegue il refresh e salva i nuovi token. */
async function performRefresh(
  tenantId: string,
  serverId: string,
  row: McpConnectionRow,
  refreshToken: string,
): Promise<{ ok: true; accessToken: string } | { ok: false; error: string }> {
  const serverUrl = row.url;
  if (!serverUrl) return { ok: false, error: "Missing server URL" };

  try {
    const discovery = await discoverMcpAuth(serverUrl);
    const registration = row.metadata?.client_registration as StoredClientRegistration | undefined;
    const clientInformation = registration
      ? fromStoredRegistration(registration)
      : { client_id: row.client_id ?? "" };
    if (!clientInformation.client_id) {
      return { ok: false, error: "Missing client registration" };
    }

    const tokens = await refreshMcpTokens({
      discovery,
      clientInformation,
      refreshToken,
      serverUrl,
    });

    await upsertMcpConnection({
      tenantId,
      serverId,
      status: "connected",
      accessToken: tokens.accessToken,
      // Se il provider non rimanda un refresh token, si tiene quello vecchio.
      refreshToken: tokens.refreshToken ?? refreshToken,
      expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt).toISOString() : null,
      scope: tokens.scope ?? row.scope,
    });

    logAudit("mcp_token_refresh", {
      tenantId,
      serverId,
      accessToken: redactSecret(tokens.accessToken),
    });
    return { ok: true, accessToken: tokens.accessToken };
  } catch (e) {
    logAudit("mcp_token_refresh_failed", {
      tenantId,
      serverId,
      error: e instanceof Error ? e.message : "unknown",
    });
    return { ok: false, error: "refresh failed" };
  }
}

/**
 * Revoca e cancella la connessione.
 * Chiamata dalla disconnessione: nessun segreto deve sopravvivere.
 */
export async function revokeAndDelete(
  tenantId: string,
  serverId: string,
): Promise<void> {
  const row = await getMcpConnection(tenantId, serverId);
  if (row) {
    const secrets = decryptMcpSecrets(row);
    const registration = row.metadata?.client_registration as StoredClientRegistration | undefined;
    if (row.url && registration && secrets.accessToken) {
      try {
        const discovery = await discoverMcpAuth(row.url);
        await revokeMcpTokens({
          discovery,
          clientInformation: fromStoredRegistration(registration),
          token: secrets.accessToken,
        });
      } catch {
        // La revoca è un tentativo: se il provider è irraggiungibile la
        // connessione viene comunque cancellata da qui sotto.
      }
    }
    await setMcpConnectionStatus(tenantId, serverId, "disconnected").catch(() => {});
  }
  await deleteMcpConnection(tenantId, serverId);
  logAudit("mcp_disconnect", { tenantId, serverId });
}
