/**
 * Modulo di sicurezza e validazione per i Form di Autenticazione e la Waitlist.
 *
 * Questo modulo implementa difese in profondità (Defense in Depth) contro:
 * 1. Bot automatici e scraper (tramite campi trappola Honeypot).
 * 2. Iniezioni di caratteri malevoli, byte nulli e CRLF header/email injection.
 * 3. Tentativi di Stored XSS e script injection nei campi di testo.
 * 4. Denial of Service (DoS) crittografico tramite password di lunghezza smisurata.
 * 5. Attacchi a forza bruta (brute-force) e credential stuffing tramite throttling client-side.
 */

import { sanitizeHtml, detectPromptInjection } from "@/lib/security";
// Imported from the client-safe module (NOT from access-code.ts, which reads
// next/headers and must stay out of client bundles): this file is shared
// between server routes and client components (login/signup/waitlist forms).
import { isValidAccessCode } from "@/lib/access-code-validation";

/** Lunghezza massima consentita per un indirizzo email secondo la specifica RFC 5321 */
export const MAX_EMAIL_LENGTH = 254;

/** Lunghezza minima e massima consentita per le password */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

/** Lunghezza massima per il nome completo */
export const MAX_NAME_LENGTH = 80;

/** Nome standard del campo honeypot utilizzato nei form per identificare i bot */
export const HONEYPOT_FIELD_NAME = "website_hp";

/**
 * Regex standard conforme RFC per la verifica preliminare degli indirizzi email.
 * Rifiuta caratteri di controllo, ritorni a capo e byte nulli.
 */
const EMAIL_SAFE_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Verifica se un testo contiene caratteri di controllo non stampabili, byte nulli o sequenze CRLF.
 * Questi caratteri sono tipicamente usati per injection di intestazioni HTTP o email.
 *
 * @param text La stringa da analizzare
 * @returns true se il testo contiene sequenze sospette
 */
export function hasControlCharsOrNullBytes(text: string): boolean {
  // \0 (byte nullo), \r (carriage return), \n (newline) e caratteri ASCII di controllo 0x01-0x1F eccetto tab
  // eslint-disable-next-line no-control-regex
  return /[\x00-\x08\x0A-\x1F\x7F]/.test(text);
}

/**
 * Valida e sanitizza un indirizzo email o codice di accesso.
 *
 * Protegge da:
 * - Email smisurate (buffer overflow/DoS).
 * - Header/Email injection tramite byte nulli o newline.
 * - Script injection e tag HTML.
 *
 * @param rawEmail L'input grezzo fornito dall'utente o client
 * @param allowAccessCode Se true, accetta anche codici di accesso validi (es. per la waitlist)
 * @returns Esito della validazione con stringa pulita o messaggio d'errore
 */
export function validateAndSanitizeEmail(
  rawEmail: unknown,
  allowAccessCode: boolean = false,
): { valid: boolean; email?: string; isAccessCode?: boolean; error?: string } {
  if (typeof rawEmail !== "string") {
    return { valid: false, error: "Formato email non valido." };
  }

  const trimmed = rawEmail.trim();

  // Controllo presenza valore
  if (!trimmed) {
    return { valid: false, error: "L'indirizzo email è obbligatorio." };
  }

  // Verifica immediata codice di accesso (se consentito)
  if (allowAccessCode && isValidAccessCode(trimmed)) {
    return { valid: true, email: trimmed, isAccessCode: true };
  }

  // Controllo lunghezza massima secondo standard RFC 5321
  if (trimmed.length > MAX_EMAIL_LENGTH) {
    return {
      valid: false,
      error: `L'indirizzo email supera la lunghezza massima consentita (${MAX_EMAIL_LENGTH} caratteri).`,
    };
  }

  // Rilevamento byte nulli o caratteri di controllo malevoli
  if (hasControlCharsOrNullBytes(trimmed)) {
    return {
      valid: false,
      error: "Rilevati caratteri di controllo non ammessi nell'indirizzo email.",
    };
  }

  // Rilevamento tag HTML o script pericolosi
  if (/[<>"']/.test(trimmed)) {
    return {
      valid: false,
      error: "L'indirizzo email contiene caratteri o simboli non consentiti.",
    };
  }

  // Verifica formato con regex sicura
  if (!EMAIL_SAFE_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: "Inserisci un indirizzo email valido (es. nome@dominio.it).",
    };
  }

  // Controllo prompt injection su input anomali
  const injection = detectPromptInjection(trimmed);
  if (injection.detected) {
    return {
      valid: false,
      error: "Input non consentito: rilevata sequenza potenzialmente dannosa.",
    };
  }

  return {
    valid: true,
    email: trimmed.toLowerCase(),
    isAccessCode: false,
  };
}

