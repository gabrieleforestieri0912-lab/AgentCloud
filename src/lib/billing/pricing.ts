/**
 * Pricing configuration for AgentCloud
 *
 * Two verticals: Shopify (e-commerce) and Services (calendar booking)
 * Each has Starter and Growth plans
 * Web Search is an add-on only
 */

export type Plan = {
  id: string;
  name: string;
  price: number; // in cents
  priceDisplay: string;
  conversations: number; // max conversations per month
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
      conversations: 300,
      features: [
        "Fino a 300 conversazioni/mese",
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
      price: 6900, // €69/month
      priceDisplay: "€69/mese",
      conversations: 1000,
      features: [
        "Fino a 1.000 conversazioni/mese",
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
      conversations: 300,
      features: [
        "Fino a 300 conversazioni/mese",
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
      price: 6900, // €69/month
      priceDisplay: "€69/mese",
      conversations: 1000,
      features: [
        "Fino a 1.000 conversazioni/mese",
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
 * Calculate cost per conversation
 * Used for monitoring profitability
 */
export function calculateCostPerConversation(
  planPrice: number, // in cents
  conversations: number,
): number {
  if (conversations === 0) return 0;
  return planPrice / conversations;
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
 * Get overage rate (cost per additional conversation)
 * Used for billing overages
 */
export function getOverageRate(plan: Plan): number {
  // Overage rate: 10% of plan price per 100 conversations
  return Math.round(plan.price * 0.1);
}
