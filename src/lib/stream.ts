/**
 * Emettitore SSE parola per parola.
 *
 * Perché esiste: i provider LLM streammano delta di testo mentre lo generano,
 * ma quei delta possono essere grandi o arrivare a raffiche (anche un paragrafo
 * intero in un colpo solo). Questo helper ri-emette il testo una parola alla
 * volta con un piccolo timer, così ogni UI di chat mostra l'assistente che
 * "sta scrivendo" la risposta invece di farla comparire tutta in un salto.
 *
 * Server-only. Le parole vengono spezzate sugli spazi bianchi, così i token
 * markdown come `**grassetto**` restano intatti.
 */

const WORD_DELAY_MS = 30;

export type WordEmitter = {
  /** Accoda il testo appena arriva dal provider (qualsiasi dimensione/chunking). */
  push(chunk: string): void;
  /** Risolve quando tutte le parole in coda sono state emesse (prima del `done`). */
  flush(): Promise<void>;
  /** Scarta le parole in attesa (usato nei percorsi d'errore). */
  stop(): void;
};

export function createWordEmitter(onWord: (word: string) => void): WordEmitter {
  let queue: string[] = [];
  let timer: NodeJS.Timeout | null = null;
  let stopped = false;

  const emitNext = () => {
    const word = queue.shift();
    if (word === undefined) {
      timer = null;
      return;
    }
    try {
      onWord(word);
    } catch {
      // Il consumatore ha chiuso lo stream a metà emissione (es. il client si
      // è disconnesso dalla risposta SSE). Stop definitivo: niente più timer e
      // niente più accodamenti — altrimenti l'eccezione uscirebbe dal callback
      // del timer come uncaughtException.
      stopped = true;
      queue = [];
      timer = null;
      return;
    }
    timer = setTimeout(emitNext, WORD_DELAY_MS);
  };

  const ensureRunning = () => {
    if (!stopped && !timer && queue.length > 0) {
      timer = setTimeout(emitNext, WORD_DELAY_MS);
    }
  };

  return {
    push(chunk) {
      if (!chunk || stopped) return;
      const parts = chunk.match(/\s+|[^\s]+/g) ?? [chunk];
      queue.push(...parts);
      ensureRunning();
    },
    async flush() {
      while (!stopped && (queue.length > 0 || timer)) {
        await new Promise((resolve) => setTimeout(resolve, WORD_DELAY_MS + 5));
      }
    },
    stop() {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      queue = [];
    },
  };
}