/**
 * Valida la robustezza e sicurezza di una password.
 *
 * Protegge da:
 * - Denial of Service crittografico: stringhe enormi passate a funzioni di hashing
 *   come bcrypt o argon2 possono bloccare il thread di esecuzione della CPU.
 * - Password troppo brevi o deboli.
 * - Byte nulli o caratteri di controllo.
 *
 * @param rawPassword La password fornita dall'utente
 * @returns Esito della validazione
 */
export function validatePassword(rawPassword: unknown): {
  valid: boolean;
  error?: string;
} {
  if (typeof rawPassword !== "string") {
    return { valid: false, error: "Formato password non valido." };
  }

  if (rawPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `La password deve contenere almeno ${MIN_PASSWORD_LENGTH} caratteri.`,
    };
  }

  if (rawPassword.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `La password non può superare i ${MAX_PASSWORD_LENGTH} caratteri per motivi di sicurezza.`,
    };
  }

  // Byte nulli non sono ammessi
  if (rawPassword.includes("\0")) {
    return {
      valid: false,
      error: "La password contiene caratteri non ammessi.",
    };
  }

  return { valid: true };
}

/**
 * Valida e sanitizza il nome completo dell'utente in fase di registrazione.
 *
 * Protegge da:
 * - Stored XSS: rimuove tag HTML o script con sanitizeHtml.
 * - Lunghezze anomale.
 *
 * @param rawName Nome fornito dall'utente
 * @returns Esito con nome sanitizzato
 */
export function validateFullName(rawName: unknown): {
  valid: boolean;
  name?: string;
  error?: string;
} {
  if (rawName === undefined || rawName === null || rawName === "") {
    return { valid: true, name: undefined };
  }

  if (typeof rawName !== "string") {
    return { valid: false, error: "Formato nome non valido." };
  }

  const clean = sanitizeHtml(rawName.trim());

  if (clean.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `Il nome non può superare i ${MAX_NAME_LENGTH} caratteri.`,
    };
  }

  if (hasControlCharsOrNullBytes(clean)) {
    return {
      valid: false,
      error: "Il nome contiene caratteri di controllo non validi.",
    };
  }

  return { valid: true, name: clean };
}

/**
 * Verifica se un bot ha compilato il campo trappola (Honeypot).
 * I visitatori umani non vedono e non compilano questo campo; i bot automatizzati
 * scansionano il DOM e lo valorizzano, venendo immediatamente neutralizzati.
 *
 * @param payload Oggetto dei dati del form o body della richiesta
 * @returns true se il bot è caduto nella trappola
 */
export function isHoneypotTriggered(
  payload: Record<string, unknown> | null | undefined,
): boolean {
  if (!payload || typeof payload !== "object") return false;
  const honeypotVal = payload[HONEYPOT_FIELD_NAME];
  if (typeof honeypotVal === "string" && honeypotVal.trim().length > 0) {
    return true;
  }
  return false;
}

/**
 * Struttura per il tracciamento dei tentativi falliti nel browser (client-side throttling).
 */
interface ClientAttemptRecord {
  count: number;
  blockedUntil: number;
}

const clientAttempts = new Map<string, ClientAttemptRecord>();

/**
 * Sistema di protezione client-side contro attacchi di brute-force e credential stuffing.
 * Blocca i tentativi ripetuti prima ancora che raggiungano le API o Supabase.
 *
 * @param actionKey Chiave identificativa dell'azione (es. "login_attempt")
 * @param maxAttempts Numero massimo di tentativi errati consentiti prima del blocco (default: 5)
 * @param cooldownSeconds Secondi di attesa obbligatoria al superamento della soglia (default: 30)
 * @returns Oggetto con stato di autorizzazione e tempo residuo di blocco
 */
export function checkClientThrottle(
  actionKey: string,
  maxAttempts: number = 5,
  cooldownSeconds: number = 30,
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = clientAttempts.get(actionKey);

  if (record && record.blockedUntil > now) {
    const remaining = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds: remaining };
  }

  return { allowed: true };
}

/**
 * Registra un tentativo fallito nel client e imposta il blocco se la soglia viene superata.
 *
 * @param actionKey Chiave identificativa dell'azione
 * @param maxAttempts Soglia tentativi
 * @param cooldownSeconds Durata blocco
 */
export function recordFailedClientAttempt(
  actionKey: string,
  maxAttempts: number = 5,
  cooldownSeconds: number = 30,
): void {
  const now = Date.now();
  const record = clientAttempts.get(actionKey) || { count: 0, blockedUntil: 0 };

  record.count += 1;
  if (record.count >= maxAttempts) {
    record.blockedUntil = now + cooldownSeconds * 1000;
    // Raddoppia il tempo di cooldown per attacchi prolungati
    record.count = 0;
  }

  clientAttempts.set(actionKey, record);
}

/**
 * Resetta il contatore dei tentativi dopo un accesso avvenuto con successo.
 *
 * @param actionKey Chiave identificativa dell'azione
 */
export function resetClientAttemptThrottle(actionKey: string): void {
  clientAttempts.delete(actionKey);
}
