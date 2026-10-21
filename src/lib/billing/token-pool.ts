/**
 * Pool di token: il budget che rende un agente "funzionante".
 *
 * IL MODELLO
 * -----------
 * Un abbonamento non è un sì/no: è un contenitore che porta due cose:
 *   1. il DIRITTO (quali agenti posso usare, fino a quando) → `user_agents`;
 *   2. il BUDGET (quanto posso consumare in questo periodo) → questo modulo.
 *
 * Il budget è un POOL, non una cifra per agente: un piano Shopify Growth
 * (4 agenti, 1M token/mese) dà 1M token CONDIVISI fra i 4 agenti. Ogni agente
 * del piano può consumare tutto il pool, ma non più di 1M in totale. Prima
 * ogni agente aveva la sua allowance: un piano da 4 agenti regalava 4× il
 * budget che era stato venduto.
 *
 * Un pool = un abbonamento Stripe. I checkout per agente singolo danno un
 * pool con un agente; i checkout per piano danno un pool con N agenti.
 *
 * DOVE VIVE LA DEFINIZIONE
 * ------------------------
 * In `user_agents.config` (jsonb), che è già la tabella autoritativa di
 * proprietà e di stato. Nessuna tabella nuova, nessuna migrazione:
 *
 *   { planId, vertical, activatedVia, tokenLimit, poolId,
 *     periodStart, periodEnd, stripeSubscriptionItemId, ... }
 *
 * La definizione è duplicata sulle righe degli agenti dello stesso pool: è
 * scritta dallo stesso webhook dagli stessi dati, quindi è coerente per
 * costruzione, e rende il pool raggiungibile da qualunque agente senza
 * dover cercare "l'agente principale" del piano.
 *
 * IL PERIODO
 * -----------
 * Il periodo è quello dell'ABBONAMENTO (Stripe `current_period_start/end`),
 * non il mese di calendario: chi si abbona il 28 non deve perdere il budget
 * il 1° del mese. Il consumo si misura solo dentro [periodStart, periodEnd].
 *
 * I ROWS LEGACY (abbonamenti attivati prima di questo modello) non hanno
 * `tokenLimit` né il periodo: per loro si mantiene il comportamento
 * precedente (allowance di default, mese di calendario), così nessun
 * abbonato esistente resta senza servizio.
 *
 * Le regole del budget (limite, periodo, calcolo) stanno in `pool-config.ts`,
 * che è puro e testabile; qui ci sono solo le query.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  calendarMonthBounds,
  computePoolUsage,
  poolConfigFromUserAgent,
  type PoolUserAgentRow,
  type TokenPool,
} from "@/lib/billing/pool-config";

export type {
  TokenPool,
  PoolConfig,
  PoolUserAgentRow,
} from "@/lib/billing/pool-config";
export {
  buildPoolConfig,
  computePoolUsage,
  poolConfigFromUserAgent,
  poolWarningLevel,
  calendarMonthBounds,
  POOL_WARNING_RATIO,
} from "@/lib/billing/pool-config";

type UserAgentRow = PoolUserAgentRow & {
  stripe_customer_id: string | null;
  current_period_end: string | null;
};

async function getDb() {
  return createAdminClient() ?? (await createClient());
}

async function fetchUserAgents(userId: string): Promise<UserAgentRow[]> {
  const db = await getDb();
  if (!db) return [];
  const { data } = await db
    .from("user_agents")
    .select("agent_slug, status, config, stripe_subscription_id, stripe_customer_id, current_period_end")
    .eq("user_id", userId);
  return (data ?? []) as UserAgentRow[];
}

/**
 * Token consumati nel periodo, su TUTTI gli agenti del pool.
 *
 * È qui che il pool diventa un pool: il filtro è per utente + agenti del
 * pool + finestra del periodo, non per singolo agente.
 */
async function tokensUsedInPeriod(
  userId: string,
  agents: string[],
  periodStart: string,
  periodEnd: string,
): Promise<number> {
  if (agents.length === 0) return 0;
  const db = await getDb();
  if (!db) return 0;
  const { data } = await db
    .from("agent_runs")
    .select("input_tokens, output_tokens")
    .eq("user_id", userId)
    .in("agent_slug", agents)
    .gte("started_at", periodStart)
    .lt("started_at", periodEnd);
  return (data ?? []).reduce(
    (sum, row) => sum + (row.input_tokens || 0) + (row.output_tokens || 0),
    0,
  );
}

/**
 * Pool di un utente per un agente.
 *
 * `null` se l'utente non ha l'agente (nessun diritto → nessun budget).
 */
export async function getTokenPoolForAgent(
  userId: string,
  agentSlug: string,
): Promise<TokenPool | null> {
  if (!userId || userId === "anonymous") return null;
  const rows = await fetchUserAgents(userId);
  const own = rows.find((r) => r.agent_slug === agentSlug);
  if (!own) return null;
  // Un abbonamento disdetto non dà né diritto né budget: il pool sparisce
  // con lui (l'utente torna al piano gratuito).
  if (own.status === "canceled") return null;

  const config = poolConfigFromUserAgent(own);
  const siblings = rows.filter(
    (r) =>
      poolConfigFromUserAgent(r).poolId === config.poolId &&
      r.status !== "canceled",
  );
  const agents = siblings.map((r) => r.agent_slug);
  if (!agents.includes(agentSlug)) agents.push(agentSlug);

  const used = await tokensUsedInPeriod(
    userId,
    agents,
    config.periodStart,
    config.periodEnd ?? calendarMonthBounds(new Date()).end,
  );

  return { ...config, agents, ...computePoolUsage(config.tokenLimit, used) };
}

/**
 * Tutti i pool di un utente (uno per abbonamento). Usata dalla dashboard e
 * dall'endpoint di consumo.
 */
export async function getTokenPoolsForUser(
  userId: string,
): Promise<TokenPool[]> {
  if (!userId || userId === "anonymous") return [];
  const rows = await fetchUserAgents(userId);
  const active = rows.filter((r) => r.status !== "canceled");
  if (active.length === 0) return [];

  const byPool = new Map<string, UserAgentRow[]>();
  for (const row of active) {
    const poolId = poolConfigFromUserAgent(row).poolId;
    const list = byPool.get(poolId) ?? [];
    list.push(row);
    byPool.set(poolId, list);
  }

  const pools: TokenPool[] = [];
  for (const [, members] of byPool) {
    const config = poolConfigFromUserAgent(members[0]);
    const agents = members.map((m) => m.agent_slug);
    const used = await tokensUsedInPeriod(
      userId,
      agents,
      config.periodStart,
      config.periodEnd ?? calendarMonthBounds(new Date()).end,
    );
    pools.push({ ...config, agents, ...computePoolUsage(config.tokenLimit, used) });
  }
  return pools;
}
