/**
 * Tracciamento utilizzo e controllo abbonamento.
 *
 * Gli agenti funzionano fino a fine abbonamento mensile: nessun limite token.
 * Si blocca solo se l'abbonamento non è attivo o è scaduto e non rinnovato.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiErrorMessageForLocale } from "@/lib/i18n/api-errors";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/constants";

export type UsageRecord = {
  id?: string;
  user_id: string;
  agent_slug: string;
  conversation_id?: string;
  tokens_input: number;
  tokens_output: number;
  created_at?: string;
};

export type UsageSummary = {
  userId: string;
  agentSlug: string;
  period: string;
  conversations: number;
  tokensUsed: number;
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

function periodBounds(year: number, month: number) {
  const periodStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();
  return { periodStart, periodEnd };
}

export async function getUserAgent(
  userId: string,
  agentSlug: string,
): Promise<UserAgentRecord | null> {
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

/**
 * Verifica se l'utente può eseguire l'agente:
 * - deve possedere l'agente con abbonamento active
 * - se current_period_end è passato, è scaduto e va rinnovato
 */
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
      message: apiErrorMessageForLocale(locale, "subscriptionInactive", {
        status: userAgent.status,
      }),
    };
  }
  // Blocco solo a fine periodo se non rinnovato
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
    conversation_id: usage.conversation_id ?? null,
    status: "completed",
    input_tokens: usage.tokens_input,
    output_tokens: usage.tokens_output,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  });
  if (error) console.error("Failed to record usage:", error);
}

export async function recordUsageAndReportOverage(usage: UsageRecord): Promise<void> {
  // Token eliminati: registra solo l'uso per analytics, nessun overage
  await recordUsage(usage);
}

// Compat: resolveTokenLimit non più usato ma tenuto per non rompere import legacy
export function resolveTokenLimit(_config: Record<string, unknown>): number {
  return Number.MAX_SAFE_INTEGER;
}

export async function getUsageSummary(
  userId: string,
  agentSlug: string,
  year: number,
  month: number,
): Promise<UsageSummary | null> {
  const db = await getDb();
  if (!db) return null;
  const { periodStart, periodEnd } = periodBounds(year, month);
  const { count: conversations } = await db
    .from("agent_runs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("agent_slug", agentSlug)
    .eq("status", "completed")
    .gte("started_at", periodStart)
    .lte("started_at", periodEnd);
  const { data: runs } = await db
    .from("agent_runs")
    .select("input_tokens, output_tokens")
    .eq("user_id", userId)
    .eq("agent_slug", agentSlug)
    .gte("started_at", periodStart)
    .lte("started_at", periodEnd);
  const totalTokens =
    runs?.reduce((sum, run) => sum + (run.input_tokens || 0) + (run.output_tokens || 0), 0) || 0;
  return {
    userId,
    agentSlug,
    period: `${year}-${month.toString().padStart(2, "0")}`,
    conversations: conversations || 0,
    tokensUsed: totalTokens,
  };
}
