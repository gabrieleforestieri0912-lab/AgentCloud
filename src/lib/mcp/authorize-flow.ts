/**
 * Flusso OAuth2 per le integrazioni esterne.
 *
 * Due percorsi, una sola garanzia: il codice che torna dal provider viene
 * scambiato solo se lo `state` torna IDENTICO a quello che abbiamo generato
 * e salvato lato server. Senza questo controllo un attaccante potrebbe
 * far scambiare al nostro account un codice autorizzato da un altro
 * (login CSRF).
 *
 *   - `mcp`   → discovery RFC 9728/8414 + registrazione dinamica (RFC 7591)
 *               + Authorization Code con PKCE S256.
 *   - `native`→ riusa l'adapter OAuth già presente nel repository
 *               (`src/lib/integrations/providers/`).
 *
 * In entrambi i casi:
 *   - lo `state` è firmato (HMAC) e contiene utente + server + nonce;
 *   - il `code_verifier` del PKCE resta sul server (mai nella URL);
 *   - i token vengono cifrati prima di finire nel DB;
 *   - il redirect URI è fisso e uguale in `authorize` e `callback`.
 */

import crypto from "crypto";

import { logAudit } from "@/lib/audit";

import { getProvider } from "../integrations/registry";
import { buildState, verifyState } from "../integrations/state";
import {
  buildMcpAuthorizeUrl,
  discoverMcpAuth,
  exchangeMcpCode,
  registerMcpClient,
  type StoredClientRegistration,
} from "./oauth";
import { getMcpEntry } from "./registry";
import { getMcpConnection, upsertMcpConnection } from "./store";
import type { McpResolved } from "./target";

/** Cookie con lo `state` firmato (httpOnly, come gli altri flussi OAuth). */
export const MCP_STATE_COOKIE = "ac_mcp_state";
export const MCP_STATE_MAX_AGE = 60 * 10;

/** URL di callback: fisso, uguale in `authorize` e in `callback`. */
export function mcpCallbackUrl(reqUrl: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL;
  if (base) {
    try {
      const u = new URL(base);
      return `${u.origin}/api/mcp/callback`;
    } catch {
      // env malformato: si usa l'origine della richiesta.
    }
  }
  return `${new URL(reqUrl).origin}/api/mcp/callback`;
}

/** Dove l'utente torna dopo la connessione (l'app "Connetti app"). */
export const MCP_RETURN_PATH = "/dashboard/apps";

/**
 * Avvia l'autorizzazione.
 * Restituisce l'URL a cui rimandare il browser, oppure un errore.
 */
export async function startMcpAuthorization(
  tenantId: string,
  resolved: McpResolved,
  reqUrl: string,
): Promise<
  { ok: true; authorizationUrl: string; state: string } | { ok: false; error: string }
> {
  const redirectUri = mcpCallbackUrl(reqUrl);
  const { state } = buildState(tenantId, resolved.serverId);

  // --- Connettore nativo: riusa l'adapter OAuth del repository -----------
  if (resolved.native) {
    const adapter = getProvider(resolved.native.provider);
    if (!adapter) {
      return { ok: false, error: `The ${resolved.name} connector is not configured.` };
    }
    let authorizationUrl: string;
    try {
      authorizationUrl = adapter.getAuthUrl({ state, redirectUri });
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : `Could not start the ${resolved.name} connection.`,
      };
    }
    await upsertMcpConnection({
      tenantId,
      serverId: resolved.serverId,
      status: "pending",
      transport: resolved.transport,
      url: resolved.url,
      scope: resolved.scopes.join(" ") || null,
      metadata: { oauth: { kind: "native", state, provider: resolved.native.provider } },
    });
    return { ok: true, authorizationUrl, state };
  }

  // --- Server MCP con OAuth2 ---------------------------------------------
  if (resolved.auth === "oauth2") {
    if (!resolved.url) {
      return { ok: false, error: `The ${resolved.name} server has no URL.` };
    }
    // Il server dichiara un client OAuth statico ma la variabile d'ambiente
    // non è configurata: meglio dirlo che provare la registrazione dinamica
    // e ricevere un errore incomprensibile dal provider.
    if (resolved.entry?.staticClient && !resolved.staticClient) {
      return {
        ok: false,
        error: `${resolved.name} is not configured on this deployment (missing ${resolved.entry.staticClient.clientIdEnv}).`,
      };
    }
    try {
      const discovery = await discoverMcpAuth(resolved.url);
      const registration = await registerMcpClient(discovery, {
        redirectUri,
        scope: resolved.scopes.join(" ") || undefined,
        staticClient: resolved.staticClient,
      });
      const storedRegistration: StoredClientRegistration = {
        client_id: registration.clientInformation.client_id,
        client_secret: registration.clientSecret ?? null,
        issuer: discovery.authorizationServerUrl,
      };
      const { authorizationUrl, codeVerifier } = await buildMcpAuthorizeUrl({
        discovery,
        clientInformation: registration.clientInformation,
        redirectUri,
        scope: resolved.scopes.join(" ") || undefined,
        state,
        serverUrl: resolved.url,
      });

      await upsertMcpConnection({
        tenantId,
        serverId: resolved.serverId,
        status: "pending",
        transport: resolved.transport,
        url: resolved.url,
        clientId: storedRegistration.client_id,
        clientSecret: storedRegistration.client_secret,
        scope: resolved.scopes.join(" ") || null,
        metadata: {
          oauth: {
            kind: "mcp",
            state,
            code_verifier: codeVerifier,
            client_registration: storedRegistration,
            authorization_server_url: discovery.authorizationServerUrl,
            token_issuer: discovery.authorizationServerUrl,
          },
        },
      });

      return { ok: true, authorizationUrl, state };
    } catch (e) {
      logAudit("mcp_authorize_failed", {
        tenantId,
        serverId: resolved.serverId,
        error: e instanceof Error ? e.message : "unknown",
      });
      return {
        ok: false,
        error: `Could not start the ${resolved.name} connection: ${e instanceof Error ? e.message : "unknown error"}.`,
      };
    }
  }

  // --- API key o nessuna autenticazione ----------------------------------
  // Non c'è un redirect da fare: la UI chiede la chiave (api_key) o
  // collega direttamente (none) via POST /api/mcp/connect.
  return {
    ok: false,
    error:
      resolved.auth === "api_key"
        ? "This server needs an API key."
        : "This server does not need authorization.",
  };
}

