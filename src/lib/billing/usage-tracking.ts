/**
 * Tracciamento utilizzo e controllo abbonamento.
 *
 * Gli agenti funzionano fino a fine abbonamento, con limiti token mensili.
 * Oltre allowance scatta overage fatturato via Stripe Meter (€0,30/1.000 token) fino a cap 2x.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateMeterItem, isOverageBillingEnabled, reportOverageUsage } from "@/lib/stripe/overage";
import { apiErrorMessageForLocale } from "@/lib/i18n/api-errors";
import { DATE_LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/constants";
import { DEFAULT_TOKEN_LIMIT, OVERAGE_HARD_CAP_MULTIPLIER } from "./pricing";
import { getPrimaryTokenPool, getTokenPoolForAgent } from "./token-pool";

export type UsageRecord = {
  id?: string;
  user_id: string;
  agent_slug: string;
  conversation_id?: string;
  tokens_input: number;
  tokens_output: number;
  /** Chiamate ai tool della run. Opzionale per i chiamanti che non le contano. */
  tool_calls?: number;
  created_at?: string;
  /**
   * Modalità Ghost (chat incognito): la run non appartiene a nessuna
   * conversazione salvata. Restano solo i contatori di consumo (token e
   * tool_calls), che servono per quota e fatturazione: nessun messaggio,
   * titolo, file o embedding viene scritto. `conversation_id` resta NULL e
   * la run è esclusa dal conteggio delle conversazioni in dashboard.
   */
  ephemeral?: boolean;
};

export type UserAgentRecord = {
  id: string;
  user_id: string;
  agent_slug: string;
  status: string;
  config: Record<string, unknown>;
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
  current_period_end?: string | null;
};

export type RunCheck =
  | { allowed: true; overage: boolean }
  | {
      allowed: false;
      status: number;
      code: string;
      message: string;
    };

async function getDb() {
  return createAdminClient() ?? (await createClient());
}

export async function getUserAgent(userId: string, agentSlug: string): Promise<UserAgentRecord | null> {
  const db = await getDb();
  if (!db) return null;
  const { data } = await db
    .from("user_agents")
    .select("*")
    .eq("user_id", userId)
    .eq("agent_slug", agentSlug)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    user_id: data.user_id,
    agent_slug: data.agent_slug,
    status: data.status ?? "inactive",
    config: (data.config ?? {}) as Record<string, unknown>,
    stripe_subscription_id: data.stripe_subscription_id,
    stripe_customer_id: data.stripe_customer_id,
    current_period_end: data.current_period_end,
  };
}

export function resolveTokenLimit(config: Record<string, unknown>): number {
  if (typeof config.tokenLimit === "number") return config.tokenLimit;
  if (typeof config.conversationLimit === "number") {
    return config.conversationLimit >= 1000 ? 1_000_000 : DEFAULT_TOKEN_LIMIT;
  }
  return DEFAULT_TOKEN_LIMIT;
}

