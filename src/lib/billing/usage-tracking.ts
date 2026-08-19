/**
 * Usage tracking for AgentCloud
 *
 * Tracks conversation usage per user/agent to enforce plan limits
 * and calculate overage charges.
 *
 * Limits are enforced on TOKENS (input + output) per month, per installed
 * agent. Conversation counts are kept for reporting only.
 *
 * IMPORTANT: This module is server-only. It prefers the service-role client
 * so it can write/read rows keyed by external (Clerk) user IDs, and falls
 * back to the anon client when `SUPABASE_SERVICE_ROLE_KEY` is not set.
 * Never import these functions from client components.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getOrCreateMeterItem,
  isOverageBillingEnabled,
  reportOverageUsage,
} from "@/lib/stripe/overage";
import { apiErrorMessageForLocale } from "@/lib/i18n/api-errors";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/constants";
import {
  DEFAULT_TOKEN_LIMIT,
  OVERAGE_HARD_CAP_MULTIPLIER,
} from "./pricing";

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
  period: string; // YYYY-MM format
  conversations: number; // informational only
  tokensUsed: number; // input + output tokens in the period
  tokenLimit: number; // monthly token allowance
  overage: number; // tokens over the allowance (0 when under)
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

/**
 * Result of a pre-run permission check.
 *
 * `allowed: true` is always accompanied by `overage`: when the user is above
 * their monthly allowance the run is allowed anyway and billed via the
 * Stripe meter (`overage: true`), unless the safety cap was hit (429).
 */
export type RunCheck =
  | { allowed: true; overage: boolean }
  | {
      allowed: false;
      status: number; // HTTP status to return (402 / 429 / 500)
      code: string;
      message: string;
    };

async function getDb() {
  return createAdminClient() ?? (await createClient());
}

function periodBounds(year: number, month: number) {
  const periodStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const periodEnd = new Date(
    Date.UTC(year, month, 0, 23, 59, 59, 999),
  ).toISOString();
  return { periodStart, periodEnd };
}

/**
 * Fetch a user's agent instance (ownership + status + config).
 * Returns null when the user does not own the agent.
 */
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
 * Resolve the monthly token allowance for a user's agent instance.
 * Prefers the new `tokenLimit` config, falls back to the legacy
 * `conversationLimit` (rows written before the token-based migration),
 * then to the default allowance.
 */
export function resolveTokenLimit(config: Record<string, unknown>): number {
  if (typeof config.tokenLimit === "number") return config.tokenLimit;
  if (typeof config.conversationLimit === "number") {
    // Legacy rows stored a conversation budget (300/1000). Map it to the
    // token allowance of the same plan tier. Note: a legacy limit of 0
    // (fully blocked) maps to the default allowance — an acceptable
    // one-time forgiveness during migration.
    return config.conversationLimit >= 1000
      ? 1_000_000
      : DEFAULT_TOKEN_LIMIT;
  }
  return DEFAULT_TOKEN_LIMIT;
}

/**
 * Check whether a logged-in user is allowed to run an agent:
 *  1. They must own the agent with an `active` subscription.
 *  2. They must not have exceeded the monthly token allowance.
 *
 * Anonymous/preview callers should skip this check and call
 * `recordUsage` with a `user_id` of "anonymous".
 */
