/**
 * Finestra e soglie del freemium (pure, senza DB): 5 messaggi gratuiti al
 * giorno in totale, su tutti gli agenti, con reset alla mezzanotte UTC.
 * Testabile con `node --experimental-strip-types` (vedi tests/free-limit).
 *
 * IL NUMERO È CONFIGURABILE (`FREE_MESSAGES_PER_DAY`): il free tier è una
 * scelta di business e il suo costo (5 run al giorno per utente, tra ~5k e
 * ~17k token a seconda della superficie) va poter tarare senza deploy.
 * Il default resta 5.
 *
 * Nota: questo modulo è importato solo lato server (route e lib billing):
 * lì `process.env` esiste davvero. Se un domani lo importasse in un
 * componente client, il valore cadrebbe sul default — comportamento
 * comunque corretto (il client non decide mai il limite).
 */

const configured = Number(process.env.FREE_MESSAGES_PER_DAY);

export const FREE_MESSAGES_PER_DAY =
  Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 5;
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
