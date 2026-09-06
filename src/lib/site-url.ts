/**
 * Unica fonte di verità per l'URL pubblico del sito.
 *
 * Perché esiste: in passato il codice mescolava `NEXT_PUBLIC_SITE_URL` e
 * `NEXT_PUBLIC_URL` con fallback diversi (localhost vs agentcloud.io), e questo
 * rompeva silenziosamente l'inoltro WhatsApp, gli URL canonici e gli embed in
 * produzione. Usare sempre `getSiteUrl()` evita di ricadere nel problema.
 *
 * Ordine di risoluzione: NEXT_PUBLIC_SITE_URL → NEXT_PUBLIC_URL → localhost.
 *
 * Client-safe: legge solo variabili NEXT_PUBLIC_* (iniettate a build-time),
 * mai moduli server-only.
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL;
  if (!fromEnv) {
    if (process.env.NODE_ENV === "production") {
      // Segnale forte: robots/sitemap/canonical/embed punterebbero silenziosamente
      // a localhost. In produzione questa variabile è obbligatoria.
      console.error(
        "[getSiteUrl] NEXT_PUBLIC_SITE_URL is not set — falling back to http://localhost:3000. Set it in production.",
      );
    }
    return "http://localhost:3000";
  }
  return fromEnv.replace(/\/+$/, "");
}
