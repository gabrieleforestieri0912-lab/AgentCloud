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
 * True quando overage può fatturare: STRIPE_SECRET_KEY + STRIPE_OVERAGE_PRICE_ID configurati.
 */
export function isOverageBillingEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_OVERAGE_PRICE_ID);
}

/**
 * Converte token in overage in unità meter (1.000 token l'una), arrotondando per eccesso.
 */
export function calculateMeterUnits(overageTokens: number): number {
  if (overageTokens <= 0) return 0;
  return Math.max(1, Math.ceil(overageTokens / 1000));
}

/**
 * Addebito stimato (centesimi) per token in overage.
 */
export function calculateOverageAmountCents(overageTokens: number): number {
  return calculateMeterUnits(overageTokens) * OVERAGE_RATE_PER_1000_TOKENS;
}

/**
 * Trova o crea l'item metered dell'overage su un abbonamento.
 * Idempotente: riusa item esistente se Price già agganciato.
 */
export async function getOrCreateMeterItem(stripeSubscriptionId: string): Promise<string | null> {
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
    console.error(`Failed to attach overage meter to subscription ${stripeSubscriptionId}:`, error);
    return null;
  }
}

export type OverageReport = {
  stripeCustomerId: string;
  overageTokens: number;
  idempotencyKey: string;
};

/**
 * Segnala token in overage come evento Billing Meter.
 * `payload.stripe_customer_id` + `value` unità da 1.000. Idempotente via `identifier`.
 */
export async function reportOverageUsage(report: OverageReport): Promise<boolean> {
  const stripe = getStripe();
  const units = calculateMeterUnits(report.overageTokens);
  if (!stripe || units <= 0) return false;

  const eventName = process.env.STRIPE_OVERAGE_METER_EVENT || "agentcloud_token_overage";

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
    console.error(`Failed to report overage usage for customer ${report.stripeCustomerId}:`, error);
    return false;
  }
}
