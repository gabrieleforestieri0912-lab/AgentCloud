/**
 * Valida la destinazione di redirect `next` ricevuta da un parametro query.
 *
 * Perché esiste: dopo il login l'utente viene rispedito a una pagina (`?next=`);
 * senza validazione un attaccante potrebbe trasformare il redirect in un
 * "open redirect" verso un sito malevolo. Sono accettati SOLO percorsi
 * relativi same-origin; vengono rifiutati URL assoluti (https://...), URL
 * protocol-relative (//...), trucchi con backslash (/\\...) e path traversal
 * (..).
 */
export function isSafeRedirectPath(next: string | null): boolean {
  if (!next) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (next.includes("\\")) return false;
  // Reject traversal segments like /../ or /../
  if (next.split("/").includes("..")) return false;
  return true;
}
