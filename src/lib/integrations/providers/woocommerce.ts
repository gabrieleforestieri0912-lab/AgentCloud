import type { IntegrationProvider, TokenExchangeResult } from "../types";
import { normalizeTenantUrl } from "../safe-url";

/**
 * WooCommerce — non è OAuth.
 *
 * Env: WOOCOMMERCE_APP_NAME (compare nella schermata di autorizzazione di
 * WooCommerce), WOOCOMMERCE_SCOPE per i permessi richiesti.
 *
 * Le Consumer Key/Secret NON sono env: sono dati del tenant, generati dal suo
 * store e salvate cifrate in `tenant_integrations` (access_token = key,
 * refresh_token = secret). Per ogni tenant quindi ce n'è una coppia diversa.
 *
 * ── Il protocollo reale (WC_Auth, WooCommerce core dal 2.4) ────────────────
 * Questo connettore è stato riscritto perché la versione precedente non
 * poteva funzionare. I quattro punti, verificati sulla sorgente di WooCommerce:
 *
 * 1. Il path NON è `/wp-json/wc-auth/v1/authorize`. `wc-auth` non è una
 *    namespace REST: è una rewrite rule di WordPress registrata da
 *    `WC_Auth::add_endpoint()` come `^wc-auth/v1/(.*)?`. Il percorso corretto
 *    è `{store}/wc-auth/v1/authorize`, e con la vecchia URL WooCommerce
 *    rispondeva `rest_no_route` (404) senza mai mostrare il consenso.
 *
 * 2. I parametri sono cinque e TUTTI obbligatori: `app_name`, `user_id`,
 *    `return_url`, `callback_url`, `scope`. `redirect_uri` non esiste, e
 *    `state` non è supportato.
 *
 * 3. `state` verrebbe perso comunque: `WC_Auth::build_url()` ricostruisce ogni
 *    hop interno (authorize → login, login → authorize, link Approve) da una
 *    allowlist fissa, quindi qualunque parametro extra viene scartato in
 *    silenzio. La correlazione viaggia quindi dentro `return_url` e
 *    `callback_url`, come token firmato (vedi buildSignedUrlToken).
 *
 * 4. Le credenziali NON arrivano mai in una redirezione del browser.
 *    `return_url` riceve solo `?success=1&user_id=...`; la Consumer Key e la
 *    Consumer Secret arrivano con una POST server-to-server a `callback_url`,
 *    corpo JSON `{key_id, user_id, consumer_key, consumer_secret,
 *    key_permissions}`. Per questo il callback espone anche un handler POST:
 *    è lì che le credenziali vengono salvate, mentre il GET serve solo a
 *    riportare l'utente in dashboard.
 *
 * `user_id` non è il WordPress User ID del negozio: la documentazione dice
 * esplicitamente "User ID in your app. NOT THE USER ID IN WOOCOMMERCE". È il
 * nostro riferimento all'utente che autorizza, e serve a correlare il ritorno.
 * Per questo lo imponta la route authorize con l'id dell'utente loggato e non
 * viene chiesto all'utente (vedi `tenantInput` del catalogo).
 */
export const woocommerceProvider: IntegrationProvider = {
  provider: "woocommerce",

  tokenUsage: "keypair",
  // Le due credenziali arrivano nel corpo JSON della POST, non in query param:
  // i nomi restano dichiarati perché la route li usa come chiavi del corpo e
  // come fallback per un eventuale invio manuale delle chiavi.
  authParam: "consumer_key",
  secretParam: "consumer_secret",
  tokenInRedirect: true,

  getAuthUrl({ state, redirectUri, tenantInput }) {
    const storeUrl = tenantInput?.store_url;
    const userId = tenantInput?.user_id;

    if (!storeUrl) throw new Error("WooCommerce: manca l'URL dello store");
    if (!userId) throw new Error("WooCommerce: manca l'identificativo utente");

    const appName = process.env.WOOCOMMERCE_APP_NAME || "AgentCloud";
    // `read` e non `read_write`: le cinque tool sono di sola lettura e non c'è
    // alcun meccanismo di conferma che copra le scritture (vedi Open Decision
    // 14). Chiedere permessi di scrittura che non usiamo indebolirebbe la
    // posizione dell'app in una verifica privacy/Trust & Safety.
    const scope = process.env.WOOCOMMERCE_SCOPE || "read";

    // Il token firmato sta nella URL perché WooCommerce scarta `state`. Va
    //-appeso identico a `return_url` e `callback_url`: sono due destini
    // distinti (browser e server-to-server) ma devono poter essere verificati
    // entrambi senza cookie.
    const withToken = `${redirectUri}${redirectUri.includes("?") ? "&" : "?"}tx=${encodeURIComponent(state)}`;

    const params = new URLSearchParams({
      app_name: appName,
      scope,
      user_id: userId,
      return_url: withToken,
      callback_url: withToken,
    });
    // Niente `/wp-json`: è una rewrite rule di WordPress, non una REST route.
    return `${storeUrl}/wc-auth/v1/authorize?${params.toString()}`;
  },

  /**
   * Nessuno scambio: la coppia Consumer Key/Secret arriva già pronta (dal corpo
   * JSON della POST di WooCommerce). Si normalizza di nuovo l'URL dello store
   * perché arriva dal token firmato ma la validazione va rifatta dove si decide
   * dove scrivere i dati.
   */
  async exchangeCode({ code, codeSecret, tenantInput }): Promise<TokenExchangeResult> {
    const consumerKey = code?.trim();
    const consumerSecret = codeSecret?.trim();
    if (!consumerKey) throw new Error("WooCommerce: nessuna Consumer Key ricevuta");
    if (!consumerSecret) throw new Error("WooCommerce: nessuna Consumer Secret ricevuta");

    const rawStore = tenantInput?.store_url;
    if (!rawStore) throw new Error("WooCommerce: URL dello store mancante nel token firmato");
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
      scope: process.env.WOOCOMMERCE_SCOPE || "read",
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