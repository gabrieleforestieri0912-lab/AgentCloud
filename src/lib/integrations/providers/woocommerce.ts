import type { IntegrationProvider, TokenExchangeResult } from "../types";
import { normalizeTenantUrl } from "../safe-url";

/**
 * WooCommerce — non è OAuth.
 *
 * Env: WOOCOMMERCE_APP_NAME (compare nella schermata di autorizzazione di
 * WooCommerce), WOOCOMMERCE_RETURN_URL e WOOCOMMERCE_CALLBACK_URL se si vuole
 * forzare gli URL invece di derivarli dalla richiesta.
 *
 * Le Consumer Key/Secret NON sono env: sono dati del tenant, generati dal suo
 * store e salvate cifrate in `tenant_integrations` (access_token = key,
 * refresh_token = secret). Per ogni tenant quindi ce n'è una coppia diversa.
 *
 * Flusso. `GET /wp-json/wc-auth/v1/authorize` sul SUO store: l'utente entra
 * nel wp-admin, vede il nome dell'app e approva. WooCommerce redirige a
 * `redirect_uri` con `?consumer_key=...&consumer_secret=...`.
 *
 * `user_id` è OBBIGLIATORIO per WooCommerce: è l'ID WordPress dell'utente a cui
 * verrà associata la chiave. Non è deducibile dal nulla (è un dato del suo
 * store, non della sua autorizzazione), quindi la UI lo chiede. Il brief non lo
 * menzionava: senza, l'authorize risponde 400 e la connessione fallirebbe con
 * un errore incomprensibile.
 *
 * Nessun codice da scambiare: `tokenInRedirect` perché entrambe le credenziali
 * arrivano già pronte al callback.
 */
export const woocommerceProvider: IntegrationProvider = {
  provider: "woocommerce",

  tokenUsage: "keypair",
  authParam: "consumer_key",
  secretParam: "consumer_secret",
  tokenInRedirect: true,

  getAuthUrl({ state, redirectUri, tenantInput }) {
    const storeUrl = tenantInput?.store_url;
    const userId = tenantInput?.user_id;

    if (!storeUrl) throw new Error("WooCommerce: manca l'URL dello store");
    if (!userId) throw new Error("WooCommerce: manca il WordPress User ID");
    if (!/^\d+$/.test(userId)) {
      throw new Error("WooCommerce: il User ID deve essere un numero");
    }

    const appName = process.env.WOOCOMMERCE_APP_NAME || "AgentCloud";
    const params = new URLSearchParams({
      app_name: appName,
      scope: process.env.WOOCOMMERCE_SCOPE || "read_write",
      user_id: userId,
      redirect_uri: redirectUri,
      return_url: redirectUri,
      state,
    });
    return `${storeUrl}/wp-json/wc-auth/v1/authorize?${params.toString()}`;
  },

  /**
   * Nessuno scambio: `code` è la Consumer Key e `codeSecret` la Consumer
   * Secret, entrambe già pronte. Si normalizza di nuovo l'URL dello store
   * perché arriva dallo `state` firmato ma la validazione va rifatta dove si
   * decide dove scrivere i dati.
   */
  async exchangeCode({ code, codeSecret, tenantInput }): Promise<TokenExchangeResult> {
    const consumerKey = code?.trim();
    const consumerSecret = codeSecret?.trim();
    if (!consumerKey) throw new Error("WooCommerce: nessuna Consumer Key ricevuta");
    if (!consumerSecret) throw new Error("WooCommerce: nessuna Consumer Secret ricevuta");

    const rawStore = tenantInput?.store_url;
    if (!rawStore) throw new Error("WooCommerce: URL dello store mancante nello state");
    const checked = normalizeTenantUrl(rawStore);
    if (!checked.ok) {
      throw new Error(`WooCommerce: URL dello store non valido (${checked.error})`);
    }
    const storeUrl = checked.url.origin;

    return {
      // Colonna access_token = Consumer Key, refresh_token = Consumer Secret.
      // Riusa due colonne esistenti: nessuna migration, e cifrate entrambe
      // dallo stesso envelope AES-256-GCM.
      accessToken: consumerKey,
      refreshToken: consumerSecret,
      // Chiavi API WooCommerce: per impostazione predefinita non scadono.
      expiresAt: null,
      scope: process.env.WOOCOMMERCE_SCOPE || "read_write",
      externalAccountId: new URL(storeUrl).hostname,
      metadata: {
        store_url: storeUrl,
        wp_user_id: tenantInput?.user_id ?? null,
        app_name: process.env.WOOCOMMERCE_APP_NAME || "AgentCloud",
      },
      raw: { consumer_key_received: true },
    };
  },
};