export async function assertRunAllowed(
  userId: string,
  agentSlug: string,
  locale: Locale = DEFAULT_LOCALE,
  isAdmin = false,
): Promise<RunCheck> {
  if (isAdmin) return { allowed: true, overage: false };
  if (!userId || userId === "anonymous") return { allowed: true, overage: false };

  const db = await getDb();
  if (!db) return { allowed: true, overage: false };

  if (process.env.ENABLE_WAITLIST_BETA_BYPASS === "true") {
    const { data: profile } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (profile?.role === "beta_tester" || profile?.role === "internal_qa") {
      return { allowed: true, overage: false };
    }
  }

  const userAgent = await getUserAgent(userId, agentSlug);
  if (!userAgent) {
    return {
      allowed: false,
      status: 402,
      code: "NOT_SUBSCRIBED",
      message: apiErrorMessageForLocale(locale, "notSubscribed"),
    };
  }
  if (userAgent.status !== "active") {
    return {
      allowed: false,
      status: 402,
      code: "SUBSCRIPTION_INACTIVE",
      message: apiErrorMessageForLocale(locale, "subscriptionInactive", { status: userAgent.status }),
    };
  }
  if (userAgent.current_period_end) {
    const end = new Date(userAgent.current_period_end).getTime();
    if (!Number.isNaN(end) && end < Date.now()) {
      return {
        allowed: false,
        status: 402,
        code: "SUBSCRIPTION_EXPIRED",
        message: apiErrorMessageForLocale(locale, "subscriptionExpired"),
      };
    }
  }

  // ── Budget: il POOL di token del piano (non più la quota del singolo agente)
  //
  // Il pool è condiviso da tutti gli agenti dello stesso abbonamento e il
  // periodo è quello dell'abbonamento (non il mese di calendario): vedi
  // lib/billing/token-pool.ts. Se l'utente non ha un pool (abbonamento legacy
  // o agente non coperto) si cade sul comportamento precedente.
  const pool = await getTokenPoolForAgent(userId, agentSlug);
  const tokenLimit = pool?.tokenLimit ?? resolveTokenLimit(userAgent.config);
  const used = pool?.used ?? 0;

  const overageAvailable =
    Boolean(userAgent.stripe_subscription_id) && Boolean(userAgent.stripe_customer_id) && isOverageBillingEnabled();

  if (used >= tokenLimit) {
    if (overageAvailable) {
      const hardCap = tokenLimit * OVERAGE_HARD_CAP_MULTIPLIER;
      if (used >= hardCap) {
        return {
          allowed: false,
          status: 429,
          code: "OVERAGE_CAP_REACHED",
          message: apiErrorMessageForLocale(locale, "overageCapReached", {
            cap: hardCap.toLocaleString(DATE_LOCALES[locale]),
            multiplier: OVERAGE_HARD_CAP_MULTIPLIER,
          }),
        };
      }
      return { allowed: true, overage: true };
    }
    return {
      allowed: false,
      status: 429,
      code: "LIMIT_EXCEEDED",
      message: apiErrorMessageForLocale(locale, "limitExceeded", {
        limit: tokenLimit.toLocaleString(DATE_LOCALES[locale]),
      }),
    };
  }

  return { allowed: true, overage: false };
}

/**
 * Stessa regola di `assertRunAllowed`, ma per l'ASSISTENTE GENERICO (la chat
 * senza agente selezionato).
 *
 * L'assistente generico non appartiene a nessun piano: il suo consumo viene
 * addebitato al pool principale dell'utente (quello con il budget più
 * grande). Se l'utente non ha abbonamenti, il vincolo non è un budget ma il
 * piano gratuito (5 messaggi al giorno) → lo gestisce la route, che risponde
 * 402 FREE_LIMIT_REACHED.
 */
export async function assertPrimaryPoolAllowed(
  userId: string,
  locale: Locale = DEFAULT_LOCALE,
  isAdmin = false,
): Promise<RunCheck> {
  if (isAdmin) return { allowed: true, overage: false };
  if (!userId || userId === "anonymous") return { allowed: true, overage: false };

  const pool = await getPrimaryTokenPool(userId);
  if (!pool) return { allowed: true, overage: false };

  const tokenLimit = pool.tokenLimit;
  const used = pool.used;
  const overageAvailable = isOverageBillingEnabled();

  if (used >= tokenLimit) {
    if (overageAvailable) {
      const hardCap = tokenLimit * OVERAGE_HARD_CAP_MULTIPLIER;
      if (used >= hardCap) {
        return {
          allowed: false,
          status: 429,
          code: "OVERAGE_CAP_REACHED",
          message: apiErrorMessageForLocale(locale, "overageCapReached", {
            cap: hardCap.toLocaleString(DATE_LOCALES[locale]),
            multiplier: OVERAGE_HARD_CAP_MULTIPLIER,
          }),
        };
      }
      return { allowed: true, overage: true };
    }
    return {
      allowed: false,
      status: 429,
      code: "LIMIT_EXCEEDED",
      message: apiErrorMessageForLocale(locale, "limitExceeded", {
        limit: tokenLimit.toLocaleString(DATE_LOCALES[locale]),
      }),
    };
  }

  return { allowed: true, overage: false };
}

