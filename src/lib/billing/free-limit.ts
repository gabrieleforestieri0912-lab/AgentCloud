/**
 * Limite freemium: 5 messaggi gratuiti AL GIORNO per agente.
 *
 * Chi è abbonato (user_agents.status = 'active') non ha limiti.
 * Admin e beta_tester/internal_qa bypassano.
 * Per gli altri: 5 messaggi al giorno per coppia (utente, agente), con reset
 * alla mezzanotte UTC. La UI mostra l'ora locale del reset (vedi getNextResetAt).
 *  - Utente autenticato: conteggio su `agent_runs` per user_id + agent_slug
 *    con `started_at` dentro il giorno UTC corrente.
 *  - Anonimo: conteggio distribuito su `rate_limits` con bucket `free-chat`
 *    chiave `${ip}:${agentSlug}` e window_start = inizio giorno UTC. Fallback
 *    in-memory se Supabase non è configurato.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const FREE_MESSAGES_PER_AGENT = 5;

// Fallback in-memory per anonimi quando Supabase non è disponibile.
// Chiave con giorno UTC così il reset giornaliero vale anche in-memory.
const anonMemory = new Map<string, number>();

function anonKey(ip: string, agentSlug: string) {
  return `${dayStartUTC().toISOString()}::${ip}::${agentSlug}`;
}

/** Mezzanotte UTC del giorno corrente (inizio finestra giornaliera). */
export function dayStartUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Istante del prossimo reset (mezzanotte UTC successiva). La UI lo mostra in ora locale. */
export function getNextResetAt(now = new Date()): Date {
  return new Date(dayStartUTC(now).getTime() + 24 * 60 * 60 * 1000);
}

async function getDb() {
  return createAdminClient() ?? (await createClient());
}

/**
 * Conta i messaggi gratuiti già usati OGGI per (userId, agentSlug).
 * Per anonimi usa ip.
 */
export async function getFreeMessagesUsed(
  userId: string,
  agentSlug: string,
  ip?: string,
): Promise<number> {
  const db = await getDb();
  const dayStart = dayStartUTC().toISOString();

  // Utente autenticato: conta le runs di oggi su agent_runs
  if (userId && userId !== "anonymous") {
    if (!db) return 0;
    const { count } = await db
      .from("agent_runs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("agent_slug", agentSlug)
      .gte("started_at", dayStart);
    return count ?? 0;
  }

  // Anonimo: rate_limits con window = giorno UTC corrente
  if (ip && db) {
    try {
      const key = `${ip}:${agentSlug}`;
      const { data } = await db
        .from("rate_limits")
        .select("count")
        .eq("bucket", "free-chat")
        .eq("key", key)
        .eq("window_start", dayStart)
        .maybeSingle();
      if (data && typeof (data as { count: number }).count === "number") {
        return (data as { count: number }).count;
      }
    } catch {
      // fallback memory
    }
  }

  if (ip) return anonMemory.get(anonKey(ip, agentSlug)) ?? 0;
  return 0;
}

/**
 * Incrementa il contatore anonimo dopo una run riuscita (finestra = giorno UTC).
 * Per utenti autenticati il conteggio avviene via agent_runs, quindi non serve.
 */
export async function incrementAnonymousFreeCount(ip: string, agentSlug: string): Promise<void> {
  const db = await getDb();
  const key = `${ip}:${agentSlug}`;
  if (db) {
    try {
      // window_start = mezzanotte UTC: il conteggio si azzera ogni giorno
      const windowStart = dayStartUTC().toISOString();
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
