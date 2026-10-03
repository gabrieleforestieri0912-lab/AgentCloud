/**
 * Coupon 50%-OFF per la prima season (tutte le fasce 4,99€–14,99€).
 *
 * Regola di prodotto:
 * - codice fisso: `AGENTCLOUD50`
 * - sconto: 50% sul prezzo dell'agente (tutti gli agenti 4,99€–14,99€) e
 *   50% sui bundle (qualsiasi importo: i totali trimestrali/annuali superano
 *   comunque il tetto pensato per i singoli agenti)
 * - utilizzi massimi: 20 (consumati dal server al momento della creazione
 *   del checkout Stripe, non al claim del banner)
 * - lo sconto è applicato server-side nello Stripe Checkout come prezzo già
 *   scontato: su Stripe non compare alcun campo coupon.
 */

export const COUPON_CODE = "AGENTCLOUD50";
export const COUPON_PERCENT = 50; // 50%
export const COUPON_MAX_USES = 20;
export const COUPON_APPLIES_TO_LOW_PRICE = 499; // in centesimi: 4,99€
export const COUPON_MAX_PRICE = 1499; // in centesimi: 14,99€

export function couponIsApplicable(priceCents: number): boolean {
  if (!Number.isFinite(priceCents)) return false;
  return priceCents >= COUPON_APPLIES_TO_LOW_PRICE && priceCents <= COUPON_MAX_PRICE;
}

export function couponDiscountCents(priceCents: number): number {
  if (!couponIsApplicable(priceCents)) return 0;
  return couponRawDiscountCents(priceCents);
}

/**
 * Sconto 50% senza vincoli di fascia (per i bundle, i cui totali superano
 * il tetto pensato per i singoli agenti). Chiamare solo dopo aver validato
 * il codice coupon.
 */
export function couponRawDiscountCents(priceCents: number): number {
  if (!Number.isFinite(priceCents) || priceCents <= 0) return 0;
  return Math.round((priceCents * COUPON_PERCENT) / 100);
}

export function couponDiscountAmount(priceCents: number): string {
  return `€${priceCents / 100 - couponDiscountCents(priceCents) / 100}`;
}

export function couponDiscountedPrice(priceCents: number): string {
  return `€${priceCents / 100 - couponDiscountCents(priceCents) / 100}`;
}

/**
 * Verifica se il coupon promozionale è attivo (usi rimanenti > 0).
 * Usa un controllo client-side basato su localStorage con fallback a 20 usi.
 */
import { type CouponState } from "./coupon-store";

export function isCouponActive(): CouponState | null {
  if (typeof window === "undefined") {
    // SSR: coupon sempre "attivo" per mostrare il banner, il controllo reale è server-side
    return {
      code: COUPON_CODE,
      enabled: true,
      remaining: COUPON_MAX_USES,
      max: COUPON_MAX_USES,
      discountCents: 0,
      discountedPrice: "",
      applied: false,
      lastUpdated: null,
    };
  }

  try {
    const raw = localStorage.getItem("coupon_agentcloud50_uses_left");
    if (raw) {
      const map = new Map<string, number>(JSON.parse(raw));
      const remaining = (map.get("0") as number) ?? COUPON_MAX_USES;
      if (remaining > 0) {
        return {
          code: COUPON_CODE,
          enabled: true,
          remaining,
          max: COUPON_MAX_USES,
          discountCents: 0,
          discountedPrice: "",
          applied: false,
          lastUpdated: null,
        };
      }
    }
  } catch {
    // storage non disponibile o corrotto
  }

  // Default: coupon attivo con 20 usi se non c'è stato salvato
  return {
    code: COUPON_CODE,
    enabled: true,
    remaining: COUPON_MAX_USES,
    max: COUPON_MAX_USES,
    discountCents: 0,
    discountedPrice: "",
    applied: false,
    lastUpdated: null,
  };
}

/**
 * Restituisce il limite rimanente del coupon per il server-side rendering.
 * Chiama l'API interna per ottenere il valore aggiornato.
 */
export async function getCouponLimit(): Promise<{ remaining: number; max: number; active: boolean }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/coupon/limit`, {
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback silenzioso
  }
  return { remaining: COUPON_MAX_USES, max: COUPON_MAX_USES, active: true };
}