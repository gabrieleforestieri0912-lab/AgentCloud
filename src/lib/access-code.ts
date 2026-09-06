/**
 * Controllo del codice di accesso (server-only) per AgentCloud.
 *
 * MODELLO DI SICUREZZA
 * --------------------
 * Durante la fase waitlist la piattaforma è bloccata. L'ingresso è concesso
 * tramite un UNICO codice di accesso (non via email): chi invia il codice
 * valido dalla pagina waitlist riceve il cookie `ac_access`, impostato lato
 * server in POST /api/waitlist dopo che il codice è stato verificato con
 * `isValidAccessCode` (src/lib/access-code-validation.ts — confronto puro,
 * client-safe). Il proxy fa poi passare i possessori del cookie attraverso il
 * gate della waitlist e tratta ogni agente — compresi quelli "in arrivo" —
 * come pienamente disponibile.
 *
 * Il codice vive nella variabile d'ambiente `ACCESS_CODE` (segreto server,
 * NON `NEXT_PUBLIC_*`), con fallback su un default generato così la piattaforma
 * funziona subito. Questo modulo va importato SOLO da codice server: legge
 * `next/headers`, e importarlo da un client component trascinerebbe codice
 * server-only nel bundle del browser.
 */

import { cookies } from "next/headers";
import { ACCESS_COOKIE } from "./waitlist-constants";

/**
 * Server-only: dice se la richiesta corrente possiede già la concessione di
 * accesso (il cookie `ac_access`). Chiamabile da server component e route
 * handler; mai da codice client.
 */
export async function hasPlatformAccess(): Promise<boolean> {
  try {
    const store = await cookies();
    return store.get(ACCESS_COOKIE)?.value === "1";
  } catch {
    // cookies() non è disponibile in alcuni contesti edge — il rendering non deve mai fallire.
    return false;
  }
}
