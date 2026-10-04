import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifica server-only della firma HMAC dei webhook Shopify.
 *
 * NON importare mai questo modulo da client component: usa `crypto` di Node
 * e il client secret (`SHOPIFY_API_SECRET`) letto dall'ambiente server.
 *
 * Regole:
 * - calcola sempre l'HMAC sul body GREZZO (`await req.text()`), mai su
 *   `req.json()` prima della verifica (la serializzazione altererebbe i byte);
 * - digest in base64, confrontato con l'header `X-Shopify-Hmac-Sha256`
 *   tramite `timingSafeEqual`, dopo aver verificato che le lunghezze
 *   coincidano (altrimenti `timingSafeEqual` lancia);
 * - header mancante → `false`, senza eseguire altra logica.
 */
export function verifyShopifyWebhookSignature(
  rawBody: string,
  hmacHeader: string | null | undefined,
  secret: string,
): boolean {
  if (!hmacHeader) return false;
  const computed = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(hmacHeader, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
