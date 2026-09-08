/**
 * Generic multi-provider integration types (Phase 2).
 * Mirror of Shopify's per-shop pattern but generic and provider-agnostic.
 * All provider-specific code lives under lib/integrations/providers/*.
 */

export type SupportedProvider =
  | "stripe"
  | "notion"
  | "slack"
  | "hubspot"
  | "google_sheets";

export const SUPPORTED_PROVIDERS: readonly SupportedProvider[] = [
  "stripe",
  "notion",
  "slack",
  "hubspot",
  "google_sheets",
] as const;

export function isSupportedProvider(v: string): v is SupportedProvider {
  return (SUPPORTED_PROVIDERS as readonly string[]).includes(v);
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

export type IntegrationProvider = {
  /** Provider key, must match SupportedProvider. */
  readonly provider: SupportedProvider;
  /** Build the authorization URL to redirect the tenant to. */
  getAuthUrl(opts: { state: string; redirectUri: string }): string;
  /** Exchange authorization_code for tokens (server-side only). */
  exchangeCode(opts: { code: string; redirectUri: string }): Promise<TokenExchangeResult>;
  /** Optional refresh hook (used by Edge Function proxy in Phase 3). */
  refreshToken?(opts: { refreshToken: string }): Promise<TokenExchangeResult>;
  /** Optional revoke hook (disconnect). */
  revokeToken?(opts: { accessToken: string }): Promise<void>;
};
