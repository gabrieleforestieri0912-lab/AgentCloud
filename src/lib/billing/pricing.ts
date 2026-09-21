/**
 * Configurazione prezzi di AgentCloud.
 *
 * Perché qui: pagine pubbliche, checkout, limiti token e notifiche devono
 * usare gli stessi piani. Due verticali: Shopify (e-commerce) e Servizi
 * (prenotazioni calendario). Ognuna ha i piani Starter e Growth; Web Search
 * è solo un add-on. I prezzi sono in centesimi per Stripe.
 */

export const DEFAULT_TOKEN_LIMIT = 300_000;
export const OVERAGE_RATE_PER_1000_TOKENS = 30; // €0,30 per 1.000 token (cents)
export const OVERAGE_HARD_CAP_MULTIPLIER = 2;

export type Plan = {
  id: string;
  name: string;
  price: number; // in centesimi
  priceDisplay: string;
  tokens: number; // token max al mese (input+output)
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
 * Prezzi E-commerce Shopify
 * - Shopify Agent + Lead Capture
 */
export const SHOPIFY_PRICING: VerticalPricing = {
  vertical: "shopify",
  plans: {
    starter: {
      id: "shopify-starter",
      name: "Starter",
      price: 999, // €9,99/mese (999 centesimi)
      priceDisplay: "€9,99/mese",
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
          price: 499, // €4,99/mese
          priceDisplay: "+€4,99/mese",
          description: "Web search via Chrome/Tavily",
        },
      },
    },
    growth: {
      id: "shopify-growth",
      name: "Growth",
      price: 1499, // €14,99/mese (1499 centesimi)
      priceDisplay: "€14,99/mese",
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
          price: 499,
          priceDisplay: "+€4,99/mese",
          description: "Web search via Chrome/Tavily",
        },
      },
    },
  },
};

/**
 * Prezzi Servizi (prenotazione calendario + Lead Capture)
 * - Per ristoranti, professionisti, immobiliare
 */
export const SERVICES_PRICING: VerticalPricing = {
  vertical: "services",
  plans: {
    starter: {
      id: "services-starter",
      name: "Starter",
      price: 999, // €9,99/mese (999 centesimi)
      priceDisplay: "€9,99/mese",
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
          price: 499,
          priceDisplay: "+€4,99/mese",
          description: "Web search via Chrome/Tavily",
        },
      },
    },
    growth: {
      id: "services-growth",
      name: "Growth",
      price: 1499, // €14,99/mese (1499 centesimi)
      priceDisplay: "€14,99/mese",
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
          price: 499,
          priceDisplay: "+€4,99/mese",
          description: "Web search via Chrome/Tavily",
        },
      },
    },
  },
};

/**
 * Restituisce i prezzi per un verticale specifico
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
 * Restituisce un piano specifico
 */
export function getPlan(
  vertical: "shopify" | "services",
  planId: "starter" | "growth",
): Plan | null {
  const pricing = getPricing(vertical);
  return pricing.plans[planId] || null;
}


