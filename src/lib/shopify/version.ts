/**
 * Versioni API Shopify usate dal codice.
 *
 * Perché un modulo dedicato: la versione era una stringa letterale duplicata in
 * due punti (`lib/shopify/webhooks.ts` e `lib/agents/tools.ts`) e citava
 * `2024-10`, una versione ormai ritirata. Shopify, davanti a una versione
 * inaccessibile, NON risponde con un errore: fa "fall forward" alla più vecchia
 * versione stabile ancora raggiungibile (dalla doc: «a request targeting a
 * retired 2024-10 is served by the oldest accessible stable version»). Il
 * risultato era che il codice parlava — commenti compresi — di una versione
 * diversa da quella realmente in uso, e che quella in uso sarebbe cambiata da
 * sola a ogni ritiro trimestrale. Pinnare l'ultima stabile rende il
 * comportamento deterministico; la versione effettiva di ogni risposta è
 * comunque nel header `X-Shopify-API-Version`.
 *
 * Override con SHOPIFY_API_VERSION (utile per allinearsi a un nuovo trimestre
 * senza toccare il codice).
 */
export const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-07";

/** Endpoint GraphQL dell'Admin API di un negozio, alla versione pinnata. */
export function shopifyAdminGraphqlUrl(shopDomain: string): string {
  return `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
}

/**
 * Endpoint GraphQL della Partner API **documentata**: l'id dell'organizzazione
 * sta nel path e l'autenticazione passa dal header `X-Shopify-Access-Token`.
 * (`partners.shopify.com/api/cli/graphql` è l'endpoint interno della CLI, senza
 * documentazione pubblica: non va usato in produzione.)
 */
export function shopifyPartnerGraphqlUrl(organizationId: string): string {
  return `https://partners.shopify.com/${encodeURIComponent(organizationId)}/api/${SHOPIFY_API_VERSION}/graphql.json`;
}
