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

export function isPat(token: string): boolean {
  return (
    token.startsWith(PAT_PREFIX) &&
    token.length === PAT_PREFIX.length + PAT_BODY_LENGTH &&
    /^[A-Za-z0-9_-]+$/.test(token)
  );
}

/** Token in chiaro da mostrare UNA sola volta alla creazione. */
export function generatePat(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let body = "";
  for (const b of bytes) body += b.toString(16).padStart(2, "0");
  return `${PAT_PREFIX}${body}`;
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

/**
 * Risolve un token `act_…` nell'utente proprietario (o null se sconosciuto /
 * revocato / DB non disponibile). Aggiorna last_used_at best-effort.
 * Non lancia mai eccezioni.
 */
export async function resolvePatUser(token: string): Promise<User | null> {
  try {
    if (!isPat(token)) return null;
    const { createAdminClient } = await import("./admin");
    const admin = createAdminClient();
    if (!admin) return null;
    const hash = await sha256Hex(token);
    const { data } = await admin
      .from("api_tokens")
      .select("user_id")
      .eq("token_hash", hash)
      .is("revoked_at", null)
      .maybeSingle();
    const userId = (data as { user_id?: string } | null)?.user_id;
    if (!userId) return null;
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const user = userData?.user;
    if (!user) return null;
    void admin
      .from("api_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("token_hash", hash)
      .then(() => undefined, () => undefined);
    return user as User;
  } catch {
    return null;
  }
}
