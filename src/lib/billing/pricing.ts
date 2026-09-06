/**
 * Configurazione prezzi di AgentCloud.
 *
 * Perché qui: pagine pubbliche, checkout, limiti token e notifiche devono
 * usare gli stessi piani. Due verticali: Shopify (e-commerce) e Servizi
 * (prenotazioni calendario). Ognuna ha i piani Starter e Growth; Web Search
 * è solo un add-on. I prezzi sono in centesimi per Stripe.
 */

/**
 * Allowance token mensile di default quando nessun piano è configurato
 * (es. acquisti legacy per singolo agente o ambienti di sviluppo).
 * I token si contano come input + output di tutte le esecuzioni agente nel mese.
 */
export const DEFAULT_TOKEN_LIMIT = 300_000;

export type Plan = {
  id: string;
  name: string;
  price: number; // in centesimi
  priceDisplay: string;
  tokens: number; // max token al mese (input + output)
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
          description: "Web search con Tavily",
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
          description: "Web search con Tavily",
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
          description: "Web search con Tavily",
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
          description: "Web search con Tavily",
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

/**
 * Calcola il costo per 1.000 token (in centesimi).
 * Usato per monitorare la redditività rispetto alle allowance dei piani.
 */
export function calculateCostPerToken(
  planPrice: number, // in centesimi
  tokens: number, // allowance mensile di token
): number {
  if (tokens === 0) return 0;
  return (planPrice / tokens) * 1000;
}

/**
 * Verifica se l'utilizzo è dentro i limiti del piano
 */
export function isWithinLimit(
  currentUsage: number,
  planLimit: number,
): boolean {
  return currentUsage < planLimit;
}

/**
 * Fatturazione overage.
 *
 * L'utilizzo oltre l'allowance mensile di token non viene più bloccato con
 * 429: viene fatturato in automatico tramite un Price metered agganciato
 * all'abbonamento Stripe del cliente (Stripe lo fattura a fine periodo di
 * fatturazione, insieme al rinnovo).
 *
 * - `OVERAGE_RATE_PER_1000_TOKENS`: importo addebitato per 1.000 token extra
 *   (in centesimi). Il prezzo realmente fatturato vive in Stripe come Price
 *   metered (`STRIPE_OVERAGE_PRICE_ID`); questa costante lo rispecchia per i
 *   testi UI e i fallback di fatturazione.
 * - `OVERAGE_HARD_CAP_MULTIPLIER`: anche con la fatturazione overage le run
 *   vengono di nuovo bloccate (429) quando l'utilizzo raggiunge questo
 *   multiplo dell'allowance, come rete di sicurezza contro loop agenti fuori
 *   controllo.
 */
export const OVERAGE_RATE_PER_1000_TOKENS = 30; // €0,30 per 1.000 token (centesimi)
export const OVERAGE_HARD_CAP_MULTIPLIER = 2;