export async function assertRunAllowed(
  userId: string,
  agentSlug: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<RunCheck> {
  if (!userId || userId === "anonymous") {
    return { allowed: true, overage: false };
  }

  const db = await getDb();
  if (!db) {
    // No DB configured — don't block local dev
    return { allowed: true, overage: false };
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
      message: apiErrorMessageForLocale(locale, "subscriptionInactive", {
        status: userAgent.status,
      }),
    };
  }

  const tokenLimit = resolveTokenLimit(userAgent.config);

  const now = new Date();
  const summary = await getUsageSummary(
    userId,
    agentSlug,
    now.getFullYear(),
    now.getMonth() + 1,
  );

  const used = summary?.tokensUsed ?? 0;

  // Overage billing kicks in only for customers with a real subscription AND
  // a Stripe customer id, and when the metered Price is configured. Otherwise
  // keep the previous behaviour: block at the allowance with 429.
  const overageAvailable =
    Boolean(userAgent.stripe_subscription_id) &&
    Boolean(userAgent.stripe_customer_id) &&
    isOverageBillingEnabled();

  if (used >= tokenLimit) {
    if (overageAvailable) {
      // Safety net: beyond 2x the allowance even overage usage is blocked.
      const hardCap = tokenLimit * OVERAGE_HARD_CAP_MULTIPLIER;
      if (used >= hardCap) {
        return {
          allowed: false,
          status: 429,
          code: "OVERAGE_CAP_REACHED",
          message: apiErrorMessageForLocale(locale, "overageCapReached", {
            cap: hardCap.toLocaleString(
              locale === "en" ? "en-US" : "it-IT",
            ),
            multiplier: OVERAGE_HARD_CAP_MULTIPLIER,
          }),
        };
      }
      // Above the allowance but below the cap: allowed, billed via the meter.
      return { allowed: true, overage: true };
    }

    return {
      allowed: false,
      status: 429,
      code: "LIMIT_EXCEEDED",
      message: apiErrorMessageForLocale(locale, "limitExceeded", {
        limit: tokenLimit.toLocaleString(
          locale === "en" ? "en-US" : "it-IT",
        ),
      }),
    };
  }

  return { allowed: true, overage: false };
}

/**
 * Record a conversation usage event.
 */
export async function recordUsage(usage: UsageRecord): Promise<void> {
  if (!usage.user_id || !usage.agent_slug) return;

  const db = await getDb();
  if (!db) return;

  // Resolve the user_agents row so we can link the run to the subscription.
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

  if (error) {
    console.error("Failed to record usage:", error);
  }
}

/**
 * Record a run AND bill its overage increment via Stripe.
 *
 * Called after a run finishes. Only the tokens of THIS run that fall above the
 * monthly allowance are reported to the meter (incremental, so consecutive
 * overage runs are not double-charged). When overage billing is not available
 * (no subscription, no metered Price configured) this behaves exactly like
 * `recordUsage`.
 */
export async function recordUsageAndReportOverage(
  usage: UsageRecord,
): Promise<void> {
  if (!usage.user_id || !usage.agent_slug) return;

  if (usage.user_id === "anonymous") {
    await recordUsage(usage);
    return;
  }

  const userAgent = await getUserAgent(usage.user_id, usage.agent_slug);
  const subscriptionId = userAgent?.stripe_subscription_id ?? null;
  const stripeCustomerId = userAgent?.stripe_customer_id ?? null;

  // Fast path: no way to bill → just log the run, exactly like before.
  if (!subscriptionId || !stripeCustomerId || !isOverageBillingEnabled()) {
    await recordUsage(usage);
    return;
  }

  const tokenLimit = userAgent
    ? resolveTokenLimit(userAgent.config)
    : DEFAULT_TOKEN_LIMIT;

  // Snapshot usage BEFORE this run so we bill only the increment above the
  // allowance: tokens of this run beyond the remaining allowance.
  // (Two concurrent runs can still race here; the error is bounded to a few
  // tokens and corrected on the next report.)
  const now = new Date();
  const summary = await getUsageSummary(
    usage.user_id,
    usage.agent_slug,
    now.getFullYear(),
    now.getMonth() + 1,
  );
  const usedBefore = summary?.tokensUsed ?? 0;
  const runTokens = (usage.tokens_input || 0) + (usage.tokens_output || 0);
  const remainingAllowance = Math.max(0, tokenLimit - usedBefore);
  const overageTokens = Math.max(0, runTokens - remainingAllowance);

  await recordUsage(usage);

  if (overageTokens <= 0) return;

  // Ensure the metered overage Price is attached to the subscription, then
  // report this run's overage as a Billing Meter event. The webhook stores the
  // subscription item id in config at checkout, so we only hit the Stripe API
  // when it is missing (e.g. legacy subscriptions).
  const storedItemId = userAgent?.config?.stripeSubscriptionItemId;
  const meterItemId =
    (typeof storedItemId === "string" && storedItemId.length > 0
      ? storedItemId
      : null) ?? (await getOrCreateMeterItem(subscriptionId));
  if (!meterItemId) return;

  await reportOverageUsage({
    stripeCustomerId,
    overageTokens,
    idempotencyKey: usage.conversation_id ?? crypto.randomUUID(),
  });
}

