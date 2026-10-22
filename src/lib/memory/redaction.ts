/**
 * Filtro dei secreti.
 *
 * La memoria di un agente non deve contenere password, token, numeri di carta
 * o altri segreti. Il filtro lavora su due lati:
 *
 *  1. PRIMA dell'estrazione: la trascrizione della conversazione viene
 *     ripulita, così il modello non vede mai il segreto e non lo "ricorda";
 *  2. DOPO l'estrazione: ogni fatto proposed dal modello viene controllato,
 *     e se contiene un segreto viene scartato invece di essere salvato.
 *
 * È una rete di sicurezza, non una garanzia assoluta: nessun regex
 * riconosce ogni formato di credenziale. Per questo il controllo c'è due
 * volte, e il secondo controllo scarta (non ripulisce) l'elemento sospetto.
 */

/** Segreto riconosciuto dal filtro. */
export type DetectedSecret = {
  /** Tipo di segreto (per l'audit, non per il contenuto). */
  label: string;
  /** Il testo trovato: non finisce mai in un log. */
  match: string;
};

/** Regole di riconoscimento. */
type SecretRule = {
  label: string;
  pattern: RegExp;
};

/** Formati di credenziale riconosciuti. */
const SECRET_RULES: SecretRule[] = [
  { label: "api key", pattern: /\b(?:sk|pk|rk|api)[-_][A-Za-z0-9_-]{16,}\b/ },
  { label: "github token", pattern: /\bgh[pousr]_[A-Za-z0-9]{16,}\b/ },
  { label: "slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { label: "aws access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: "google api key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  {
    label: "jwt",
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  { label: "bearer token", pattern: /\bBearer\s+[A-Za-z0-9._-]{20,}/i },
  { label: "private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { label: "iban", pattern: /\b[A-Z]{2}\d{2}[ ]?(?:[A-Z0-9]{4}[ ]?){2,7}[A-Z0-9]{1,4}\b/ },
  {
    label: "password assignment",
    pattern:
      /\b(?:password|passwd|pwd|passphrase|secret|api[ _-]?key|access[ _-]?token|auth[ _-]?token)\b\s*(?:[:=]|->|\be\b)\s*["']?[^\s"',;]{6,}/i,
  },
  {
    label: "opaque credential",
    pattern: /\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{24,}\b/,
  },
];

/** Prefissi delle carte più diffuse (IIN). */
const CARD_PREFIXES =
  /^(4|3[47]|5[1-5]|2[2-7]|6011|65|5018|5020|5038|6304|6759|6761)/;

/** Verifica la checksum Luhn: distingue una carta da un numero di fattura. */
export function isLuhnValid(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let value = digits.charCodeAt(i) - 48;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * Cerca numeri di carta in un testo.
 *
 * Servono due condizioni insieme: la checksum Luhn valida E il numero ha
 * l'aspetto di una carta (gruppi di quattro cifre, oppure un prefisso noto
 * come Visa, Mastercard, Amex, Maestro, Discover). Senza il prefisso, un
 * numero di fattura di 16 cifre passerebbe la checksum e ogni memoria che
 * lo contiene verrebbe buttata.
 */
export function findCardNumbers(text: string): string[] {
  const found: string[] = [];
  const candidates = text.match(/\b(?:\d[ -]?){12,18}\d\b/g) ?? [];
  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, "");
    if (!isLuhnValid(digits)) continue;
    const grouped = /\d{4}[ -]\d{4}/.test(candidate);
    if (!grouped && !CARD_PREFIXES.test(digits)) continue;
    found.push(candidate.trim());
  }
  return found;
}

/** Cerca tutti i secreti riconosciuti in un testo. */
export function detectSecrets(text: string): DetectedSecret[] {
  if (!text) return [];
  const found: DetectedSecret[] = [];
  for (const rule of SECRET_RULES) {
    const matches = text.match(new RegExp(rule.pattern, "g")) ?? [];
    for (const match of matches) {
      found.push({ label: rule.label, match });
    }
  }
  for (const card of findCardNumbers(text)) {
    found.push({ label: "credit card", match: card });
  }
  return found;
}

/** True quando il testo contiene un segreto. */
export function containsSecret(text: string): boolean {
  return detectSecrets(text).length > 0;
}

/** Esito della ripulizione di un testo. */
export type RedactionResult = {
  /** Il testo senza secreti. */
  text: string;
  /** I tipi di segreto trovati (non il contenuto: non finisce nei log). */
  labels: string[];
};

/**
 * Ripulisce un testo sostituendo i secreti con `[REDACTED]`.
 *
 * Usata sulla trascrizione prima dell'estrazione: al modello non deve
 * arrivare la credenziale, nemmeno per un secondo.
 */
export function redactSecrets(text: string): RedactionResult {
  if (!text) return { text: "", labels: [] };
  let clean = text;
  const labels: string[] = [];
  for (const rule of SECRET_RULES) {
    if (new RegExp(rule.pattern).test(clean)) {
      labels.push(rule.label);
      clean = clean.replace(new RegExp(rule.pattern, "g"), "[REDACTED]");
    }
  }
  for (const card of findCardNumbers(clean)) {
    labels.push("credit card");
    clean = clean.split(card).join("[REDACTED]");
  }
  return { text: clean, labels: [...new Set(labels)] };
}
