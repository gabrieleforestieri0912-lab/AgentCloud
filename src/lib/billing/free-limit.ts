/**
 * Limite freemium: 5 messaggi gratuiti AL GIORNO in totale, su tutti gli agenti.
 *
 * Chi è abbonato (user_agents.status = 'active') non ha limiti.
 * Admin e beta_tester/internal_qa bypassano.
 * Per gli altri: 5 messaggi al giorno per utente (non per agente), con reset
 * alla mezzanotte UTC. La UI mostra l'ora locale del reset (vedi getNextResetAt).
 * Al superamento, il server risponde 402 FREE_LIMIT_REACHED e la chat mostra
 * il paywall per l'agente in uso in quel momento.
 *  - Utente autenticato: conteggio su `agent_runs` per user_id con
 *    `started_at` dentro il giorno UTC corrente (tutti gli agent_slug).
 *  - Anonimo: conteggio distribuito su `rate_limits` con bucket `free-chat`
 *    chiave `${ip}` e window_start = inizio giorno UTC. Fallback in-memory
 *    se Supabase non è configurato.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { dayStartUTC } from "@/lib/billing/free-window";

export { FREE_MESSAGES_PER_DAY, FREE_MESSAGES_PER_AGENT } from "@/lib/billing/free-window";
export {
  dayStartUTC,
  getNextResetAt,
  getRemainingFreeMessages,
  hasReachedFreeLimit,
} from "@/lib/billing/free-window";

// Fallback in-memory per anonimi quando Supabase non è disponibile.
// Chiave con giorno UTC così il reset giornaliero vale anche in-memory.
const anonMemory = new Map<string, number>();

function anonKey(ip: string) {
  return `${dayStartUTC().toISOString()}::${ip}`;
}

async function getDb() {
  return createAdminClient() ?? (await createClient());
}

/**
 * Conta i messaggi gratuiti già usati OGGI dall'utente (tutti gli agenti).
 * Per anonimi usa ip.
 */
export async function getFreeMessagesUsed(userId: string, ip?: string): Promise<number> {
  const db = await getDb();
  const dayStart = dayStartUTC().toISOString();

  // Utente autenticato: conta le runs di oggi su agent_runs (tutti gli agenti)
  if (userId && userId !== "anonymous") {
    if (!db) return 0;
    const { count } = await db
      .from("agent_runs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("started_at", dayStart);
    return count ?? 0;
  }

  // Anonimo: rate_limits con window = giorno UTC corrente
  if (ip && db) {
    try {
      const { data } = await db
        .from("rate_limits")
        .select("count")
        .eq("bucket", "free-chat")
        .eq("key", ip)
        .eq("window_start", dayStart)
        .maybeSingle();
      if (data && typeof (data as { count: number }).count === "number") {
        return (data as { count: number }).count;
      }
    } catch {
      // fallback memory
    }
  }

  if (ip) return anonMemory.get(anonKey(ip)) ?? 0;
  return 0;
}

/**
 * Incrementa il contatore anonimo dopo una run riuscita (finestra = giorno UTC).
 * Per utenti autenticati il conteggio avviene via agent_runs, quindi non serve.
 */
export async function incrementAnonymousFreeCount(ip: string): Promise<void> {
  const db = await getDb();
  if (db) {
    try {
      // window_start = mezzanotte UTC: il conteggio si azzera ogni giorno
      const windowStart = dayStartUTC().toISOString();
      await db.rpc("bump_rate_limit", {
        p_bucket: "free-chat",
        p_key: ip,
        p_window_start: windowStart,
      });
      return;
    } catch {
      // fallback
    }
  }
  anonMemory.set(anonKey(ip), (anonMemory.get(anonKey(ip)) ?? 0) + 1);
}
