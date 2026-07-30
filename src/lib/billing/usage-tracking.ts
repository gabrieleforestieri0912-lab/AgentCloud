/**
 * Usage tracking for AgentCloud
 *
 * Tracks conversation usage per user/agent to enforce plan limits
 * and calculate overage charges.
 */

import { createClient } from "@/lib/supabase/server";

export type UsageRecord = {
  id?: string;
  user_id: string;
  agent_slug: string;
  conversation_id: string;
  tokens_input: number;
  tokens_output: number;
  created_at?: string;
};

export type UsageSummary = {
  userId: string;
  agentSlug: string;
  period: string; // YYYY-MM format
  conversations: number;
  totalTokens: number;
  limit: number;
  overage: number;
};

/**
 * Record a conversation usage event
 */
export async function recordUsage(usage: UsageRecord): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("agent_runs").insert({
    user_id: usage.user_id,
    user_agent_id: null, // Will be updated if we have it
    agent_slug: usage.agent_slug,
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
 * Get usage summary for a user in a specific period
 */
export async function getUsageSummary(
  userId: string,
  agentSlug: string,
  year: number,
  month: number,
): Promise<UsageSummary | null> {
  const supabase = await createClient();

  const periodStart = new Date(year, month - 1, 1).toISOString();
  const periodEnd = new Date(year, month, 0, 23, 59, 59).toISOString();

  // Get conversation count
  const { count: conversations } = await supabase
    .from("agent_runs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("agent_slug", agentSlug)
    .gte("started_at", periodStart)
    .lte("started_at", periodEnd);

  // Get token usage
  const { data: runs } = await supabase
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

  // Get plan limit from user_agents
  const { data: userAgent } = await supabase
    .from("user_agents")
    .select("config")
    .eq("user_id", userId)
    .eq("agent_slug", agentSlug)
    .single();

  const config = userAgent?.config || {};
  const limit = config.conversationLimit || 300; // Default to Starter plan

  return {
    userId,
    agentSlug,
    period: `${year}-${month.toString().padStart(2, "0")}`,
    conversations: conversationCount,
    totalTokens,
    limit,
    overage: Math.max(0, conversationCount - limit),
  };
}

/**
 * Check if user has exceeded their plan limit
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

  return summary.conversations >= summary.limit;
}

/**
 * Get usage stats for all agents of a user
 */
export async function getTotalUsage(
  userId: string,
  year: number,
  month: number,
): Promise<Map<string, UsageSummary>> {
  const supabase = await createClient();

  const periodStart = new Date(year, month - 1, 1).toISOString();
  const periodEnd = new Date(year, month, 0, 23, 59, 59).toISOString();

  // Get all runs for the user in this period
  const { data: runs } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("user_id", userId)
    .gte("started_at", periodStart)
    .lte("started_at", periodEnd);

  if (!runs || runs.length === 0) {
    return new Map();
  }

  // Group by agent
  const usageByAgent = new Map<string, UsageSummary>();

  for (const run of runs) {
    const agentSlug = run.agent_slug;
    const existing = usageByAgent.get(agentSlug);

    if (existing) {
      existing.conversations += 1;
      existing.totalTokens +=
        (run.input_tokens || 0) + (run.output_tokens || 0);
    } else {
      usageByAgent.set(agentSlug, {
        userId,
        agentSlug,
        period: `${year}-${month.toString().padStart(2, "0")}`,
        conversations: 1,
        totalTokens: (run.input_tokens || 0) + (run.output_tokens || 0),
        limit: 300, // Default, should be fetched from user_agents
        overage: 0,
      });
    }
  }

  return usageByAgent;
}

/**
 * Update user agent config with plan details
 */
export async function updateUserAgentPlan(
  userId: string,
  agentSlug: string,
  plan: {
    conversationLimit: number;
    price: number;
    planId: string;
  },
): Promise<void> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("user_agents")
    .select("config")
    .eq("user_id", userId)
    .eq("agent_slug", agentSlug)
    .single();

  const config = existing?.config || {};
  config.conversationLimit = plan.conversationLimit;
  config.planPrice = plan.price;
  config.planId = plan.planId;

  await supabase
    .from("user_agents")
    .update({ config })
    .eq("user_id", userId)
    .eq("agent_slug", agentSlug);
}
