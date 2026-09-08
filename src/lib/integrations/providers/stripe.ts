import type { IntegrationProvider } from "../types";

/**
 * Stripe Connect (Express, fallback Standard) — per-tenant Stripe account.
 * Secrets: STRIPE_CONNECT_CLIENT_ID (ca_...) + STRIPE_SECRET_KEY (sk_..., platform).
 * No hardcoded secrets; redirectUri is https://<domain>/api/integrations/stripe/callback.
 */
export const stripeProvider: IntegrationProvider = {
  provider: "stripe",
  getAuthUrl({ state, redirectUri }) {
    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID || "";
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: "read_write",
      state,
      redirect_uri: redirectUri,
    });
    return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
  },
  async exchangeCode({ code, redirectUri }) {
    const clientSecret = process.env.STRIPE_SECRET_KEY || "";
    // Stripe Connect token endpoint: https://connect.stripe.com/oauth/token
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_secret: clientSecret,
      code,
      // redirect_uri is not required by Stripe but send if provided for consistency
    });
    // Some Stripe flows validate client_id as well; include if available
    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID || "";
    if (clientId) body.set("client_id", clientId);
    if (redirectUri) body.set("redirect_uri", redirectUri);

    const res = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error((json.error_description as string) || (json.error as string) || `Stripe token exchange failed (${res.status})`);
    }
    const accessToken = json.access_token as string | undefined;
    const refreshToken = (json.refresh_token as string | undefined) ?? null;
    const stripeUserId = (json.stripe_user_id as string | undefined) ?? null;
    const scope = (json.scope as string | undefined) ?? "read_write";
    if (!accessToken) throw new Error("Stripe: no access_token in response");
    return {
      accessToken,
      refreshToken,
      // Stripe Connect access tokens are currently non-expiring for the connected account; expiresAt stays null
      expiresAt: null,
      scope,
      externalAccountId: stripeUserId,
      metadata: { stripe_user_id: stripeUserId, livemode: json.livemode },
      raw: json,
    };
  },
  async refreshToken() {
    // Stripe Connect refresh flow is rarely needed (tokens don't expire); implement if refresh_token was issued
    throw new Error("Stripe Connect refresh not implemented — tokens are long-lived");
  },
};
