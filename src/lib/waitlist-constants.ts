// Costanti waitlist client-safe (nessuna dipendenza: le importano anche
// componenti client e il proxy).
export const MAX_SPOTS = 20;

/**
 * Istante di lancio della piattaforma: 15 settembre 2026, 16:00 ora italiana.
 *
 * L'offset è esplicito di proposito: senza di esso `new Date(...)` verrebbe
 * interpretato nel fuso dell'ambiente (UTC sul server, fuso dell'utente nel
 * browser) e il conto alla rovescia finirebbe in un momento diverso da quello
 * in cui il proxy chiude /waitlist. Con l'offset server e client sono
 * d'accordo sullo stesso istante.
 */
export const LAUNCH_AT = "2026-09-15T16:00:00+02:00";

/** True quando l'istante di lancio è stato raggiunto (default: adesso). */
export function hasLaunched(now: number = Date.now()): boolean {
  return now >= new Date(LAUNCH_AT).getTime();
}
