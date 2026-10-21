/**
 * OAuth 2.1 per i server MCP remoti.
 *
 * Il flusso è quello descritto da MCP + OAuth 2.1:
 *
 *   1. DISCOVERY del server di autorizzazione.
 *      - RFC 9728: `/.well-known/oauth-protected-resource` sul server MCP
 *        dice QUALE authorization server rilascia i token per QUEL server.
 *      - RFC 8414 (o OpenID Connect Discovery): i metadata del
 *        authorization server, con gli endpoint e i metodi supportati.
 *
 *   2. REGISTRAZIONE del client (RFC 7591, Dynamic Client Registration).
 *      Se il server non la supporta si usa un client statico, dichiarato
 *      dalla voce del registro.
 *
 *   3. AUTHORIZATION CODE + PKCE (S256). Lo `state` è casuale e viene
 *      verificato al rientro: senza, un attaccante potrebbe iniettare un
 *      codice autorizzato da un'altra sessione (login CSRF).
 *
 *   4. SCAMBIO del codice con il token endpoint, in cambio di
 *      access token + refresh token.
 *
 * Tutte le funzioni qui sotto sono "pure" dal punto di vista dello stato:
 * ricevono i parametri e restituiscono il risultato. Il salvataggio su DB
 * è in `tokens.ts` / `store.ts`. Questo le rende testabili senza database.
 */

import {
  discoverOAuthServerInfo,
  exchangeAuthorization,
  refreshAuthorization,
  registerClient,
  startAuthorization,
} from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  AuthorizationServerMetadata,
  OAuthClientInformationMixed,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";

import { safeMcpFetch } from "./security";

/** Cosa serve per costruire l'authorize URL e completare il flusso. */
export type McpDiscovery = {
  /** URL del server di autorizzazione (issuer). */
  authorizationServerUrl: string;
  /** Metadata del server di autorizzazione, se disponibili. */
  metadata?: AuthorizationServerMetadata;
  /** Resource metadata (RFC 9728), se il server li espone. */
  resourceMetadataUrl?: string;
};

export type McpClientRegistration = {
  clientInformation: OAuthClientInformationMixed;
  /** `client_secret` se il server lo ha emesso (DCR può farlo). */
  clientSecret?: string | null;
};

export type McpStoredTokens = {
  accessToken: string;
  refreshToken?: string | null;
  /** Scadenza in epoch ms. */
  expiresAt?: number | null;
  scope?: string | null;
  /** Issuer che ha emesso i token: serve per non riusarli con un altro AS. */
  issuer?: string | null;
};

/** Client OAuth statico, dichiarato dal registro. */
export type McpStaticClient = {
  clientId: string;
  clientSecret?: string | null;
};

/**
 * Metadata del client che presentiamo al server (RFC 7591).
 * `redirect_uris` è l'unico campo che il server deve accettare: cambiare
 * il redirect URI dopo l'autorizzazione fa fallire lo scambio del codice.
 */
export function clientMetadata(redirectUri: string, scope?: string) {
  return {
    client_name: "AgentCloud",
    client_uri: "https://www.agentcloud.agency",
    redirect_uris: [redirectUri],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    ...(scope ? { scope } : {}),
  };
}

/**
 * Passo 1: trova il server di autorizzazione per un dato server MCP.
 * Non lancia se il server non espone i metadata: in quel caso si assume
 * che l'authorization server sia il server MCP stesso (fallback previsto
 * dalla specifica MCP).
 */
export async function discoverMcpAuth(
  serverUrl: string,
): Promise<McpDiscovery> {
  try {
    const info = await discoverOAuthServerInfo(serverUrl, {
      fetchFn: safeMcpFetch as never,
    });
    return {
      authorizationServerUrl: info.authorizationServerUrl,
      metadata: info.authorizationServerMetadata,
      // Il tipo dell'SDK non espone l'URL del resource metadata: lo
      // recuperiamo in modo difensivo, serve solo come diagnostica.
      resourceMetadataUrl: (info as { resourceMetadataUrl?: string }).resourceMetadataUrl,
    };
  } catch {
    // Fallback: il server MCP è anche il server di autorizzazione.
    return { authorizationServerUrl: serverUrl };
  }
}

/**
 * Passo 2: registra il client (Dynamic Client Registration).
 * Con un client statico non c'è niente da registrare.
 */
export async function registerMcpClient(
  discovery: McpDiscovery,
  opts: {
    redirectUri: string;
    scope?: string;
    staticClient?: McpStaticClient | null;
  },
): Promise<McpClientRegistration> {
  if (opts.staticClient?.clientId) {
    return {
      clientInformation: {
        client_id: opts.staticClient.clientId,
        client_secret: opts.staticClient.clientSecret ?? undefined,
      },
      clientSecret: opts.staticClient.clientSecret ?? null,
    };
  }

  const registered = await registerClient(discovery.authorizationServerUrl, {
    metadata: discovery.metadata,
    clientMetadata: clientMetadata(opts.redirectUri, opts.scope) as never,
    scope: opts.scope,
    fetchFn: safeMcpFetch as never,
  });
  return {
    clientInformation: registered,
    clientSecret: registered.client_secret ?? null,
  };
}

