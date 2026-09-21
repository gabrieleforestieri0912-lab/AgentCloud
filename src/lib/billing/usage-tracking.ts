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
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/constants";
import { DEFAULT_TOKEN_LIMIT, OVERAGE_HARD_CAP_MULTIPLIER } from "./pricing";

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
  tokenLimit: number;
  overage: number;
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

  const tokenLimit = resolveTokenLimit(userAgent.config);
  const now = new Date();
  const summary = await getUsageSummary(userId, agentSlug, now.getFullYear(), now.getMonth() + 1);
  const used = summary?.tokensUsed ?? 0;

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
            cap: hardCap.toLocaleString(locale === "en" ? "en-US" : "it-IT"),
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
        limit: tokenLimit.toLocaleString(locale === "en" ? "en-US" : "it-IT"),
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

  const tokenLimit = userAgent ? resolveTokenLimit(userAgent.config) : DEFAULT_TOKEN_LIMIT;
  const now = new Date();
  const summary = await getUsageSummary(usage.user_id, usage.agent_slug, now.getFullYear(), now.getMonth() + 1);
  const usedBefore = summary?.tokensUsed ?? 0;
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

export async function getUsageSummary(userId: string, agentSlug: string, year: number, month: number): Promise<UsageSummary | null> {
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
  const totalTokens = runs?.reduce((sum, run) => sum + (run.input_tokens || 0) + (run.output_tokens || 0), 0) || 0;
  const userAgent = await getUserAgent(userId, agentSlug);
  const config = userAgent?.config ?? {};
  const tokenLimit = resolveTokenLimit(config);
  return {
    userId,
    agentSlug,
    period: `${year}-${month.toString().padStart(2, "0")}`,
    conversations: conversations || 0,
    tokensUsed: totalTokens,
    tokenLimit,
    overage: Math.max(0, totalTokens - tokenLimit),
  };
}
