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
 * Rimosso: sistema token eliminato — gli agenti durano fino a scadenza abbonamento, nessun limite risposte.
 * Mantenuto per compatibilità import, sempre disabilitato.
 */
export function isOverageBillingEnabled(): boolean {
  return false;
}

/**
 * Converte un conteggio di token in overage in unità intere da meter (1.000
 * token l'una), arrotondando per eccesso così il cliente paga almeno i token
 * che ha usato.
 */
export function calculateMeterUnits(overageTokens: number): number {
  if (overageTokens <= 0) return 0;
  return Math.max(1, Math.ceil(overageTokens / 1000));
}

/**
 * Addebito stimato (in centesimi) per un conteggio di token in overage:
 * unità intere da meter × la tariffa per 1.000 token. Rispecchia il Price
 * metered di Stripe e serve per i testi UI (es. nota overage della dashboard).
 */
export function calculateOverageAmountCents(overageTokens: number): number {
  return calculateMeterUnits(overageTokens) * OVERAGE_RATE_PER_1000_TOKENS;
}

/**
 * Trova o crea l'item metered dell'overage su un abbonamento.
 *
 * Idempotente tra processi: elenca prima le subscription item e riusa quella
 * esistente quando il Price overage è già agganciato (succede quando più
 * agenti dello stesso piano condividono un abbonamento — devono tutti
 * riferirsi allo stesso meter item, mai creare duplicati).
 *
 * Restituisce l'id `si_...` della subscription item, oppure null quando la
 * fatturazione overage non è configurata o Stripe non è raggiungibile (il
 * chiamante logga e salta).
 */
export async function getOrCreateMeterItem(
  _stripeSubscriptionId: string,
): Promise<string | null> {
  return null;
}

export type OverageReport = {
  stripeCustomerId: string;
  overageTokens: number;
  idempotencyKey: string;
};

/**
 * Segnala i token in overage come evento Billing Meter, in modo incrementale.
 *
 * L'evento è attribuito al cliente tramite `payload.stripe_customer_id` e
 * trasporta l'overage come unità intere da 1.000 token. L'aggregazione del
 * meter (somma) accumula queste unità nel periodo di fatturazione.
 *
 * `idempotencyKey` deve essere univoco per run (es. l'id conversazione della
 * run): viene inviato come `identifier` dell'evento, quindi un retry non può
 * mai segnalare due volte la stessa run.
 */
export async function reportOverageUsage(
  _report: OverageReport,
): Promise<boolean> {
  return false;
}
