/**
 * Finestra e soglie del freemium (pure, senza DB): 5 messaggi gratuiti al
 * giorno in totale, su tutti gli agenti, con reset alla mezzanotte UTC.
 * Testabile con `node --experimental-strip-types` (vedi tests/free-limit).
 */

export const FREE_MESSAGES_PER_DAY = 5;
/** Alias storico, tenuto per compatibilità: il limite è giornaliero totale. */
export const FREE_MESSAGES_PER_AGENT = FREE_MESSAGES_PER_DAY;

/** Mezzanotte UTC del giorno corrente (inizio finestra giornaliera). */
export function dayStartUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Istante del prossimo reset (mezzanotte UTC successiva). La UI lo mostra in ora locale. */
export function getNextResetAt(now = new Date()): Date {
  return new Date(dayStartUTC(now).getTime() + 24 * 60 * 60 * 1000);
}

export function getRemainingFreeMessages(used: number): number {
  return Math.max(0, FREE_MESSAGES_PER_DAY - used);
}

export function hasReachedFreeLimit(used: number): boolean {
  return used >= FREE_MESSAGES_PER_DAY;
}
