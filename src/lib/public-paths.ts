/**
 * Matcher delle rotte pubbliche usato dal proxy (src/proxy.ts).
 *
 * Perché esiste: il proxy deve far passare (senza sessione) le pagine e le API
 * pubbliche e bloccare il resto. Il modulo è puro (nessuna dipendenza) così la
 * logica di protezione delle rotte è testabile in isolamento.
 *
 * Nota: `/api/agent/run` è raggiungibile senza sessione perché le pagine
 * agente pubbliche (`/a/[...]`, `/agent/[...]`) e gli embed devono poter
 * eseguire anteprime; però il route handler risolve comunque il chiamante
 * dalla sessione Supabase e applica i limiti di abbonamento/uso per gli
 * utenti autenticati.
 */
export const PUBLIC_PATHS = [
  // Pagine marketing / pubbliche
  // Home, vetrina e pagine legali devono essere consultabili senza login:
  // sono la superficie che Google controlla durante la verifica OAuth (la
  // home non può trovarsi dietro un redirect a /login) e che i motori di
  // ricerca indicizzano (vedi anche sitemap.ts / robots.ts).
  "/",
  "/about",
  "/mobile",
  "/integrations",
  "/agents",
  // Catalogo Competenze: pagina pubblica e indicizzabile come /agents.
  "/skills",
  // Guida "Crea la tua competenza in 10 minuti": pubblica come /skills, da cui
  // arriva il template SKILL.md.
  "/docs",
  "/a", // pagine chat pubbliche dell'agente
  "/agent", // pagine chat pubbliche dell'agente (stessa superficie di anteprima di /a)
  "/login",
  "/signup",
  "/reset-password",
  "/reset",
  "/auth/callback", // destinazione del redirect Supabase PKCE / OAuth
  // Google OAuth — raggiungibile senza sessione così il flusso termina sempre
  // in un redirect leggibile (?google=error&reason=...) invece che in un 401
  // spoglio. /connect richiede comunque la sessione; /callback è protetto
  // dallo stato CSRF (nonce cookie + user_id) verificato dentro l'handler.
  "/api/auth/google",
  "/api/auth/google/callback",
  "/waitlist",
  "/contact",
  "/bundles",
  "/privacy",
  "/terms",
  "/refunds",
  // Webhook (chiamati da terze parti)
  "/api/email/webhook",
  "/api/email/send",
  "/api/whatsapp/webhook",
  "/api/billing/webhook",
  // Cron notifiche scadenza (Vercel Cron): self-authenticato dentro l'handler
  // con `Authorization: Bearer $CRON_SECRET` / `$ADMIN_API_TOKEN`, quindi deve
  // essere raggiungibile senza sessione utente.
  "/api/billing/notify-expiring",
  // Admin API — autenticata con `Authorization: Bearer <ADMIN_API_TOKEN>`
  // dentro l'handler (nessuna sessione richiesta: il chiamante è uno script/server).
  "/api/admin/tenants",
  "/api/admin/integrations",
  // Endpoint API pubblici
  "/api/billing/payment-link",
  "/api/embed",
  "/api/chat",
  "/api/agent/run",
  "/api/extension/session",
  "/api/user/usage",
  "/api/waitlist",
  "/api/contact",
  "/api/sitemap",
  // Catalogo Competenze: lettura e download sono pubblici (la pagina
  // /skills è pubblica e i link "Scarica .zip" devono funzionare senza
  // sessione). Le skill UTENTE restano private: le API filtrano per
  // `account_id` e rispondono 404 alle altre. Scrittura/installazione
  // (`/api/agents/[id]/skills`) NON è in elenco e resta protetta.
  "/api/plugins",
  "/api/skills",
  // Integrazioni OAuth callbacks & Webhooks (accessibili senza sessione affinché terze parti possano completare l'handshake o inviare eventi)
  "/api/integrations",
  "/api/shopify/callback",
  "/api/shopify/webhooks",
  "/api/shopify/install",
  "/api/shopify/status",
  // Webhook di conformità Shopify (chiamati da Shopify, senza sessione)
  "/api/webhooks/shopify",
];

/**
 * Rotte pubbliche percorse ESATTE (non prefissi).
 *
 * Perché servono: sotto `/api/agents` ci sono sia rotte pubbliche di
 * catalogo (`[id]/recommended-plugins`) sia rotte che scrivono e richiedono
 * sessione (`[id]/skills` = installa/disinstalla). Il match a prefisso
 * aprirebbe anche le seconde, quindi queste eccezioni sono esplicite.
 */
const PUBLIC_EXACT_PATHS = new Set([
  // Plugin consigliati per un agente: dato di catalogo, come /api/plugins.
  /^\/api\/agents\/[a-z0-9-]+\/recommended-plugins$/,
]);

/** True se il path è in una delle eccezioni esatte. */
function isPublicExactPath(pathname: string): boolean {
  for (const pattern of PUBLIC_EXACT_PATHS) {
    if (pattern.test(pathname)) return true;
  }
  return false;
}

// Match con prefisso stretto: un path è pubblico quando è uguale a un prefisso
// o inizia con "prefisso/" (così "/contact" non fa passare mai "/contacts-admin").
// "/" corrisponde solo a se stesso.
export function isPublicPath(pathname: string): boolean {
  // File di verifica proprietà del dominio per Google Search Console / OAuth
  if (/^\/google[a-z0-9]+\.html$/.test(pathname)) {
    return true;
  }
  if (isPublicExactPath(pathname)) return true;
  return PUBLIC_PATHS.some((prefix) =>
    prefix === "/"
      ? pathname === "/"
      : pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

