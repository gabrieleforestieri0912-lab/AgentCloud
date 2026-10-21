/**
 * Modalità Ghost (chat incognito).
 *
 * Una chat fantasma è una conversazione che non lascia traccia:
 *   - non viene scritta in localStorage (cronologia, bozze, conversazione attiva);
 *   - non viene inviata al backend con dati da conservare: la richiesta porta
 *     `ephemeral: true` e il server non salva messaggi, titoli, file, embedding
 *     o notifiche;
 *   - non genera log di conversazione né attivazioni di skill (analytics).
 *
 * Questo modulo contiene solo funzioni PURE (niente React, niente browser):
 * è il punto unico in cui si decide "questa conversazione si persiste sì/no".
 * Tutti i canali di persistenza della chat passano da qui, così la regola
 * vale ovunque e non solo dove ci si è ricordati di controllarla.
 *
 * Il file è importabile anche dal server: nessun `window`, nessun `document`.
 */

/**
 * Flag inviato nelle richieste di chat per segnalare una run effimera.
 * Il backend lo usa per NON scrivere nulla (vedi /api/chat e /api/agent/run).
 */
export const GHOST_REQUEST_FLAG = "ephemeral" as const;

/** Sottinsieme della conversazione che basta per decidere la persistenza. */
export type MaybeEphemeral = {
  id: string;
  /** true = chat fantasma: mai persistita. */
  ephemeral?: boolean;
};

/**
 * True se la conversazione è una chat fantasma.
 *
 * La fonte di verità è il flag sulla conversazione, NON lo stato globale della
 * UI: se i due divergono, vince il dato (una conversazione marcata fantasma
 * non viene mai scritta).
 */
export function isEphemeralConversation(
  conv: MaybeEphemeral | null | undefined,
): boolean {
  return Boolean(conv?.ephemeral);
}

/**
 * Filtro unico per la persistenza della cronologia: tiene solo le
 * conversazioni che NON sono fantasma.
 *
 * Usato dal codice che scrive `CHAT_HISTORY_KEY`: la cronologia salvata non
 * contiene mai una chat ghost, quindi al reload non ricompare.
 */
export function persistableConversations<T extends MaybeEphemeral>(
  conversations: readonly T[],
): T[] {
  return conversations.filter((c) => !isEphemeralConversation(c));
}

/** Id delle conversazioni fantasma presenti nella lista. */
export function ephemeralConversationIds<T extends MaybeEphemeral>(
  conversations: readonly T[],
): Set<string> {
  return new Set(
    conversations.filter((c) => isEphemeralConversation(c)).map((c) => c.id),
  );
}

/**
 * Aggiunge il flag `ephemeral: true` al corpo di una richiesta di chat quando
 * la conversazione è fantasma. Per le chat normali il corpo resta identico a
 * prima (nessun flag → il server si comporta come sempre).
 */
export function withEphemeralFlag<T extends Record<string, unknown>>(
  body: T,
  isEphemeral: boolean,
): T & { ephemeral?: true } {
  return isEphemeral ? { ...body, [GHOST_REQUEST_FLAG]: true as const } : body;
}
