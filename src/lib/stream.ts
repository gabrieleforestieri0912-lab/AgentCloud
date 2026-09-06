/**
 * Word-by-word SSE emitter.
 *
 * The LLM providers stream text deltas as they are generated, but those
 * deltas can be large or arrive in bursts (a whole paragraph at once). This
 * helper re-emits the text one word at a time on a small timer so every chat
 * UI shows the assistant "typing" its answer instead of the full message
 * appearing in a single jump.
 *
 * Server-only. Words are split on whitespace so markdown tokens like `**bold**`
 * stay intact.
 */

const WORD_DELAY_MS = 30;

export type WordEmitter = {
  /** Queue text as it arrives from the provider (any size, any chunking). */
  push(chunk: string): void;
  /** Resolve once every queued word has been emitted (before sending `done`). */
  flush(): Promise<void>;
  /** Drop any pending words (used on error paths). */
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
      // The consumer closed the stream mid-emission (e.g. the client
      // disconnected from the SSE response). Stop permanently: no more timer
      // callbacks and no more queueing — otherwise the throw escapes the
      // timer callback as an uncaughtException.
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
