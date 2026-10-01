import { COUPON_CODE, COUPON_MAX_USES, couponIsApplicable, couponDiscountCents, couponDiscountedPrice } from "./coupon";

export type CouponState = {
  code: string;
  enabled: boolean;
  remaining: number;
  max: number;
  discountCents: number;
  discountedPrice: string;
  applied: boolean;
  /** Ultimo timestamp (ms) in cui è stato decrementato. */
  lastUpdated: number | null;
};

let state: CouponState = {
  code: COUPON_CODE,
  enabled: false,
  remaining: COUPON_MAX_USES,
  max: COUPON_MAX_USES,
  discountCents: 0,
  discountedPrice: "",
  applied: false,
  lastUpdated: null,
};

/** Legge lo stato precaricato dal server (usato nelle route dinamiche). */
export function preloadCouponState(remote: Partial<CouponState> | null) {
  if (!remote) return;
  state = {
    code: remote.code ?? COUPON_CODE,
    enabled: remote.enabled ?? false,
    remaining: remote.remaining ?? COUPON_MAX_USES,
    max: remote.max ?? COUPON_MAX_USES,
    discountCents: remote.discountCents ?? 0,
    discountedPrice: remote.discountedPrice ?? "",
    applied: remote.applied ?? false,
    lastUpdated: remote.lastUpdated ?? null,
  };
}

export function getCoupon(): CouponState {
  // First render (SSR) must not call localStorage which can throw in some
  // sandboxed iframes / privacy modes.
  if (typeof window === "undefined") return state;
  try {
    const raw = localStorage.getItem(`coupon_${COUPON_CODE}_state`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<CouponState>;
        state = {
          code: parsed.code ?? COUPON_CODE,
          enabled: parsed.enabled ?? false,
          remaining: parsed.remaining ?? COUPON_MAX_USES,
          max: parsed.max ?? COUPON_MAX_USES,
          discountCents: parsed.discountCents ?? 0,
          discountedPrice: parsed.discountedPrice ?? "",
          applied: parsed.applied ?? false,
          lastUpdated: parsed.lastUpdated ?? null,
        };
      } catch {
        // corrupt state -> reset to defaults
      }
    }
  } catch {
    // storage non disponibile: resta lo stato in memoria
  }
  return state;
}

export function saveCouponState() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`coupon_${COUPON_CODE}_state`, JSON.stringify(state));
  } catch {
    // ignorabile
  }
}

/**
 * Applica il coupon sul prezzo di un agente.
 * Restituisce il prezzo scontato (stringa €) e i cents risparmiati.
 * Valida sempre sul server (limit 20 uses) prima di aggiornare lo state.
 */
export function applyCoupon(priceCents: number): { discounted: string; discountCents: number } {
  if (!couponIsApplicable(priceCents)) {
    state.applied = false;
    state.discountCents = 0;
    state.discountedPrice = "";
    saveCouponState();
    return { discounted: "", discountCents: 0 };
  }

  const discountCents = couponDiscountCents(priceCents);
  const discounted = couponDiscountedPrice(priceCents);

  state.applied = true;
  state.discountCents = discountCents;
  state.discountedPrice = discounted;
  saveCouponState();

  return { discounted, discountCents };
}

/** Resetta il coupon se il prezzo non è più nella fascia applicabile. */
export function resetCouponIfNotApplicable(priceCents: number) {
  if (!couponIsApplicable(priceCents)) {
    applyCoupon(0);
  }
}
