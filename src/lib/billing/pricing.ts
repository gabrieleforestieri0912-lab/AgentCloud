/**
 * Pricing configuration for AgentCloud
 *
 * Two verticals: Shopify (e-commerce) and Services (calendar booking)
 * Each has Starter and Growth plans
 * Web Search is an add-on only
 */

/**
 * Default monthly token allowance used when no plan is configured
 * (e.g. legacy agent-based purchases or development environments).
 * Tokens are counted as input + output across all agent runs in the month.
 */
export const DEFAULT_TOKEN_LIMIT = 300_000;

export type Plan = {
  id: string;
  name: string;
  price: number; // in cents
  priceDisplay: string;
  tokens: number; // max tokens per month (input + output)
  features: string[];
  addons?: {
    webSearch?: {
      price: number;
      priceDisplay: string;
      description: string;
    };
  };
};

export type VerticalPricing = {
  vertical: "shopify" | "services";
  plans: {
    starter: Plan;
    growth: Plan;
  };
};

/**
 * Shopify E-commerce Pricing
 * - Shopify Agent + Lead Capture
 */
export const SHOPIFY_PRICING: VerticalPricing = {
  vertical: "shopify",
  plans: {
    starter: {
      id: "shopify-starter",
      name: "Starter",
      price: 2900, // €29/month
      priceDisplay: "€29/mese",
      tokens: 300_000,
      features: [
        "Fino a 300.000 token/mese",
        "Ricerca prodotti Shopify",
        "Link carrello diretti",
        "Stato ordini",
        "Lead capture",
        "Supporto email",
      ],
      addons: {
        webSearch: {
          price: 1500, // €15/month
          priceDisplay: "+€15/mese",
          description: "Web search con Tavily",
        },
      },
    },
    growth: {
      id: "shopify-growth",
      name: "Growth",
      price: 3900, // €39/month
      priceDisplay: "€39/mese",
      tokens: 1_000_000,
      features: [
        "Fino a 1.000.000 token/mese",
        "Tutto del piano Starter",
        "Stato ordini avanzato",
        "Priorità supporto",
        "Analytics base",
      ],
      addons: {
        webSearch: {
          price: 1500,
          priceDisplay: "+€15/mese",
          description: "Web search con Tavily",
        },
      },
    },
  },
};

/**
 * Services Pricing (Calendar Booking + Lead Capture)
 * - For restaurants, professionals, real estate
 */
export const SERVICES_PRICING: VerticalPricing = {
  vertical: "services",
  plans: {
    starter: {
      id: "services-starter",
      name: "Starter",
      price: 2900, // €29/month
      priceDisplay: "€29/mese",
      tokens: 300_000,
      features: [
        "Fino a 300.000 token/mese",
        "Prenotazione appuntamenti",
        "Controllo disponibilità",
        "Lead capture",
        "Supporto email",
      ],
      addons: {
        webSearch: {
          price: 1500,
          priceDisplay: "+€15/mese",
          description: "Web search con Tavily",
        },
      },
    },
    growth: {
      id: "services-growth",
      name: "Growth",
      price: 3900, // €39/month
      priceDisplay: "€39/mese",
      tokens: 1_000_000,
      features: [
        "Fino a 1.000.000 token/mese",
        "Tutto del piano Starter",
        "Reminder automatici",
        "Priorità supporto",
        "Analytics base",
      ],
      addons: {
        webSearch: {
          price: 1500,
          priceDisplay: "+€15/mese",
          description: "Web search con Tavily",
        },
      },
    },
  },
};

/**
 * Get pricing for a specific vertical
 */
export function getPricing(vertical: "shopify" | "services"): VerticalPricing {
  switch (vertical) {
    case "services":
      return SERVICES_PRICING;
    case "shopify":
    default:
      return SHOPIFY_PRICING;
  }
}

/**
 * Get a specific plan
 */
export function getPlan(
  vertical: "shopify" | "services",
  planId: "starter" | "growth",
): Plan | null {
  const pricing = getPricing(vertical);
  return pricing.plans[planId] || null;
}

/**
 * Calculate cost per 1000 tokens (cents)
 * Used for monitoring profitability against plan allowances.
 */
export function calculateCostPerToken(
  planPrice: number, // in cents
  tokens: number, // monthly token allowance
): number {
  if (tokens === 0) return 0;
  return (planPrice / tokens) * 1000;
}

/**
 * Check if usage is within plan limits
 */
export function isWithinLimit(
  currentUsage: number,
  planLimit: number,
): boolean {
  return currentUsage < planLimit;
}

/**
 * Overage billing.
 *
 * Usage beyond the monthly token allowance is no longer blocked with 429:
 * it is billed automatically through a metered Price attached to the
 * customer's Stripe subscription (Stripe invoices it at the end of the
 * billing period, together with the renewal).
 *
 * - `OVERAGE_RATE_PER_1000_TOKENS`: amount charged per 1.000 extra tokens
 *   (cents). The actual price that gets billed lives in Stripe as a metered
 *   Price (`STRIPE_OVERAGE_PRICE_ID`); this constant mirrors it for UI copy
 *   and invoice fallbacks.
 * - `OVERAGE_HARD_CAP_MULTIPLIER`: even with overage billing, runs are blocked
 *   again (429) once usage reaches this multiple of the allowance, as a
 *   safety net against runaway agent loops.
 */
export const OVERAGE_RATE_PER_1000_TOKENS = 30; // €0,30 per 1.000 token (cents)
export const OVERAGE_HARD_CAP_MULTIPLIER = 2;
