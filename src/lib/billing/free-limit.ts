/**
 * Limite freemium: 4 messaggi gratuiti per agente.
 *
 * Chi è abbonato (user_agents.status = 'active') non ha limiti.
 * Admin e beta_tester/internal_qa bypassano.
 * Per gli altri: 4 messaggi totali per coppia (utente, agente).
 *  - Utente autenticato: conteggio su `agent_runs` per user_id + agent_slug.
 *  - Anonimo: conteggio distribuito su `rate_limits` con bucket `free-chat`
 *    chiave `${ip}:${agentSlug}` (vale tra tutte le istanze). Fallback in-memory
 *    se Supabase non è configurato.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const FREE_MESSAGES_PER_AGENT = 4;

// Fallback in-memory per anonimi quando Supabase non è disponibile
const anonMemory = new Map<string, number>();

function anonKey(ip: string, agentSlug: string) {
  return `${ip}::${agentSlug}`;
}

async function getDb() {
  return createAdminClient() ?? (await createClient());
}

/**
 * Conta i messaggi gratuiti già usati per (userId, agentSlug).
 * Per anonimi usa ip.
 */
export async function getFreeMessagesUsed(
  userId: string,
  agentSlug: string,
  ip?: string,
): Promise<number> {
  const db = await getDb();

  // Utente autenticato: conta le runs su agent_runs
  if (userId && userId !== "anonymous") {
    if (!db) return 0;
    const { count } = await db
      .from("agent_runs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("agent_slug", agentSlug);
    return count ?? 0;
  }

  // Anonimo: prova Supabase rate_limits con window fissa (epoch)
  // Usiamo bucket `free-chat` e window_start fissa così il contatore è cumulativo.
  if (ip && db) {
    try {
      const key = `${ip}:${agentSlug}`;
      const { data } = await db
        .from("rate_limits")
        .select("count")
        .eq("bucket", "free-chat")
        .eq("key", key)
        .maybeSingle();
      // rate_limits ha PK (bucket,key,window_start) – potremmo avere più window,
      // quindi somma se ci sono più righe (fallback query senza window)
      if (data && typeof (data as { count: number }).count === "number") {
        return (data as { count: number }).count;
      }
      // Se non trovato con maybeSingle, prova somma totale per bucket+key
      const { data: rows } = await db
        .from("rate_limits")
        .select("count")
        .eq("bucket", "free-chat")
        .eq("key", key);
      if (rows && rows.length > 0) {
        return rows.reduce((s, r) => s + ((r as { count: number }).count ?? 0), 0);
      }
    } catch {
      // fallback memory
    }
  }

  if (ip) return anonMemory.get(anonKey(ip, agentSlug)) ?? 0;
  return 0;
}

/**
 * Incrementa il contatore anonimo dopo una run riuscita.
 * Per utenti autenticati il conteggio avviene via agent_runs, quindi non serve.
 */
export async function incrementAnonymousFreeCount(ip: string, agentSlug: string): Promise<void> {
  const db = await getDb();
  const key = `${ip}:${agentSlug}`;
  if (db) {
    try {
      // Usa la stessa window_start fissa per rendere il conteggio cumulativo
      const windowStart = new Date("2026-01-01T00:00:00Z").toISOString();
      await db.rpc("bump_rate_limit", {
        p_bucket: "free-chat",
        p_key: key,
        p_window_start: windowStart,
      });
      return;
    } catch {
      // fallback
    }
  }
  anonMemory.set(anonKey(ip, agentSlug), (anonMemory.get(anonKey(ip, agentSlug)) ?? 0) + 1);
}

export function getRemainingFreeMessages(used: number): number {
  return Math.max(0, FREE_MESSAGES_PER_AGENT - used);
}

export function hasReachedFreeLimit(used: number): boolean {
  return used >= FREE_MESSAGES_PER_AGENT;
}
