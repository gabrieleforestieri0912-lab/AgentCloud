/**
 * Condivisione chat in sola lettura: tipi, validazione snapshot e token.
 *
 * Modulo puro (niente Supabase/Next): la route API e la pagina pubblica lo
 * usano entrambe, così il formato dello snapshot non diverge mai. Testabile con
 * `node --experimental-strip-types`.
 *
 * Garanzie:
 * - solo campi di visualizzazione (role/content/agentSlug/agentName/created_at):
 *   allegati binari, file generati e activity dei tool non entrano mai nello
 *   snapshot (né peso né fughe di dati);
 * - limiti di dimensione e numero messaggi (anti-abuso);
 * - token opachi non indovinabili (24 byte casuali).
 */

import crypto from "crypto";

export type SharedMessage = {
  role: "user" | "assistant";
  content: string;
  agentSlug?: string;
  agentName?: string;
  created_at?: string;
};

export type SharedSnapshot = {
  version: 1;
  title: string;
  agentSlugs: string[];
  messages: SharedMessage[];
  sharedAt: string;
};

/** Limiti anti-abuso dello snapshot. */
export const SHARE_MAX_MESSAGES = 200;
export const SHARE_MAX_MESSAGE_CHARS = 50_000;
export const SHARE_MAX_TOTAL_CHARS = 400_000;

/** Token opaco per il link: 24 byte casuali in base64url (32 caratteri). */
export function generateShareToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function cleanText(v: unknown, max: number): string {
  return String(v ?? "").slice(0, max);
}

/**
 * Costruisce e valida lo snapshot da pubblicare. Ritorna un errore leggibile
 * (mostrabile in UI) quando il payload non è condivisibile.
 */
export function buildSharedSnapshot(input: {
  title?: unknown;
  agentSlugs?: unknown;
  messages?: unknown;
}): { ok: true; snapshot: SharedSnapshot } | { ok: false; error: string } {
  const raw = Array.isArray(input.messages) ? input.messages : [];
  if (raw.length === 0) return { ok: false, error: "empty" };
  if (raw.length > SHARE_MAX_MESSAGES) return { ok: false, error: "too_many_messages" };

  const messages: SharedMessage[] = [];
  let total = 0;
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const r = m as Record<string, unknown>;
    if (r.role !== "user" && r.role !== "assistant") continue;
    const content = cleanText(r.content, SHARE_MAX_MESSAGE_CHARS).trim();
    if (!content) continue;
    total += content.length;
    if (total > SHARE_MAX_TOTAL_CHARS) return { ok: false, error: "too_large" };
    const msg: SharedMessage = { role: r.role, content };
    if (typeof r.agentSlug === "string" && r.agentSlug) msg.agentSlug = r.agentSlug.slice(0, 100);
    if (typeof r.agentName === "string" && r.agentName) msg.agentName = r.agentName.slice(0, 200);
    if (typeof r.created_at === "string" && r.created_at) msg.created_at = r.created_at.slice(0, 40);
    messages.push(msg);
  }
  if (messages.length === 0) return { ok: false, error: "empty" };

  const slugs = Array.isArray(input.agentSlugs)
    ? input.agentSlugs.filter((s): s is string => typeof s === "string").map((s) => s.slice(0, 100)).slice(0, 10)
    : [];
  return {
    ok: true,
    snapshot: {
      version: 1,
      title: cleanText(input.title, 120).trim() || "Conversazione condivisa",
      agentSlugs: slugs,
      messages,
      sharedAt: new Date().toISOString(),
    },
  };
}

/** Valida il formato del token in lettura (evita query inutili su input assurdi). */
export function isValidShareToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{20,64}$/.test(token);
}
