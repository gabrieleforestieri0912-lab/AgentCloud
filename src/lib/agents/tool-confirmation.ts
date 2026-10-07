/**
 * Conferma umana (human-in-the-loop) per i tool che modificano dati esistenti.
 *
 * Perché esiste: finora il loop dei tool eseguiva immediatamente ogni chiamata
 * del modello. Per un tool che *crea* un file nuovo è accettabile, per uno che
 * riscrive il contenuto di un documento dell'utente no: senza conferma
 * l'esecuzione avviene "senza chiedere" (Open Decision 14). Questo modulo è la
 * parte server del meccanismo; la UI riceve l'evento `tool_confirm` e riprende
 * con il token.
 *
 * Ambito: volutamente minimale e limitato ai tool Microsoft che modificano file
 * o pagine esistenti. Non è ancora il meccanismo generico per tutti i provider.
 *
 * Perché un token firmato e non lo stato sul client: il client non deve poter
 * cambiare tool o argomenti fra la richiesta di conferma e l'esecuzione. Il
 * token contiene l'intero batch di tool_use; la firma HMAC lo rende non
 * modificabile. Vale la stessa chiave dello state OAuth.
 */

import crypto from "crypto";

/** Finestra di validità della conferma: oltre, si riparte dalla richiesta. */
export const CONFIRMATION_TTL_MS = 5 * 60 * 1000;

/**
 * Tool che richiedono conferma. Sono le modifiche a contenuto esistente: le
 * creazioni di file nuovi non sono qui.
 */
const CONFIRMATION_TOOLS = new Set<string>([
  "word_append",
  "excel_write_range",
  "onenote_append",
]);

export function toolRequiresConfirmation(name: string): boolean {
  return CONFIRMATION_TOOLS.has(name);
}

export type PendingToolUse = {
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type PendingBatch = {
  /** tenant id (auth.uid) */
  t: string;
  /** agent slug */
  a: string;
  /** tutti i tool_use della risposta del modello, nell'ordine ricevuto */
  u: PendingToolUse[];
  /** indice in `u` del tool che ha richiesto la conferma */
  c: number;
  /** scadenza epoch ms */
  e: number;
};

function keyForHmac(): string {
  return (
    process.env.INTEGRATIONS_STATE_SECRET ||
    process.env.TENANT_STORE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "dev-tool-confirmation"
  );
}

function sign(b64: string): string {
  return crypto.createHmac("sha256", keyForHmac()).update(b64).digest("hex");
}

export function buildApprovalToken(payload: Omit<PendingBatch, "e">): string {
  const full: PendingBatch = { ...payload, e: Date.now() + CONFIRMATION_TTL_MS };
  const b64 = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${b64}.${sign(b64)}`;
}

function validShape(p: unknown): p is PendingBatch {
  if (!p || typeof p !== "object") return false;
  const v = p as Record<string, unknown>;
  if (typeof v.t !== "string" || !v.t) return false;
  if (typeof v.a !== "string" || !v.a) return false;
  if (typeof v.c !== "number" || typeof v.e !== "number") return false;
  if (!Array.isArray(v.u) || v.u.length === 0) return false;
  if (v.c < 0 || v.c >= v.u.length) return false;
  for (const use of v.u) {
    if (!use || typeof use !== "object") return false;
    const u = use as Record<string, unknown>;
    if (typeof u.id !== "string" || typeof u.name !== "string") return false;
  }
  return true;
}

/** Verifica firma, forma e scadenza. `null` se il token non è valido. */
export function verifyApprovalToken(token: string): PendingBatch | null {
  if (!token) return null;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const expected = sign(b64);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    const payload: unknown = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
    if (!validShape(payload)) return null;
    if (Date.now() > payload.e) return null;
    return payload;
  } catch {
    return null;
  }
}
