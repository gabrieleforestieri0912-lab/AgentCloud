/**
 * Stima delle righe occupate da un testo a una data larghezza.
 *
 * Serve al viewport della chat: Ink non misura il contenuto renderizzato,
 * quindi per mostrare la coda della conversazione in un'area ad altezza fissa
 * calcoliamo quante righe occupa ogni messaggio e tagliamo dalla testa.
 * Stima per difetto sui caratteri wide (CJK): accettabile per la v1, il taglio
 * avviene sempre tra messaggi interi, mai a metà di uno.
 */
export function estimateLines(text: string, width: number): number {
  const w = Math.max(10, width);
  let lines = 0;
  for (const line of text.split("\n")) {
    lines += Math.max(1, Math.ceil(line.length / w));
  }
  return lines;
}

/**
 * Quanti messaggi (dalla coda) stanno nel budget di righe.
 * Ritorna l'indice da cui mostrare: `messages.slice(startIndex)`.
 */
export function visibleFromEnd(lengths: number[], budget: number): number {
  let used = 0;
  let i = lengths.length;
  while (i > 0 && used + lengths[i - 1] <= budget) {
    used += lengths[i - 1];
    i--;
  }
  return i;
}
