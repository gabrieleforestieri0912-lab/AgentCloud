/**
 * Generic multi-provider integration types (Phase 2).
 * Mirror of Shopify's per-shop pattern but generic and provider-agnostic.
 * All provider-specific code lives under lib/integrations/providers/*.
 *
 * `SupportedProvider` è derivato da PROVIDER_CATALOG: aggiungere un provider
 * alla sola lista lo propaga qui, in registry.ts e nelle union del proxy. Se un
 * adapter manca, il typecheck fallisce (vedi registry.ts).
 */

import { PROVIDER_CATALOG, IMPLEMENTED_PROVIDERS } from "./catalog";

/** Ogni provider previsto dal batch, dichiarato in anticipo nel catalogo. */
export type SupportedProvider = (typeof PROVIDER_CATALOG)[number]["id"];

/** Provider con adapter, proxy e tool: quelli che le route OAuth accettano. */
export type ImplementedProvider = (typeof IMPLEMENTED_PROVIDERS)[number];

export const SUPPORTED_PROVIDERS: readonly SupportedProvider[] =
  PROVIDER_CATALOG.map((p) => p.id);

/**
 * Usata dalle route OAuth: accetta solo i provider implementati. Un provider
 * ancora in costruzione risponde 400 "unsupported provider" invece di
 * costruire un authorize URL che si romperebbe al primo passo.
 */
export function isSupportedProvider(v: string): v is ImplementedProvider {
  return (IMPLEMENTED_PROVIDERS as readonly string[]).includes(v);
}

export type TokenExchangeResult = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null; // ISO timestamptz or null
  scope?: string | null;
  externalAccountId?: string | null;
  metadata?: Record<string, unknown>;
  raw?: unknown;
};

/**
 * Come si usa `accessToken` nelle chiamate all'API del provider.
 *  - `bearer`   Authorization: Bearer <accessToken> (default)
 *  - `keypair`  Basic base64(<accessToken>:<refreshToken>). Usato da WooCommerce:
 *               Consumer Key/Consumer Secret invece di un token OAuth. Le due
 *               credenziali occupano le colonne access_token e refresh_token,
 *               quindi non serve una colonna nuova.
 */
export type TokenUsage = "bearer" | "keypair";

/**
 * Dati raccolti dall'utente prima di autorizzare, indicati da
 * `PROVIDER_CATALOG[x].tenantInput`. Per WooCommerce è l'URL dello store.
 */
export type TenantInput = Record<string, string>;

export type AuthUrlOptions = {
  state: string;
  redirectUri: string;
  /** Dato inserito dall'utente (es. store_url). Già validato lato server. */
  tenantInput?: TenantInput;
  /**
   * PKCE: presente solo se il catalogo dichiara `authType: "oauth2_pkce"`.
   * L'adapter deve usare `codeChallenge` come `code_challenge`. Il
   * `codeVerifier` non viene mai passato qui: resta nel cookie httpOnly e
   * torna indietro in `exchangeCode`, così non attraversa mai la URL.
   */
  pkce?: { codeChallenge: string };
};

export type ExchangeCodeOptions = {
  code: string;
  redirectUri: string;
  tenantInput?: TenantInput;
  /** Solo per `authType: "oauth2_pkce"`. */
  codeVerifier?: string;
  /**
   * Seconda credenziale dai query param del redirect (WooCommerce rimanda
   * sia `consumer_key` sia `consumer_secret`). Popolata dal callback a partire
   * da `secretParam`.
   */
  codeSecret?: string;
};

export type IntegrationProvider = {
  /** Provider key, must match SupportedProvider. */
  readonly provider: SupportedProvider;
  /** Build the authorization URL to redirect the tenant to. */
  getAuthUrl(opts: AuthUrlOptions): string;
  /** Exchange authorization_code for tokens (server-side only). */
  exchangeCode(opts: ExchangeCodeOptions): Promise<TokenExchangeResult>;
  /** Optional refresh hook (usato dal refresh lato server in lib/integrations/api-proxy.ts). */
  refreshToken?(opts: { refreshToken: string }): Promise<TokenExchangeResult>;
  /** Optional revoke hook (disconnect). */
  revokeToken?(opts: { accessToken: string }): Promise<void>;
  /**
   * Come autenticare le chiamate API. Default "bearer".
   * `keypair` richiede che `refreshToken` contenga la seconda credenziale.
   */
  readonly tokenUsage?: TokenUsage;
  /**
   * Nome del query param che porta la credenziale nel redirect del provider.
   * Default "code" (OAuth authorization_code). Trello non è un code flow:
   * restituisce `?token=...&expires_in=...`, quindi dichiara "token".
   */
  readonly authParam?: string;
  /**
   * Provider che al redirect restituiscono direttamente la credenziale già
   * pronta (Trello) invece di un codice da scambiare: in quel caso
   * `exchangeCode` riceve quel valore come `code` senza effettuare chiamate.
   */
  readonly tokenInRedirect?: boolean;
  /**
   * Nome del query param che porta una SECONDA credenziale (WooCommerce:
   * `consumer_secret`, che accompagna `consumer_key`).
   * Se dichiarato, il callback la passa come `codeSecret` a `exchangeCode`, che
   * la salva in `refresh_token` per il formato `keypair`.
   */
  readonly secretParam?: string;
};