export async function recordUsage(usage: UsageRecord): Promise<void> {
  if (!usage.user_id || !usage.agent_slug) return;
  const db = await getDb();
  if (!db) return;
  let userAgentId: string | null = null;
  if (usage.user_id !== "anonymous") {
    const userAgent = await getUserAgent(usage.user_id, usage.agent_slug);
    userAgentId = userAgent?.id ?? null;
  }
  const { error } = await db.from("agent_runs").insert({
    user_id: usage.user_id,
    user_agent_id: userAgentId,
    agent_slug: usage.agent_slug,
    // Modalità Ghost: nessun collegamento a una conversazione (la chat non
    // esiste lato server). I token contano per la quota come sempre.
    conversation_id: usage.ephemeral
      ? null
      : (usage.conversation_id ?? null),
    status: "completed",
    input_tokens: usage.tokens_input,
    output_tokens: usage.tokens_output,
    tool_calls: usage.tool_calls ?? 0,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  });
  if (error) console.error("Failed to record usage:", error);
}

export async function recordUsageAndReportOverage(usage: UsageRecord): Promise<void> {
  if (!usage.user_id || !usage.agent_slug) return;
  if (usage.user_id === "anonymous") {
    await recordUsage(usage);
    return;
  }

  const userAgent = await getUserAgent(usage.user_id, usage.agent_slug);
  const subscriptionId = userAgent?.stripe_subscription_id ?? null;
  const stripeCustomerId = userAgent?.stripe_customer_id ?? null;

  if (!subscriptionId || !stripeCustomerId || !isOverageBillingEnabled()) {
    await recordUsage(usage);
    return;
  }

  // L'overage si calcola sul POOL: la parte di QUESTA run che ha superato il
  // budget condiviso del piano. `usedBefore` è il consumo del pool PRIMA di
  // questa run (la riga viene inserita dopo, in `recordUsage`).
  const pool = await getTokenPoolForAgent(usage.user_id, usage.agent_slug);
  const tokenLimit = pool?.tokenLimit ?? (userAgent ? resolveTokenLimit(userAgent.config) : DEFAULT_TOKEN_LIMIT);
  const usedBefore = pool?.used ?? 0;
  const runTokens = (usage.tokens_input || 0) + (usage.tokens_output || 0);
  const remainingAllowance = Math.max(0, tokenLimit - usedBefore);
  const overageTokens = Math.max(0, runTokens - remainingAllowance);

  await recordUsage(usage);

  if (overageTokens <= 0) return;

  const storedItemId = userAgent?.config?.stripeSubscriptionItemId;
  const meterItemId =
    (typeof storedItemId === "string" && storedItemId.length > 0 ? storedItemId : null) ??
    (await getOrCreateMeterItem(subscriptionId));
  if (!meterItemId) return;

  await reportOverageUsage({
    stripeCustomerId,
    overageTokens,
    idempotencyKey: usage.conversation_id ?? crypto.randomUUID(),
  });
}

export function resolveTokenLimitCompat(_config: Record<string, unknown>): number {
  return Number.MAX_SAFE_INTEGER;
}

// NOTA: non esiste più una "usage summary per agente per mese di calendario".
// Il consumo si legge dai POOL DI TOKEN (lib/billing/token-pool.ts): il
// budget è condiviso dagli agenti dello stesso abbonamento e il periodo è
// quello dell'abbonamento. Qui ci sarebbe una seconda, concorrente verità su
// "quanto ho consumato" — e le due divergerebbero.

