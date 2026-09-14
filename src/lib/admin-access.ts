/**
 * Controllo accesso admin server-only per AgentCloud.
 *
 * MODELLO DI SICUREZZA
 * --------------------
 * Un utente e' admin se vale ALMENO UNA delle due condizioni:
 *
 *   1. la sua email sta in `ADMIN_EMAILS` (variabile d'ambiente server, mai
 *      `NEXT_PUBLIC_*`, quindi non finisce mai nel bundle del browser);
 *   2. il suo `profiles.role` nel database vale 'admin'.
 *
 * La seconda condizione serve al dopo-lancio: prima del lancio l'unico modo per
 * entrare era il codice di accesso, quindi gli account che hanno davvero
 * effettuato l'accesso sono stati promossi a 'admin' una volta per tutte dalla
 * migrazione `supabase/schema-admin-role.sql`. La prima condizione serve invece
 * a promuovere i futuri admin senza toccare il database a mano.
 *
 * Lo stato admin viene SEMPRE risolto lato server dalla sessione autenticata
 * (utente restituito da Supabase Auth) e MAI dal body della richiesta, dalla
 * query string o da altri cookie: altrimenti chiunque potrebbe autoproclamarsi
 * admin inviando una email nota (es. dall'endpoint pubblico della waitlist).
 *
 * La scrittura di `profiles.role` e' riservata al service role: la stessa
 * migrazione revoca ai ruoli `anon`/`authenticated` il privilegio di UPDATE
 * sulla colonna `role`, quindi un utente non puo' autopromuoversi via REST.
 *
 * Questo modulo va importato solo da codice server (route handler, server
 * component, proxy). E' compatibile con il runtime Edge: non usa `fs`.
 */
import { createAdminClient } from "@/lib/supabase/admin";

/** Valore di `profiles.role` che identifica un admin. */
export const ADMIN_ROLE = "admin";

let warnedMissingAdminEmails = false;

/**
 * Normalizza una lista di email separate da virgola: trim, minuscole,
 * deduplicate, voci vuote scartate.
 */
export function parseAdminEmails(raw?: string | null): string[] {
  if (!raw) return [];
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
 * Email admin in whitelist, lette da `ADMIN_EMAILS` a ogni chiamata (cosi' i
 * test e un eventuale cambio di env non richiedono un riavvio del modulo).
 * Nessun fallback hardcodato: se la variabile manca la whitelist e' vuota e
 * restano admin solo gli account con `profiles.role = 'admin'`.
 */
export function getAdminEmails(): string[] {
  const list = parseAdminEmails(process.env.ADMIN_EMAILS);
  if (list.length === 0 && !warnedMissingAdminEmails) {
    warnedMissingAdminEmails = true;
    console.warn(
      "[admin] ADMIN_EMAILS non configurata: nessuna email verra' promossa ad admin. Gli account gia' promossi restano admin tramite profiles.role.",
    );
  }
  return list;
}

/**
 * Verifica case- e spazio-insensibile contro le email admin in whitelist.
 * Restituisce false per input mancanti/vuoti: una sessione nulla non puo' mai
 * essere admin.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}

/** True quando un valore di `profiles.role` identifica un admin. */
export function isAdminRole(role?: string | null): boolean {
  return typeof role === "string" && role.trim().toLowerCase() === ADMIN_ROLE;
}

/** Legge `profiles.role` con il service role. Null in caso di errore. */
async function readProfileRole(userId?: string | null): Promise<string | null> {
  if (!userId) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  try {
    const { data } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    return (data as { role?: string | null } | null)?.role ?? null;
  } catch {
    return null;
  }
}

/**
 * Server-only: l'utente e' admin? Prima la whitelist email (nessuna query:
 * percorso veloce per l'admin configurato), poi il ruolo nel database.
 */
export async function resolveIsAdmin(
  user?: { id?: string | null; email?: string | null } | null,
): Promise<boolean> {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  return isAdminRole(await readProfileRole(user.id));
}

/**
 * Id utenti la cui promozione e' fallita (es. migrazione non ancora eseguita:
 * il check di `profiles.role` rifiuta 'admin'). Evita di ritentare la stessa
 * scrittura a ogni navigazione finche' l'isolate non si ricicla.
 */
const failedGrantAttempts = new Set<string>();

/**
 * Promuove ad admin un'email in whitelist, con il service role.
 *
 * Idempotente: la clausola `neq` fa si' che la riga venga scritta solo se il
 * ruolo e' ancora diverso da 'admin', quindi accessi ripetuti non producono
 * scritture ne' errori. Non declassa mai nessuno: se un'email esce da
 * `ADMIN_EMAILS` il ruolo resta 'admin' (rimozione manuale via SQL).
 *
 * `currentRole` e' un'ottimizzazione per i chiamanti che hanno gia' letto il
 * profilo: se vale 'admin' non serve alcuna query.
 *
 * Restituisce true solo quando il ruolo e' stato effettivamente scritto.
 */
export async function ensureAdminRole(
  userId?: string | null,
  email?: string | null,
  currentRole?: string | null,
): Promise<boolean> {
  if (!userId || !isAdminEmail(email)) return false;
  if (isAdminRole(currentRole)) return false;
  if (failedGrantAttempts.has(userId)) return false;

  const admin = createAdminClient();
  if (!admin) return false;

  try {
    const { data, error } = await admin
      .from("profiles")
      .update({ role: ADMIN_ROLE })
      .eq("id", userId)
      .neq("role", ADMIN_ROLE)
      .select("id");

    if (error) {
      failedGrantAttempts.add(userId);
      console.warn(
        "[admin] promozione admin non riuscita (migrazione schema-admin-role.sql eseguita?):",
        error.message,
      );
      return false;
    }

    const granted = Array.isArray(data) && data.length > 0;
    if (granted) {
      // Audit minimo (email + timestamp) nei log server: niente tabella dedicata.
      console.info(
        "[admin] ruolo admin assegnato via ADMIN_EMAILS",
        JSON.stringify({ email: email?.toLowerCase(), at: new Date().toISOString() }),
      );
    }
    return granted;
  } catch {
    return false;
  }
}
