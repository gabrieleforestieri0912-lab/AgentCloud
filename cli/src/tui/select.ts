import readline from "node:readline";
import readlinePromises from "node:readline/promises";
import { bold, cyan, dim, green } from "../ui.js";

export type SelectOption<T> = { label: string; hint?: string; value: T };

/**
 * Scelta da elenco: frecce + Invio su terminale interattivo, elenco numerato
 * quando l'input è ridiretto (pipe, CI). Esc annulla con errore leggibile.
 *
 * Nota: qui i tasti arrivano dai keypress raw di Node (`readline`), dove
 * `key.name` esiste davvero ("up", "return", …) — diverso dalla `Key` di Ink
 * usata dentro la TUI, che invece non ce l'ha.
 */
export async function select<T>(message: string, options: SelectOption<T>[]): Promise<T> {
  if (options.length === 0) throw new Error("Nessuna opzione disponibile.");
  if (!process.stdin.isTTY || !process.stdout.isTTY) return selectNumbered(message, options);
  return selectInteractive(message, options);
}

/** Fallback non interattivo: stampa 1..N e legge il numero. */
async function selectNumbered<T>(message: string, options: SelectOption<T>[]): Promise<T> {
  console.log(bold(message));
  options.forEach((o, i) => {
    console.log(`  ${i + 1}) ${o.label}${o.hint ? dim(` — ${o.hint}`) : ""}`);
  });
  const rl = readlinePromises.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Scelta [1-${options.length}]: `);
  rl.close();
  const n = Number.parseInt(answer.trim(), 10);
  if (!Number.isInteger(n) || n < 1 || n > options.length) {
    throw new Error(`Scelta non valida: "${answer.trim()}". Scegli un numero da 1 a ${options.length}.`);
  }
  return options[n - 1].value;
}

/** Picker interattivo con frecce: ridisegna la lista a ogni movimento. */
async function selectInteractive<T>(message: string, options: SelectOption<T>[]): Promise<T> {
  const rows = options.length;
  return new Promise<T>((resolve, reject) => {
    const stdin = process.stdin;
    let index = 0;

    const render = (): string => {
      let out = `${bold(message)} ${dim("(frecce + Invio, Esc per annullare)")}\n`;
      options.forEach((o, i) => {
        const marker = i === index ? cyan(">") : " ";
        const label = i === index ? bold(o.label) : o.label;
        // "\x1b[K" pulisce la riga: passando a voci più corte non restano scorie.
        out += `${marker} ${label}${o.hint ? dim(` — ${o.hint}`) : ""}\x1b[K\n`;
      });
      return out;
    };

    const cleanup = (): void => {
      try {
        stdin.setRawMode?.(false);
      } catch {
        // terminale già chiuso
      }
      stdin.pause();
      stdin.removeListener("keypress", onKeypress);
    };

    const repaint = (): void => {
      // Il cursore è sulla riga vuota sotto il blocco: risali e riscrivi.
      process.stdout.write(`\x1b[${rows + 1}A`);
      process.stdout.write(render());
    };

    const onKeypress = (_ch: unknown, key?: { name?: string; ctrl?: boolean }): void => {
      if (!key) return;
      if (key.name === "up") {
        index = (index + rows - 1) % rows;
        repaint();
      } else if (key.name === "down") {
        index = (index + 1) % rows;
        repaint();
      } else if (key.name === "return" || key.name === "enter") {
        cleanup();
        process.stdout.write(`${green("ok")} ${options[index].label}\n`);
        resolve(options[index].value);
      } else if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        cleanup();
        process.stdout.write("\nSelezione annullata.\n");
        reject(new Error("Selezione annullata."));
      }
      // Qualsiasi altro tasto: ignorato, la lista resta dov'è.
    };

    process.stdout.write(render());
    readline.emitKeypressEvents(stdin);
    try {
      stdin.setRawMode?.(true);
    } catch {
      // raw mode non disponibile: ripiega sull'elenco numerato
      cleanup();
      selectNumbered(message, options).then(resolve, reject);
      return;
    }
    stdin.resume();
    stdin.on("keypress", onKeypress);
  });
}
