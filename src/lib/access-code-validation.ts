/**
 * Helper di confronto del codice di accesso: puri e client-safe.
 *
 * Perché è separato: è stato estratto da access-code.ts — che legge
 * `next/headers` per il cookie del gate — così moduli condivisi come
 * forms-security.ts (importati da client component) possono dare un feedback
 * immediato sull'input del codice senza trascinare codice server-only nel
 * bundle del browser.
 *
 * NOTA DI SICUREZZA
 * -----------------
 * Il controllo autorevole avviene SEMPRE lato server (POST /api/waitlist,
 * dove il codice viene confrontato QUI). ACCESS_CODE è un segreto server:
 * quando questo modulo finisce in un bundle del browser, `process.env.ACCESS_CODE`
 * viene sostituito con `undefined` e il confronto può corrispondere solo al
 * default generato qui sotto. È voluto: questi helper sono una comodità
 * client-side e il codice reale non arriva mai nel browser quando viene
 * sovrascritto per ambiente.
 */

// Codice di accesso generato (sostituibile via env var ACCESS_CODE per ambiente).
const DEFAULT_ACCESS_CODE = "T5PMY2R2";

/** Normalizza l'input digitato: taglia spazi, toglie separatori, ignora maiuscole. */
function normalize(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, "");
}

/** Il codice atteso per questo ambiente (l'env var vince sul default). */
function expectedCode(): string {
  return normalize(process.env.ACCESS_CODE ?? DEFAULT_ACCESS_CODE);
}

/**
 * Confronto case- e separatore-insensibile con il codice configurato.
 * Restituisce false per input mancanti o vuoti.
 */
export function isValidAccessCode(raw: string): boolean {
  if (!raw) return false;
  const normalized = normalize(raw);
  if (!normalized) return false;
  const expected = expectedCode();
  // Confronto a tempo quasi costante per evitare side-channel temporali banali
  // (un attaccante non deve poter indovinare il codice misurando i tempi).
  if (normalized.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < normalized.length; i++) {
    diff |= normalized.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
