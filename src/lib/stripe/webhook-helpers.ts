/**
 * Pure helpers for resolving Stripe checkout events.
 * Kept framework-free so they can be unit tested without Stripe/Supabase.
 */

import {
  DEFAULT_TOKEN_LIMIT,
  getPlan,
} from "@/lib/billing/pricing";
import {
  SERVICES_LAUNCH_CONFIG,
  SHOPIFY_LAUNCH_CONFIG,
} from "@/lib/agents/feature-flags";

export type Vertical = "shopify" | "services";

export type CheckoutMetadata = {
  userId: string | null;
  email: string | null;
  agentId: string | null;
  planId: string | null;
  vertical: Vertical | null;
  tokens: number | null; // monthly token allowance
  source: string | null;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Normalize Stripe checkout session metadata into a typed object.
 * Accepts values from `session.metadata` (Payment Links inject every param
 * under `metadata[...]`, including `client_reference_id` and `email`).
 */
export function parseCheckoutMetadata(
  metadata: Record<string, unknown>,
  extra?: { client_reference_id?: unknown; email?: unknown },
): CheckoutMetadata {
  // New key is `tokens`; fall back to legacy `conversations` so payment
  // links created before the token migration keep working.
  const tokensRaw = asString(metadata.tokens) ?? asString(metadata.conversations);
  const tokens = tokensRaw ? Number(tokensRaw) : null;
  const vertical = asString(metadata.vertical);

  return {
    userId:
      asString(metadata.client_reference_id) ??
      asString(metadata.user_id) ??
      asString(extra?.client_reference_id),
    email:
      asString(metadata.email) ?? asString(extra?.email),
    agentId: asString(metadata.agent_id),
    planId: asString(metadata.plan_id),
    vertical: vertical === "shopify" || vertical === "services" ? vertical : null,
    tokens: tokens !== null && Number.isFinite(tokens) ? tokens : null,
    source: asString(metadata.source),
  };
}

export type CheckoutResolution = {
  agentIds: string[];
  tokenLimit: number;
  planId: string | null;
  vertical: Vertical | null;
};

/**
 * Map a normalized checkout to the list of agents the customer should own
 * and the monthly token allowance of their plan.
 *
 * - Agent-based checkouts: the single agent, with the configured allowance.
 * - Plan-based checkouts: all agents of the vertical, with the plan allowance.
 */
export function resolveCheckoutAgents(info: CheckoutMetadata): CheckoutResolution {
  if (info.agentId) {
    return {
      agentIds: [info.agentId],
      tokenLimit: info.tokens ?? DEFAULT_TOKEN_LIMIT,
      planId: null,
      vertical: null,
    };
  }

  if (info.planId && info.vertical) {
    // plan_id arrives as `${vertical}-${tier}` (e.g. "shopify-growth");
    // getPlan expects only the tier.
    const tier = info.planId.startsWith(`${info.vertical}-`)
      ? info.planId.slice(info.vertical.length + 1)
      : info.planId;
    const plan = getPlan(info.vertical, tier as "starter" | "growth");
    if (plan) {
      const launchConfig =
        info.vertical === "shopify"
          ? SHOPIFY_LAUNCH_CONFIG
          : SERVICES_LAUNCH_CONFIG;
      return {
        agentIds: launchConfig.enabledAgents,
        tokenLimit: plan.tokens,
        // plan_id is already stored as `${vertical}-${tier}` by the payment-link route.
        planId: info.planId,
        vertical: info.vertical,
      };
    }
  }

  return {
    agentIds: [],
    tokenLimit: DEFAULT_TOKEN_LIMIT,
    planId: null,
    vertical: null,
  };
}
