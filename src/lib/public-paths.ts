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
  "/",
  "/demo",
  "/agents",
  "/a", // pagine chat pubbliche dell'agente
  "/agent", // pagine chat pubbliche dell'agente (stessa superficie di anteprima di /a)
  "/login",
  "/signup",
  "/reset-password",
  "/auth/callback", // destinazione del redirect Supabase PKCE / OAuth
  // Google OAuth — raggiungibile senza sessione così il flusso termina sempre
  // in un redirect leggibile (?google=error&reason=...) invece che in un 401
  // spoglio. /connect richiede comunque la sessione; /callback è protetto
  // dallo stato CSRF (nonce cookie + user_id) verificato dentro l'handler.
  "/api/auth/google",
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
  // Admin API — autenticata con `Authorization: Bearer <ADMIN_API_TOKEN>`
  // dentro l'handler (nessuna sessione richiesta: il chiamante è uno script/server).
  "/api/admin/tenants",
  // Endpoint API pubblici
  "/api/billing/payment-link",
  "/api/embed",
  "/api/chat",
  "/api/agent/run",
  "/api/demo/request",
  "/api/waitlist",
  "/api/contact",
  "/api/sitemap",
];

// Match con prefisso stretto: un path è pubblico quando è uguale a un prefisso
// o inizia con "prefisso/" (così "/contact" non fa passare mai "/contacts-admin").
// "/" corrisponde solo a se stesso.
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((prefix) =>
    prefix === "/"
      ? pathname === "/"
      : pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}
