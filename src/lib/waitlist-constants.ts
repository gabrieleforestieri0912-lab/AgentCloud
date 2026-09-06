// Costanti waitlist client-safe. Tenute separate da waitlist.ts (che include
// codice Supabase server-only) così la pagina waitlist — un client component —
// può importare il tetto senza trascinare codice server nel bundle del browser.
// Posti totali disponibili in waitlist (rispecchia il tetto gestito via DB ovunque).
export const MAX_SPOTS = 20;

// Cookie di accesso alla piattaforma. Viene impostato lato server SOLO quando
// il visitatore valida il codice di accesso (vedi src/lib/access-code.ts) e fa
// superare il gate della waitlist ai possessori — al posto del vecchio flusso
// con email admin. Il nome è condiviso qui perché deve essere leggibile sia
// lato server (proxy, route handler, server component) sia lato client
// (WaitlistForm, Navbar).
export const ACCESS_COOKIE = "ac_access";

/**
 * Solo client: dice se il browser corrente possiede il cookie di accesso alla
 * piattaforma. Protetto così può essere importato anche da codice server
 * (in quel caso restituisce false). Non rivela mai il codice di accesso —
 * verifica solo la presenza della concessione.
 */
export function hasAccessOnClient(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((entry) => entry === `${ACCESS_COOKIE}=1`);
}