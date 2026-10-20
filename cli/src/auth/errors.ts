/** Errori dedicati dei flussi di login, riconosciuti dalla TUI per l'UX. */

/** Timeout in attesa del callback del browser (default 5 minuti). */
export class CallbackTimeoutError extends Error {
  constructor() {
    super("Tempo scaduto in attesa del browser (5 minuti).");
    this.name = "CallbackTimeoutError";
  }
}

/** End-to-end: nessun browser apribile o porta non raggiungibile. */
export class HeadlessFallbackRecommended extends Error {
  constructor() {
    super("Nessun browser disponibile: uso il device flow.");
    this.name = "HeadlessFallbackRecommended";
  }
}
