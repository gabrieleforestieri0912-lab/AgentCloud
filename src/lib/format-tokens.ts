/**
 * Formattazione dei numeri di token per la UI.
 *
 * I token si leggono male grezzi ("1000000" non è un numero che l'utente
 * capisce al volo): qui si compattono in "212k" / "1.0M". Condiviso fra
 * dashboard e chat così il budget mostra sempre gli stessi numeri.
 */
export function formatTokens(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}
