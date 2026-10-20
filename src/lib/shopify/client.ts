/**
 * Client ID pubblico dell'app Shopify.
 *
 * Perché questo modulo: il client ID compare in più posti (meta tag
 * `shopify-api-key` nell'HTML, URL di autorizzazione, token exchange) e non
 * deve essere ripetuto in ogni file.
 *
 * Sicurezza: il client ID **non è un segreto** — è pubblico per
 * progettazione (compare già in `shopify.app.toml` e nei file pubblici
 * dell'app). Il client secret sta solo in `SHOPIFY_API_SECRET`, lato
 * server, e non deve mai finire nel frontend.
 */

export const SHOPIFY_CLIENT_ID =
  process.env.SHOPIFY_API_KEY || "461eff50e7ece493b4ed79762975b42d";