export type McpCallbackResult =
  | { ok: true; serverId: string; name: string }
  | { ok: false; error: string; code: "state_mismatch" | "not_found" | "exchange_failed" };

/**
 * Completa l'autorizzazione: verifica lo `state`, scambia il codice e salva
 * i token cifrati.
 */
export async function completeMcpAuthorization(
  tenantId: string,
  serverId: string,
  params: { code?: string | null; state?: string | null; error?: string | null; errorDescription?: string | null },
  reqUrl: string,
  cookieState: string | undefined,
): Promise<McpCallbackResult> {
  // 1. Lo `state` firmato deve tornare identico a quello nel cookie.
  const payload = params.state ? verifyState(params.state, cookieState) : null;
  if (!payload || payload.t !== tenantId || payload.p !== serverId) {
    logAudit("mcp_state_mismatch", { tenantId, serverId });
    return { ok: false, error: "The authorization could not be verified.", code: "state_mismatch" };
  }

  // 2. Lo `state` deve coincidere anche con quello salvato sulla riga:
  //    il cookie può essere stato rubato e riportato, la riga no.
  const row = await getMcpConnection(tenantId, serverId);
  if (!row) return { ok: false, error: "This connection no longer exists.", code: "not_found" };
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const oauth = (metadata.oauth ?? {}) as Record<string, unknown>;
  const storedState = typeof oauth.state === "string" ? oauth.state : "";
  if (!storedState || !crypto.timingSafeEqual(Buffer.from(storedState), Buffer.from(params.state ?? ""))) {
    logAudit("mcp_state_mismatch", { tenantId, serverId, reason: "stored_state" });
    return { ok: false, error: "The authorization could not be verified.", code: "state_mismatch" };
  }

  if (params.error) {
    await upsertMcpConnection({ tenantId, serverId, status: "error" });
    return {
      ok: false,
      error: params.errorDescription || params.error || "The authorization was refused.",
      code: "exchange_failed",
    };
  }
  if (!params.code) {
    return { ok: false, error: "The provider did not return an authorization code.", code: "exchange_failed" };
  }

  const redirectUri = mcpCallbackUrl(reqUrl);

  // --- Percorso nativo ----------------------------------------------------
  if (oauth.kind === "native") {
    const providerId = String(oauth.provider ?? "");
    const adapter = getProvider(providerId);
    if (!adapter) {
      return { ok: false, error: "The connector is not configured.", code: "exchange_failed" };
    }
    try {
      const tokens = await adapter.exchangeCode({ code: params.code, redirectUri });
      await upsertMcpConnection({
        tenantId,
        serverId,
        status: "connected",
        transport: row.transport,
        url: row.url,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        expiresAt: tokens.expiresAt ?? null,
        scope: tokens.scope ?? null,
        metadata: { ...metadata, oauth: undefined },
      });
      const entry = getMcpEntry(serverId);
      return { ok: true, serverId, name: entry?.name ?? serverId };
    } catch (e) {
      await upsertMcpConnection({ tenantId, serverId, status: "error" }).catch(() => {});
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Could not complete the connection.",
        code: "exchange_failed",
      };
    }
  }

  // --- Percorso MCP --------------------------------------------------------
  const codeVerifier = typeof oauth.code_verifier === "string" ? oauth.code_verifier : "";
  const registration = oauth.client_registration as StoredClientRegistration | undefined;
  const serverUrl = row.url;
  if (!codeVerifier || !registration || !serverUrl) {
    return { ok: false, error: "The authorization session expired. Please try again.", code: "exchange_failed" };
  }

  try {
    const discovery = await discoverMcpAuth(serverUrl);
    const tokens = await exchangeMcpCode({
      discovery,
      clientInformation: {
        client_id: registration.client_id,
        client_secret: registration.client_secret ?? undefined,
      },
      code: params.code,
      codeVerifier,
      redirectUri,
      serverUrl,
    });

    await upsertMcpConnection({
      tenantId,
      serverId,
      status: "connected",
      transport: row.transport,
      url: serverUrl,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? null,
      expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt).toISOString() : null,
      scope: tokens.scope ?? null,
      clientId: registration.client_id,
      metadata: {
        ...metadata,
        oauth: undefined,
        client_registration: registration,
        token_issuer: tokens.issuer ?? discovery.authorizationServerUrl,
      },
    });

    logAudit("mcp_connected", { tenantId, serverId });
    const entry = getMcpEntry(serverId);
    return { ok: true, serverId, name: entry?.name ?? serverId };
  } catch (e) {
    await upsertMcpConnection({ tenantId, serverId, status: "error" }).catch(() => {});
    logAudit("mcp_token_exchange_failed", {
      tenantId,
      serverId,
      error: e instanceof Error ? e.message : "unknown",
    });
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not complete the connection.",
      code: "exchange_failed",
    };
  }
}
