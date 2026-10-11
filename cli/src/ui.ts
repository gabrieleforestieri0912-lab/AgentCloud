/**
 * Colori ANSI senza dipendenze (niente chalk/ink da installare).
 *
 * Si spengono da soli quando l'output non è un terminale (pipe, script) o con
 * `NO_COLOR=1`: l'output resta pulito e parsabile fuori dal terminale.
 * Solo ASCII nei testi: i blocchi Unicode su alcuni terminali Windows si
 * rompono, i colori ANSI invece funzionano ovunque.
 *
 * Il selettore con frecce vive in `tui/select.ts` (componente TUI): qui solo
 * primitive condivise anche dal percorso classico non interattivo.
 */
const USE_COLOR = !process.env.NO_COLOR && Boolean(process.stdout.isTTY);

function paint(code: string, text: string): string {
  return USE_COLOR ? `\x1b[${code}m${text}\x1b[0m` : text;
}

export const bold = (t: string): string => paint("1", t);
export const dim = (t: string): string => paint("2", t);
export const red = (t: string): string => paint("31", t);
export const green = (t: string): string => paint("32", t);
export const yellow = (t: string): string => paint("33", t);
export const blue = (t: string): string => paint("34", t);
export const magenta = (t: string): string => paint("35", t);
export const cyan = (t: string): string => paint("36", t);

/** Riga divisoria tenue. */
export function hr(width = 56): string {
  return dim("-".repeat(width));
}