/**
 * Passo 3: costruisce l'URL di autorizzazione (con PKCE S256 generato qui).
 * Restituisce anche il `codeVerifier`, che NON deve mai passare dalla URL:
 * resta sul server (cookie httpOnly o DB) e torna solo al momento dello
 * scambio del codice.
 */
export async function buildMcpAuthorizeUrl(opts: {
  discovery: McpDiscovery;
  clientInformation: OAuthClientInformationMixed;
  redirectUri: string;
  scope?: string;
  state: string;
  serverUrl: string;
}): Promise<{ authorizationUrl: string; codeVerifier: string }> {
  const { authorizationUrl, codeVerifier } = await startAuthorization(
    opts.discovery.authorizationServerUrl,
    {
      metadata: opts.discovery.metadata,
      clientInformation: opts.clientInformation,
      redirectUrl: opts.redirectUri,
      scope: opts.scope,
      state: opts.state,
      // RFC 8707: il resource indicator dice al provider a quale server MCP
      // il token è destinato. Serve a legare il token al server giusto.
      resource: opts.serverUrl,
    },
  );
  return { authorizationUrl: authorizationUrl.toString(), codeVerifier };
}

/**
 * Passo 4: scambia il codice di autorizzazione con i token.
 */
export async function exchangeMcpCode(opts: {
  discovery: McpDiscovery;
  clientInformation: OAuthClientInformationMixed;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  serverUrl: string;
}): Promise<McpStoredTokens> {
  const tokens: OAuthTokens = await exchangeAuthorization(
    opts.discovery.authorizationServerUrl,
    {
      metadata: opts.discovery.metadata,
      clientInformation: opts.clientInformation,
      authorizationCode: opts.code,
      codeVerifier: opts.codeVerifier,
      redirectUri: opts.redirectUri,
      resource: opts.serverUrl,
      fetchFn: safeMcpFetch as never,
    },
  );
  return normalizeTokens(tokens, opts.discovery.authorizationServerUrl);
}

/** Rinnova l'access token con il refresh token. */
export async function refreshMcpTokens(opts: {
  discovery: McpDiscovery;
  clientInformation: OAuthClientInformationMixed;
  refreshToken: string;
  serverUrl: string;
}): Promise<McpStoredTokens> {
  const tokens: OAuthTokens = await refreshAuthorization(
    opts.discovery.authorizationServerUrl,
    {
      metadata: opts.discovery.metadata,
      clientInformation: opts.clientInformation,
      refreshToken: opts.refreshToken,
      resource: opts.serverUrl,
      fetchFn: safeMcpFetch as never,
    },
  );
  return normalizeTokens(tokens, opts.discovery.authorizationServerUrl);
}

/**
 * Revoca (RFC 7009) del token, se il server di autorizzazione espone
 * l'endpoint. La disconnessione funziona anche senza: in quel caso i token
 * vengono semplicemente dimenticati da noi.
 */
export async function revokeMcpTokens(opts: {
  discovery: McpDiscovery;
  clientInformation: OAuthClientInformationMixed;
  token: string;
}): Promise<boolean> {
  const endpoint = (opts.discovery.metadata as { revocation_endpoint?: string } | undefined)
    ?.revocation_endpoint;
  if (!endpoint) return false;

  const body = new URLSearchParams({
    token: opts.token,
    client_id: opts.clientInformation.client_id,
  });
  const secret = (opts.clientInformation as { client_secret?: string }).client_secret;
  if (secret) body.set("client_secret", secret);

  const res = await safeMcpFetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  }).catch(() => null);
  return Boolean(res?.ok);
}

/** Normalizza i token del SDK nel formato che usiamo noi. */
export function normalizeTokens(
  tokens: OAuthTokens,
  issuer?: string,
): McpStoredTokens {
  const expiresIn =
    typeof tokens.expires_in === "number" ? tokens.expires_in : null;
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
    scope: tokens.scope ?? null,
    issuer: issuer ?? tokens.issuer ?? null,
  };
}

/** Client registration completo (con secret), serializzabile su DB. */
export type StoredClientRegistration = {
  client_id: string;
  client_secret?: string | null;
  issuer?: string | null;
};

/** Converte la registrazione in forma serializzabile. */
export function toStoredRegistration(
  reg: McpClientRegistration,
  issuer?: string,
): StoredClientRegistration {
  const info = reg.clientInformation as {
    client_id: string;
    client_secret?: string;
  };
  return {
    client_id: info.client_id,
    client_secret: reg.clientSecret ?? info.client_secret ?? null,
    issuer: issuer ?? null,
  };
}

/** Ricostruisce la registrazione dalla forma serializzata. */
export function fromStoredRegistration(
  stored: StoredClientRegistration,
): OAuthClientInformationMixed {
  return {
    client_id: stored.client_id,
    client_secret: stored.client_secret ?? undefined,
  };
}
