/**
 * Contatore dei messaggi gratuiti per il VISITATORE (ospite).
 *
 * Il problema che risolve: il contatore per IP penalizza chi sta dietro una
 * NAT (albergo, ufficio, rete mobile): cinque messaggi di un collega
 * esauriscono la quota di tutti gli altri. E non punisce chi cambia IP.
 *
 * La soluzione: due contatori e si tiene il PIÙ GENEROSO dei due.
 *   - il contatore per IP (sul DB, `rate_limits`): è la rete di sicurezza,
 *     regge contro chi cambia IP;
 *   - il contatore per dispositivo (un cookie firmato dal server): è il
 *     contatore personale, quindi la NAT non penalizza nessuno.
 *
 * Chi aggira entrambi (cancella i cookie E cambia IP) è unabusatore
 * occasionale: il danno è limitato dal fatto che la demo gira sul provider
 * economico.
 *
 * Il cookie è firmato (HMAC): il browser non può gonfiare il conteggio
 * dichiarando un numero più basso. Non è HttpOnly-sicuro al 100% (chi vuole
 * può cancellare i cookie), ma serve al caso NAT, non a fermare un
 *(ab)usore determinato.
 *
 * Server-only.
 */

import crypto from "node:crypto";

const COOKIE_NAME = "agentcloud_guest_usage";
/** Il cookie vale un giorno: il contatore si azzera con il giorno come il DB. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

/**
 * Segreto per firmare il cookie. Stessa catena di fallback del token di
 * conferma dei tool (vedi lib/agents/tool-confirmation.ts): una chiave
 * dedicata se c'è, altrimenti quelle già presenti nell'ambiente.
 */
function signingSecret(): string {
  return (
    process.env.GUEST_COUNTER_SECRET ||
    process.env.INTEGRATIONS_STATE_SECRET ||
    process.env.TENANT_STORE_KEY ||
    ""
  );
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", signingSecret())
    .update(payload)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Il contatore del dispositivo, letto dal cookie firmato.
 *
 * `null` = nessun cookie valido (il visitatore non ne ha uno, o non lo
 * conserva): in quel caso decide il contatore per IP.
 */
export function readGuestUsed(req: Request): number | null {
  if (!signingSecret()) return null;
  const header = req.headers.get("cookie") ?? "";
  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const raw = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  if (!safeEqual(signature, sign(payload))) return null;
  try {
    const count = Number(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  } catch {
    return null;
  }
}

/** Il valore `Set-Cookie` con il conteggio aggiornato del dispositivo. */
export function guestUsageCookie(count: number): string {
  const payload = Buffer.from(
    String(Math.max(0, Math.floor(count))),
    "utf8",
  ).toString("base64url");
  const value = `${payload}.${sign(payload)}`;
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax`;
}
