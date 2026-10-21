/**
 * Configurazione e calcolo dei POOL DI TOKEN (logica pura).
 *
 * Separato da `token-pool.ts` (che parla col DB) per due motivi:
 *   - è testabile da solo, senza Supabase e senza rete;
 *   - le regole del budget (quanto, quale periodo, quando scatta l'avviso)
 *     stanno in un posto solo e non si spargono tra query e route.
 *
 * Il modello: un abbonamento è un contenitore che porta un DIRITTO (quali
 * agenti) e un BUDGET (quanti token). Il budget è un pool condiviso dagli
 * agenti dello stesso abbonamento e si misura nel periodo di abbonamento.
 */

import { DEFAULT_TOKEN_LIMIT } from "./pricing";

/** Configurazione del pool, così come scritta in `user_agents.config`. */
export type PoolConfig = {
  /** Identificatore del pool: l'id dell'abbonamento Stripe. */
  poolId: string;
  /** Id del piano venduto (es. "shopify-growth"), se c'è. */
  planId: string | null;
  /** Verticale del piano ("shopify" | "services"), se c'è. */
  vertical: string | null;
  /** Budget di token del pool per il periodo. */
  tokenLimit: number;
  /** Inizio del periodo di abbonamento (ISO). */
  periodStart: string;
  /** Fine del periodo di abbonamento (ISO), se nota. */
  periodEnd: string | null;
};

/** Pool + consumo: quello che serve a enforcement e UI. */
export type TokenPool = PoolConfig & {
  /** Agenti che condividono il pool. */
  agents: string[];
  /** Token consumati nel periodo, su tutti gli agenti del pool. */
  used: number;
  /** Token rimasti (0 se il pool è esaurito). */
  remaining: number;
  /** Quota consumata 0..1 (oltre 1 se si è in overage). */
  ratio: number;
  /** Token oltre la soglia (overage fatturato). */
  overage: number;
};

/** Riga di `user_agents` che serve a costruire il pool. */
export type PoolUserAgentRow = {
  agent_slug: string;
  status?: string;
  config?: Record<string, unknown> | null;
  stripe_subscription_id?: string | null;
};

/** Soglia oltre la quale l'utente viene avvisato che il budget sta finendo. */
export const POOL_WARNING_RATIO = 0.8;

/**
 * Inizio/fine del mese di calendario UTC: il fallback per gli abbonamenti
 * legacy, che non hanno il periodo di Stripe.
 */
export function calendarMonthBounds(now: Date): { start: string; end: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/**
 * Estrae la configurazione del pool da una riga `user_agents`.
 *
 * Puro: nessun accesso al DB, così è testabile da solo.
 */
export function poolConfigFromUserAgent(
  row: PoolUserAgentRow,
  now: Date = new Date(),
): PoolConfig {
  const config = (row.config ?? {}) as Record<string, unknown>;
  const month = calendarMonthBounds(now);

  const poolId =
    typeof config.poolId === "string" && config.poolId
      ? config.poolId
      : (row.stripe_subscription_id ?? `agent:${row.agent_slug}`);

  const tokenLimit =
    typeof config.tokenLimit === "number" && config.tokenLimit > 0
      ? config.tokenLimit
      : DEFAULT_TOKEN_LIMIT;

  const periodStart = isIsoDate(config.periodStart) ? config.periodStart : month.start;
  const periodEnd = isIsoDate(config.periodEnd) ? config.periodEnd : month.end;

  return {
    poolId,
    planId: typeof config.planId === "string" ? config.planId : null,
    vertical: typeof config.vertical === "string" ? config.vertical : null,
    tokenLimit,
    periodStart,
    periodEnd,
  };
}

/**
 * Costruisce la config del pool da ciò che è stato venduto.
 *
 * `soldTokens` è lo snapshot messo nei metadata del checkout (cosa è stato
 * venduto al momento dell'acquisto); `catalogTokens` è il valore corrente
 * del catalogo. Vince lo snapshot: un piano venduto a 300k resta a 300k
 * anche se il catalogo cambia dopo.
 */
export function buildPoolConfig(input: {
  poolId: string;
  planId?: string | null;
  vertical?: string | null;
  soldTokens?: number | null;
  catalogTokens?: number | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  now?: Date;
}): PoolConfig {
  const tokenLimit =
    (typeof input.soldTokens === "number" && input.soldTokens > 0
      ? input.soldTokens
      : null) ??
    (typeof input.catalogTokens === "number" && input.catalogTokens > 0
      ? input.catalogTokens
      : null) ??
    DEFAULT_TOKEN_LIMIT;

  const month = calendarMonthBounds(input.now ?? new Date());

  return {
    poolId: input.poolId,
    planId: input.planId ?? null,
    vertical: input.vertical ?? null,
    tokenLimit,
    periodStart: isIsoDate(input.periodStart)
      ? (input.periodStart as string)
      : month.start,
    periodEnd: isIsoDate(input.periodEnd) ? (input.periodEnd as string) : null,
  };
}

/** Calcola uso/rimanente/overage a partire dal limite e dai token consumati. */
export function computePoolUsage(
  tokenLimit: number,
  used: number,
): Pick<TokenPool, "used" | "remaining" | "ratio" | "overage"> {
  const safeUsed = Math.max(0, used);
  return {
    used: safeUsed,
    remaining: Math.max(0, tokenLimit - safeUsed),
    ratio: tokenLimit > 0 ? safeUsed / tokenLimit : 0,
    overage: Math.max(0, safeUsed - tokenLimit),
  };
}

/** "ok" | "warning" | "critical": la UI colora il budget di conseguenza. */
export function poolWarningLevel(ratio: number): "ok" | "warning" | "critical" {
  if (ratio >= 1) return "critical";
  if (ratio >= POOL_WARNING_RATIO) return "warning";
  return "ok";
}
