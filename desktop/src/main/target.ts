/**
 * Dove caricare la finestra: il web app o il renderer nativo.
 *
 * La decisione è una scelta di prodotto, non un dettaglio: il web app è il
 * prodotto (la sua UI è ~45× più grande di quella del client nativo), quindi
 * il desktop di default lo carica e ottiene la parità per costruzione. Il
 * renderer nativo resta come "client leggero" (un agente, una domanda veloce)
 * e si attiva con AGENTCLOUD_DESKTOP_MODE=native.
 *
 * Priorità:
 *   1. AGENTCLOUD_DESKTOP_MODE=native → renderer locale (client leggero)
 *   2. AGENTCLOUD_WEB_URL → quell'URL
 *   3. sviluppo → il dev server Next in locale (http://localhost:3000)
 *   4. produzione → il sito pubblico
 */

/** URL del web app in produzione. */
export const DEFAULT_WEB_URL = "https://www.agentcloud.agency";

/** Il dev server di Next in locale (usato in sviluppo). */
export const LOCAL_DEV_WEB_URL = "http://localhost:3000";

export type DesktopMode = "web" | "native";

export type ResolveTargetInput = {
  /** Modalità richiesta esplicitamente (env). */
  mode?: string | undefined;
  /** URL del web app richiesto esplicitamente (env). */
  webUrl?: string | undefined;
  /** True quando gira in sviluppo (electron-vite dev imposta ELECTRON_RENDERER_URL). */
  isDev?: boolean;
};

/**
 * L'URL da caricare, o `null` per il renderer nativo.
 *
 * Puro: nessun accesso a Electron o al filesystem, quindi è testabile da solo.
 */
export function resolveTargetUrl(input: ResolveTargetInput): string | null {
  if ((input.mode ?? "").trim().toLowerCase() === "native") return null;

  const explicit = (input.webUrl ?? "").trim();
  if (explicit) return explicit;

  if (input.isDev) return LOCAL_DEV_WEB_URL;
  return DEFAULT_WEB_URL;
}

/**
 * Gli URL di autenticazione devono restare DENTRO la finestra.
 *
 * Se il login parte nel browser di sistema, la sessione Supabase finisce nel
 * browser e non nel webview: l'app resterebbe fuori. Quindi gli URL di auth
 * vengono caricati nella finestra stessa (dove il cookie jar è quello
 * dell'app) e tutto il resto si apre nel browser di sistema.
 */
export function isAuthUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return (
      parsed.pathname.startsWith("/auth/v1/") ||
      parsed.pathname.startsWith("/auth/callback") ||
      parsed.hostname.endsWith(".supabase.co")
    );
  } catch {
    return false;
  }
}
