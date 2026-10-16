import type { User } from "@supabase/supabase-js";

/**
 * Token API personali (`act_…`) per la CLI.
 *
 * Perché esistono: il login CLI via browser (/cli/auth) consegna un Supabase
 * JWT con refresh token — scomodo su server headless/CI. Dalle impostazioni
 * (/account) l'utente genera token a lunga durata, salvati nel DB solo come
 * SHA-256 (vedi supabase/schema-api-tokens.sql) e usabili così:
 *   agentcloud login --token act_...
 *   AGENTCLOUD_TOKEN=act_... agentcloud agents run ...
 *
 * Usa solo Web Crypto (subtle + getRandomValues): funziona sia nelle route
 * Node sia nel proxy/middleware (edge).
 */

export const PAT_PREFIX = "act_";
const PAT_BODY_LENGTH = 48;

/** API keys per integrazioni esterne (`ack_…`, usate su POST /api/v1/run). */
export const API_KEY_PREFIX = "ack_";
const API_KEY_BODY_LENGTH = 48;

function isPrefixedKey(token: string, prefix: string, bodyLength: number): boolean {
  return (
    token.startsWith(prefix) &&
    token.length === prefix.length + bodyLength &&
    /^[A-Za-z0-9_-]+$/.test(token)
  );
}

export function isPat(token: string): boolean {
  return isPrefixedKey(token, PAT_PREFIX, PAT_BODY_LENGTH);
}

export function isApiKey(token: string): boolean {
  return isPrefixedKey(token, API_KEY_PREFIX, API_KEY_BODY_LENGTH);
}

/** Token in chiaro da mostrare UNA sola volta alla creazione. */
export function generatePat(): string {
  return generatePrefixedKey(PAT_PREFIX, 24);
}

/** API key in chiaro da mostrare UNA sola volta alla creazione. */
export function generateApiKey(): string {
  return generatePrefixedKey(API_KEY_PREFIX, 24);
}

function generatePrefixedKey(prefix: string, bytes: number): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  let body = "";
  for (const b of arr) body += b.toString(16).padStart(2, "0");
  return `${prefix}${body}`;
}

/** Prefisso visibile in lista (es. `act_ab12cd34`) — mai il token intero. */
export function patDisplayPrefix(token: string): string {
  return token.slice(0, PAT_PREFIX.length + 8);
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type BearerCredential = {
  user: User;
  /** Solo per le API keys: slug dell'agente a cui è limitata, o null = tutti. */
  scopeAgent: string | null;
};

/**
 * Risolve un token `act_…` nell'utente proprietario (o null se sconosciuto /
 * revocato / DB non disponibile). Aggiorna last_used_at best-effort.
 * Non lancia mai eccezioni.
 */
export async function resolvePatUser(token: string): Promise<User | null> {
  return (await resolveBearerCredential(token))?.user ?? null;
}

/**
 * Risolve `act_…` (token CLI) e `ack_…` (API key): per le key restituisce
 * anche lo scope agente. Non lancia mai eccezioni.
 */
export async function resolveBearerCredential(
  token: string,
): Promise<BearerCredential | null> {
  try {
    const pat = isPat(token);
    const key = !pat && isApiKey(token);
    if (!pat && !key) return null;
    const { createAdminClient } = await import("./admin");
    const admin = createAdminClient();
    if (!admin) return null;
    const hash = await sha256Hex(token);
    const table = key ? "api_keys" : "api_tokens";
    const select = key ? "user_id,agent_slug" : "user_id";
    const { data } = await admin
      .from(table)
      .select(select)
      .eq(key ? "key_hash" : "token_hash", hash)
      .is("revoked_at", null)
      .maybeSingle();
    const row = data as { user_id?: string; agent_slug?: string | null } | null;
    if (!row?.user_id) return null;
    const { data: userData } = await admin.auth.admin.getUserById(row.user_id);
    const user = userData?.user;
    if (!user) return null;
    void admin
      .from(table)
      .update({ last_used_at: new Date().toISOString() })
      .eq(key ? "key_hash" : "token_hash", hash)
      .then(
        () => undefined,
        () => undefined,
      );
    return { user: user as User, scopeAgent: key ? (row.agent_slug ?? null) : null };
  } catch {
    return null;
  }
}
