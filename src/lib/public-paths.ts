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
  // Catalogo Competenze: pagine pubbliche e indicizzabili come /agents
  // (singole skill e pacchetti sono due sezioni autonome).
  "/skills",
  "/plugins",
  // Pagine dedicate a ogni client (CLI, estensione, desktop): marketing come
  // le altre pagine pubbliche, il login serve solo dentro l'app. `/mobile` è
  // qui sopra.
  // `/apps` è l'indice "App ed estensioni" linkato da home, navbar e footer:
  // era rimasta fuori da questo elenco, quindi da utente anonimo finiva in un
  // redirect a /login.
  "/apps",
  // Pannello dell'app dentro l'amministratore Shopify: Shopify lo incapsula
  // in un iframe e lo apre per il merchant, che potrebbe non avere un
  // account AgentCloud. Deve quindi essere raggiungibile senza sessione.
  "/shopify",
  // `/install` non è più una pagina: la pagina "generale" è stata eliminata
  // e ogni client ha la sua. Resta nell'elenco solo perché il redirect a
  // /apps deve poter partire anche per un utente anonimo (senza, il proxy
  // manderebbe a /login invece che alla destinazione).
  "/install",
  "/cli",
  "/extension",
  "/desktop",
  // Pagine di dettaglio delle funzionalità (link "Vedi dettagli" in home).
  "/features",
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
  // Immagini social dinamiche di Next (og:image / twitter:image): i crawler
  // (Facebook, LinkedIn, Slack…) le chiedono SENZA sessione — con un redirect
  // a /login le anteprime dei link restano senza immagine. Le varianti sotto
  // prefissi già pubblici (/bundles/…) passano comunque da lì.
  "/opengraph-image",
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
  // Anteprime video YouTube delle bolle chat: ponte server verso l'oEmbed di
  // YouTube (nessun dato privato, solo metadati pubblici). Deve rispondere
  // anche alle chat pubbliche /a/..., che rendono markdown senza sessione.
  "/api/youtube",
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
  // API della CLI (`agentcloud`): il login via browser e il device flow
  // devono poter parlare col sito SENZA sessione del sito (la CLI non ha
  // cookie). L'autenticazione la fa il route handler stesso:
  // - /api/cli/authorize e /api/cli/device/approve verificano l'access_token
  //   Supabase passato nel body contro l'API Supabase;
  // - /api/cli/token verifica firma HMAC + PKCE + scadenza del code;
  // - /api/cli/device e /api/cli/device/token sono il polling del device flow.
  "/api/cli",
  // Pagina di approvazione del device login (SSH/headless): deve essere
  // raggiungibile da anonimo, altrimenti reindirizza a /login e la CLI non
  // riceve mai l'approvazione.
  "/device",
  // Integrazioni OAuth callbacks & Webhooks (accessibili senza sessione affinché terze parti possano completare l'handshake o inviare eventi)
  "/api/integrations",
  // Callback OAuth dei server MCP: ci arriva il redirect del provider, che
  // non ha sessione AgentCloud ma torna con il codice e lo `state`. Il
  // route handler verifica comunque sessione + `state` + riga della
  // connessione prima di scambiare il codice: renderlo raggiungibile dal
  // proxy non toglie nessun controllo, evita solo che il redirect del
  // provider finisca in un 401 spoglio.
  "/api/mcp/callback",
  // Avvio del flusso OAuth dei server MCP: senza sessione rimanda a
  // /login?next=… invece di rispondere 401. La route verifica comunque la
  // sessione prima di costruire l'authorize URL.
  "/api/mcp/authorize",
  "/api/shopify/callback",
  "/api/shopify/webhooks",
  "/api/shopify/install",
  "/api/shopify/status",
  // Sessione dell'app incapsulata: la chiama il pannello dentro l'admin
  // Shopify e si autentica con il session token firmato da Shopify, non con
  // i cookie del browser. Per questo può rispondere senza sessione AgentCloud.
  "/api/shopify/session",
  // Webhook di conformità Shopify (chiamati da Shopify, senza sessione)
  "/api/webhooks/shopify",
];

/**
 * Rotte pubbliche percorse ESATTE (non prefissi).
 *
 * Perché servono: sotto `/api/agents` ci sono sia rotte pubbliche di
 * catalogo sia rotte che scrivono e richiedono sessione
 * (`[id]/skills` = installa/disinstalla). Il match a prefisso
 * aprirebbe anche le seconde, quindi queste eccezioni sono esplicite.
 * (Attualmente vuoto: riservato per future rotte catalogo pubbliche.)
 */
const PUBLIC_EXACT_PATHS: RegExp[] = [];

/**
 * Sotto-rotte che restano PROTETTE anche quando il loro prefisso è pubblico.
 *
 * Perché servono: `/cli` è la pagina marketing della CLI (pubblica), ma
 * `/cli/auth` consegna il token Supabase alla CLI in ascolto su 127.0.0.1 e
 * deve continuare a richiedere una sessione, esattamente come faceva prima
 * che `/cli` entrasse in PUBLIC_PATHS.
 */
const PROTECTED_UNDER_PUBLIC: RegExp[] = [/^\/cli\/auth(\/|$)/];

/** True se il path è in una delle eccezioni esatte. */
function isPublicExactPath(pathname: string): boolean {
  for (const pattern of PUBLIC_EXACT_PATHS) {
    if (pattern.test(pathname)) return true;
  }
  return false;
}

/** True se il path è un'eccezione protetta dentro un prefisso pubblico. */
function isProtectedUnderPublic(pathname: string): boolean {
  return PROTECTED_UNDER_PUBLIC.some((pattern) => pattern.test(pathname));
}

// Match con prefisso stretto: un path è pubblico quando è uguale a un prefisso
// o inizia con "prefisso/" (così "/contact" non fa passare mai "/contacts-admin").
// "/" corrisponde solo a se stesso.
export function isPublicPath(pathname: string): boolean {
  // File di verifica proprietà del dominio per Google Search Console / OAuth
  if (/^\/google[a-z0-9]+\.html$/.test(pathname)) {
    return true;
  }
  // Le eccezioni protette vincono sul prefisso pubblico (vedi sopra).
  if (isProtectedUnderPublic(pathname)) return false;
  if (isPublicExactPath(pathname)) return true;
  return PUBLIC_PATHS.some((prefix) =>
    prefix === "/"
      ? pathname === "/"
      : pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

