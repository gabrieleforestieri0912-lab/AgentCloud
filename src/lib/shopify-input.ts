/**
 * Accept flexible store input in the connect forms: a bare domain
 * ("store.myshopify.com"), a full URL ("https://store.myshopify.com/admin"),
 * or anything containing the myshopify.com host. Extracts the canonical
 * <store>.myshopify.com host (server-side normalizeShop stays strict).
 * Returns null when no valid myshopify.com store host is present.
 */
export function normalizeShopInput(input: string): string | null {
  const raw = input.toLowerCase();
  const match = raw.match(
    /(?:^|[/\s@:"'])([a-z0-9][a-z0-9-]*\.myshopify\.com)/,
  );
  if (!match) return null;
  const host = match[1];
  const hostEnd = match.index! + match[0].length;
  // The host must not be the tail of a longer hostname
  // (e.g. store.myshopify.com.br) — only separators may follow.
  const next = raw[hostEnd];
  if (next && /[a-z0-9.-]/.test(next)) return null;
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]\.myshopify\.com$/.test(host)
    ? host
    : null;
}