/**
 * Get usage summary for a user in a specific period.
 */
export async function getUsageSummary(
  userId: string,
  agentSlug: string,
  year: number,
  month: number,
): Promise<UsageSummary | null> {
  const db = await getDb();
  if (!db) return null;

  const { periodStart, periodEnd } = periodBounds(year, month);

  // Get conversation count (only completed runs count toward the quota).
  const { count: conversations } = await db
    .from("agent_runs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("agent_slug", agentSlug)
    .eq("status", "completed")
    .gte("started_at", periodStart)
    .lte("started_at", periodEnd);

  // Get token usage. Unlike the conversation count above, this sums tokens
  // from ALL runs (no status filter): interrupted/failed runs still consume
  // provider tokens, so they count toward the allowance too.
  const { data: runs } = await db
    .from("agent_runs")
    .select("input_tokens, output_tokens")
    .eq("user_id", userId)
    .eq("agent_slug", agentSlug)
    .gte("started_at", periodStart)
    .lte("started_at", periodEnd);

  const totalTokens =
    runs?.reduce(
      (sum, run) => sum + (run.input_tokens || 0) + (run.output_tokens || 0),
      0,
    ) || 0;

  const conversationCount = conversations || 0;

  // Get plan allowance from user_agents
  const userAgent = await getUserAgent(userId, agentSlug);
  const config = userAgent?.config ?? {};
  const tokenLimit = resolveTokenLimit(config);

  return {
    userId,
    agentSlug,
    period: `${year}-${month.toString().padStart(2, "0")}`,
    conversations: conversationCount,
    tokensUsed: totalTokens,
    tokenLimit,
    overage: Math.max(0, totalTokens - tokenLimit),
  };
}

/**
 * Check if user has exceeded their plan limit.
 */
export async function hasExceededLimit(
  userId: string,
  agentSlug: string,
): Promise<boolean> {
  const now = new Date();
  const summary = await getUsageSummary(
    userId,
    agentSlug,
    now.getFullYear(),
    now.getMonth() + 1,
  );

  if (!summary) return false;

  return summary.tokensUsed >= summary.tokenLimit;
}

/**
 * Get usage stats for all agents of a user.
 */
export async function getTotalUsage(
  userId: string,
  year: number,
  month: number,
): Promise<Map<string, UsageSummary>> {
  const db = await getDb();
  if (!db) return new Map();

  const { periodStart, periodEnd } = periodBounds(year, month);

  const { data: runs } = await db
    .from("agent_runs")
    .select("*")
    .eq("user_id", userId)
    .gte("started_at", periodStart)
    .lte("started_at", periodEnd);

  if (!runs || runs.length === 0) {
    return new Map();
  }

  const usageByAgent = new Map<string, UsageSummary>();

  for (const run of runs) {
    const agentSlug = run.agent_slug;
    const existing = usageByAgent.get(agentSlug);

    if (existing) {
      existing.conversations += 1;
      existing.tokensUsed +=
        (run.input_tokens || 0) + (run.output_tokens || 0);
    } else {
      usageByAgent.set(agentSlug, {
        userId,
        agentSlug,
        period: `${year}-${month.toString().padStart(2, "0")}`,
        conversations: 1,
        tokensUsed: (run.input_tokens || 0) + (run.output_tokens || 0),
        tokenLimit: DEFAULT_TOKEN_LIMIT,
        overage: 0,
      });
    }
  }

  return usageByAgent;
}

/**
 * Update user agent config with plan details.
 */
export async function updateUserAgentPlan(
  userId: string,
  agentSlug: string,
  plan: {
    tokenLimit: number;
    price: number;
    planId: string;
  },
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await getUserAgent(userId, agentSlug);
  const config = existing?.config ?? {};
  config.tokenLimit = plan.tokenLimit;
  config.planPrice = plan.price;
  config.planId = plan.planId;

  await db
    .from("user_agents")
    .update({ config })
    .eq("user_id", userId)
    .eq("agent_slug", agentSlug);
}
