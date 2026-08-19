/**
 * Stripe overage billing (Billing Meter).
 *
 * When a user exceeds their monthly token allowance, the extra tokens are no
 * longer blocked: they are billed through a *metered* Price attached to the
 * customer's subscription. Usage is reported as Billing Meter events
 * (`billing.meterEvents.create`) and Stripe invoices it automatically at the
 * end of the billing period, together with the renewal. Stripe also handles
 * payment retries (dunning).
 *
 * Stripe SDK v22 dropped the legacy `usage_records` API in favour of Billing
 * Meters, so the setup is:
 *   1. a Meter in the Stripe dashboard (event name, aggregation sum,
 *      customer mapped via `stripe_customer_id`);
 *   2. a metered Price (€0,30 per 1.000 tokens, monthly) referencing it
 *      (`STRIPE_OVERAGE_PRICE_ID`);
 *   3. the Price attached to the customer subscription;
 *   4. one meter event per overage run: value = whole units of 1.000 tokens.
 *
 * This module is server-only: it needs STRIPE_SECRET_KEY and must never be
 * imported from client components.
 */

import Stripe from "stripe";
import { OVERAGE_RATE_PER_1000_TOKENS } from "@/lib/billing/pricing";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, {});
}

/**
 * True when overage billing can actually charge customers: the Stripe secret
 * key AND the metered overage Price are both configured.
 */
export function isOverageBillingEnabled(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_OVERAGE_PRICE_ID,
  );
}

/**
 * Convert an overage token count into whole meter units (1.000 tokens each),
 * rounding up so the customer is charged for at least the tokens they used.
 */
export function calculateMeterUnits(overageTokens: number): number {
  if (overageTokens <= 0) return 0;
  return Math.max(1, Math.ceil(overageTokens / 1000));
}

/**
 * Estimated charge (cents) for an overage token count: whole meter units ×
 * the per-1.000-token rate. Mirrors the Stripe metered Price and is used for
 * UI copy (e.g. the dashboard overage footnote).
 */
export function calculateOverageAmountCents(overageTokens: number): number {
  return calculateMeterUnits(overageTokens) * OVERAGE_RATE_PER_1000_TOKENS;
}

/**
 * Find or create the metered overage item on a subscription.
 *
 * Idempotent across processes: lists the subscription items first and reuses
 * the existing one when the overage Price is already attached (this happens
 * when several agents of the same plan share one subscription — they must all
 * report against the same meter item, never create duplicates).
 *
 * Returns the `si_...` subscription item id, or null when overage billing is
 * not configured or Stripe is unreachable (caller logs and skips).
 */
export async function getOrCreateMeterItem(
  stripeSubscriptionId: string,
): Promise<string | null> {
  const stripe = getStripe();
  const priceId = process.env.STRIPE_OVERAGE_PRICE_ID;
  if (!stripe || !priceId) return null;

  try {
    const { data: items } = await stripe.subscriptionItems.list({
      subscription: stripeSubscriptionId,
      limit: 100,
    });

    const existing = items.find((item) => item.price?.id === priceId);
    if (existing) return existing.id;

    const created = await stripe.subscriptionItems.create({
      subscription: stripeSubscriptionId,
      price: priceId,
    });
    return created.id;
  } catch (error) {
    console.error(
      `Failed to attach overage meter to subscription ${stripeSubscriptionId}:`,
      error,
    );
    return null;
  }
}

export type OverageReport = {
  stripeCustomerId: string;
  overageTokens: number;
  idempotencyKey: string;
};

/**
 * Report overage tokens as a Billing Meter event, incrementally.
 *
 * The event is attributed to the customer via `payload.stripe_customer_id`
 * and carries the overage as whole units of 1.000 tokens. The meter's
 * aggregation (sum) accumulates these units over the billing period.
 *
 * `idempotencyKey` should be unique per run (e.g. the run's conversation id):
 * it is sent as the event `identifier`, so a retry can never double-report
 * the same run.
 */
export async function reportOverageUsage(
  report: OverageReport,
): Promise<boolean> {
  const stripe = getStripe();
  const units = calculateMeterUnits(report.overageTokens);
  if (!stripe || units <= 0) return false;

  const eventName =
    process.env.STRIPE_OVERAGE_METER_EVENT || "agentcloud_token_overage";

  try {
    await stripe.billing.meterEvents.create({
      event_name: eventName,
      payload: {
        stripe_customer_id: report.stripeCustomerId,
        value: String(units),
      },
      identifier: `overage-${report.idempotencyKey}`,
    });
    return true;
  } catch (error) {
    console.error(
      `Failed to report overage usage for customer ${report.stripeCustomerId}:`,
      error,
    );
    return false;
  }
}
