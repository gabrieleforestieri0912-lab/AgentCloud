/**
 * Fatturazione overage Stripe (Billing Meter).
 *
 * Perché esiste: quando un utente supera la sua allowance mensile di token, i
 * token extra non vengono più bloccati: vengono fatturati tramite un prezzo
 * *metered* collegato all'abbonamento del cliente. L'utilizzo è riportato come
 * eventi Billing Meter (`billing.meterEvents.create`) e Stripe lo fattura
 * automaticamente a fine periodo insieme al rinnovo. Stripe gestisce anche i
 * nuovi tentativi di pagamento (dunning).
 *
 * Stripe SDK v22 ha rimosso la legacy `usage_records` in favore dei Billing
 * Meters, quindi la configurazione è:
 *   1. un Meter nella dashboard Stripe (nome evento, somma aggregata,
 *      cliente mappato via `stripe_customer_id`);
 *   2. un prezzo metered (€0,30 per 1.000 token, mensile) che lo referenzia
 *      (`STRIPE_OVERAGE_PRICE_ID`);
 *   3. il prezzo collegato all'abbonamento del cliente;
 *   4. un evento meter per ogni esecuzione in overage: valore = unità intere
 *      da 1.000 token.
 *
 * Modulo server-only: serve STRIPE_SECRET_KEY e non va mai importato da
 * componenti client.
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
