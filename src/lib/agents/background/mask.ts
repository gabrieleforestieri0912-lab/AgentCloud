/**
 * Mascheramento dei segreti nei payload dei passi di run.
 *
 * Perché esiste: ogni `agent_run_steps.input/output` viene mostrato nel
 * Replay/Mission Control e resta nel DB. Ciò che non viene scritto non può
 * più essere recuperato, quindi il masking avviene PRIMA della scrittura e
 * non a video.
 *
 * Il masking è conservativo: colpisce solo le stringhe con forma da segreto
 * (token, JWT, envelope cifrato, campi noti), così gli argomenti ordinari
 * dei tool (email, testo, slug) restano intatti per il Replay e per la
 * ricostruzione della conversazione in caso di ripresa del run.
 */

const PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  // Header Authorization completo.
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, "Bearer •••"],
  // JWT (header.payload.signature).
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "eyJ•••"],
  // Chiavi nota-shaped: OpenAI/Anthropic, Slack, GitHub, AWS, Google, ...
  // I prefissi brevi richiedono un separatore (sk-, sk_, ...): senza, parole
  // ordinarie che iniziano per "sk" verrebbero mascherate per sbaglio.
  [/\b(sk|pk|rk|xoxb|xoxp|xoxa|ghp|gho|ghu|ghs|ghr|github_pat|re_)[._-][A-Za-z0-9_-]{8,}\b/g, "$1•••"],
  // AWS e Google non hanno separatore dopo il prefisso.
  [/\b(AKIA|AIza)[A-Za-z0-9_-]{8,}\b/g, "$1•••"],
  [/\bSG\.[A-Za-z0-9_-]{16,}\b/g, "SG.•••"],
  // Shopify (shop/tenant tokens) e Square.
  [/\bshpat_[a-f0-9]{16,}\b/gi, "shpat_•••"],
  [/\bshpss_[a-f0-9]{16,}\b/gi, "shpss_•••"],
  [/\bsq0csp-[A-Za-z0-9_-]{16,}\b/g, "sq0csp-•••"],
  // Token Linear/GitHub fine vita "pat-…" e Stripe.
  [/\bpat-[a-z]{2,4}-[A-Za-z0-9_-]{16,}\b/g, "pat-•••"],
  [/\bsk_live_[A-Za-z0-9]{16,}\b/g, "sk_live_•••"],
  [/\bwhsec_[A-Za-z0-9]{16,}\b/g, "whsec_•••"],
  // Envelope cifrato prodotto da lib/crypto (data/iv/tag).
  [/\{"data":"[^"]{8,}","iv":"[^"]+","tag":"[^"]+"\}/g, "[envelope-cifrato]"],
  // Campi sensibili in JSON (chiave: valore).
  [/"(access_token|refresh_token|id_token|client_secret|api_key|apiKey|password|authorization|secret|token)"\s*:\s*"[^"]*"/gi, "\"$1\":\"•••\""],
];

/** Ritorna `value` con ogni traccia da segreto sostituita da `•••`. */
export function maskSecrets(value: string): string {
  if (!value) return value;
  let out = value;
  for (const [pattern, replacement] of PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Maschera un oggetto serializzandolo, applicando `maskSecrets` al JSON.
 * Generico per convenienza dei chiamanti (passa l'oggetto, ritorna lo stesso
 * tipo): la struttura cambia solo se un envelope cifrato occupa l'intero
 * valore — caso che nei passi di run non si presenta (input = payload con
 * chiavi nota).
 */
export function maskJson<T>(value: T): T {
  if (value === null || value === undefined) return value;
  try {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    const masked = maskSecrets(text);
    return typeof value === "string" ? (masked as T) : (JSON.parse(masked) as T);
  } catch {
    return typeof value === "string" ? (maskSecrets(value) as T) : value;
  }
}

/** Taglia un testo (già mascherato) a `maxChars`, con indicatore di troncatura. */
export function truncateForStep(text: string, maxChars = 16_000): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n…[troncato: ${text.length - maxChars} caratteri omessi]`;
}
