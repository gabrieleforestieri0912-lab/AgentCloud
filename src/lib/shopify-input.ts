/**
 * Accetta input flessibili del negozio nei form di connessione: un dominio
 * nudo ("store.myshopify.com"), un URL completo
 * ("https://store.myshopify.com/admin") o qualsiasi testo che contiene un
 * host myshopify.com. Estrae l'host canonico <store>.myshopify.com (la
 * normalizzazione lato server resta rigorosa). Restituisce null quando non è
 * presente un host myshopify.com valido.
 */
export function normalizeShopInput(input: string): string | null {
  const raw = input.toLowerCase();
  const match = raw.match(
    /(?:^|[/\s@:"'])([a-z0-9][a-z0-9-]*\.myshopify\.com)/,
  );
  if (!match) return null;
  const host = match[1];
  const hostEnd = match.index! + match[0].length;
  // L'host non deve essere la coda di un hostname più lungo
  // (es. store.myshopify.com.br): dopo di esso possono seguire solo separatori.
  const next = raw[hostEnd];
  if (next && /[a-z0-9.-]/.test(next)) return null;
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]\.myshopify\.com$/.test(host)
    ? host
    : null;
}
