/**
 * Controllo accesso admin server-only per AgentCloud.
 *
 * MODELLO DI SICUREZZA
 * --------------------
 * Lo stato di admin deriva SOLO dall'email della sessione Supabase autenticata
 * (verificata lato server tramite il JWT della sessione). Non viene MAI preso
 * dal body della richiesta, dalla query string, da cookie diversi dalla
 * sessione auth o da qualsiasi valore fornito dal client — altrimenti
 * chiunque potrebbe auto-nominarsi admin inviando una semplice email nota
 * (es. all'endpoint pubblico della waitlist).
 *
 * La lista delle email admin vive nella variabile d'ambiente `ADMIN_EMAILS`
 * (separate da virgola). È un segreto server (NON `NEXT_PUBLIC_*`) quindi non
 * viene mai iniettato nel bundle client. Se non impostata, ripiega
 * sull'indirizzo del proprietario del progetto.
 *
 * Questo modulo va importato solo da codice server (route handler, server
 * component, server action).
 */

const DEFAULT_ADMIN_EMAIL = "gabriele.forestieri0912@gmail.com";

/**
 * Risolve le email admin in whitelist (minuscole, senza spazi, deduplicate).
 * Ripiega sul proprietario del progetto quando `ADMIN_EMAILS` non è configurata.
 */
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return [DEFAULT_ADMIN_EMAIL];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

/**
 * Verifica case- e spazio-insensibile contro le email admin in whitelist.
 * Restituisce false per input mancanti/vuoti — una sessione nulla non può
 * mai essere admin.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return getAdminEmails().includes(normalized);
}

