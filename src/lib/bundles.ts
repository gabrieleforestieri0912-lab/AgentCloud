/**
 * Bundle di agenti con offerte trimestrali e annuali.
 *
 * Ogni bundle raggruppa agenti per categoria/uso con uno sconto rispetto
 * al prezzo singolo mensile. L'utente sceglie la durata (mensile, trimestrale,
 * annuale) e il bundle viene aggiunto al carrello.
 */
import { AGENTS, type Agent } from "./agents";

export type BundlePeriod = "monthly" | "quarterly" | "yearly";

export type BundlePricing = {
  monthly: number;   // prezzo al mese (centesimi)
  quarterly: number; // prezzo al mese su base trimestrale (centesimi)
  yearly: number;    // prezzo al mese su base annuale (centesimi)
  quarterlyTotal: number; // totale trimestrale (centesimi)
  yearlyTotal: number;    // totale annuale (centesimi)
  savingsQuarterly: number; // % risparmio trimestrale
  savingsYearly: number;    // % risparmio annuale
};

export type Bundle = {
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  agentSlugs: string[];
  accent: string;
  icon: string;
  badge: "Best value" | "Most popular" | "Save more" | "Starter";
  pricing: BundlePricing;
};

function calcPricing(monthlyCents: number): BundlePricing {
  const quarterlyDiscount = 0.15; // 15% sconto trimestrale
  const yearlyDiscount = 0.30;   // 30% sconto annuale

  const quarterly = Math.round(monthlyCents * (1 - quarterlyDiscount));
  const yearly = Math.round(monthlyCents * (1 - yearlyDiscount));

  return {
    monthly: monthlyCents,
    quarterly,
    yearly,
    quarterlyTotal: quarterly * 3,
    yearlyTotal: yearly * 12,
    savingsQuarterly: Math.round(quarterlyDiscount * 100),
    savingsYearly: Math.round(yearlyDiscount * 100),
  };
}

function getAgentsBySlugs(slugs: string[]): Agent[] {
  return slugs.map((slug) => AGENTS.find((a) => a.slug === slug)).filter(Boolean) as Agent[];
}

function totalMonthlyPrice(slugs: string[]): number {
  return getAgentsBySlugs(slugs).reduce((sum, a) => sum + a.priceCents, 0);
}

// ─── Bundle definitions ──────────────────────────────────────────────────

const ECOMMERCE_SLUGS = ["shopify-agent", "inventory-logistics", "reviews-agent", "finance-manager"];
const MARKETING_SLUGS = ["lead-capture", "seo-agent", "social-media-agent", "copywriter"];
const OPERATIONS_SLUGS = ["support-agent", "calendar-booking", "email-manager", "personal-assistant"];

export const BUNDLES: Bundle[] = [
  {
    slug: "ecommerce-starter",
    name: "E-commerce Starter",
    description: "Gestisci store, prodotti, ordini e reputazione con 4 agenti pensati per il tuo e-commerce.",
    longDescription: "Il bundle perfetto per chi gestisce un negozio online. Shopify Agent per il catalogo, Inventory per le scorte, Reviews per la reputazione e Finance per i numeri. Tutto integrato, un solo prezzo.",
    agentSlugs: ECOMMERCE_SLUGS,
    accent: "from-green-500 to-emerald-600",
    icon: "shopping-cart",
    badge: "Most popular",
    pricing: calcPricing(totalMonthlyPrice(ECOMMERCE_SLUGS)),
  },
  {
    slug: "marketing-power",
    name: "Marketing Power",
    description: "Cattura lead, crea contenuti SEO, gestisci social e scrivi copy ad alta conversione.",
    longDescription: "Il bundle per i team marketing che vogliono automatizzare l'intera funnel: dall'acquisizione lead alla creazione contenuti, dai social alla copywriting. 4 agenti che lavorano in sinergia.",
    agentSlugs: MARKETING_SLUGS,
    accent: "from-orange-500 to-pink-500",
    icon: "megaphone",
    badge: "Best value",
    pricing: calcPricing(totalMonthlyPrice(MARKETING_SLUGS)),
  },
  {
    slug: "operations-hub",
    name: "Operations Hub",
    description: "Supporto clienti, prenotazioni, email e assistente personale: automatizza le operazioni quotidiane.",
    longDescription: "Il bundle per chi vuole liberare tempo dalle attività ripetitive. Support Agent per i ticket, Calendar per gli appuntamenti, Email Manager per la posta e Personal Assistant per la produttività.",
    agentSlugs: OPERATIONS_SLUGS,
    accent: "from-cyan-500 to-blue-500",
    icon: "wrench",
    badge: "Save more",
    pricing: calcPricing(totalMonthlyPrice(OPERATIONS_SLUGS)),
  },
  {
    slug: "all-in-one",
    name: "All-in-One Bundle",
    description: "Tutti gli 11 agenti disponibili: la massima automazione per la tua azienda.",
    longDescription: "Il bundle completo per le aziende che vogliono coprire ogni esigenza. Da e-commerce a marketing, da supporto a finanza. 11 agenti, un solo abbonamento, sconti fino al 30%.",
    agentSlugs: [...ECOMMERCE_SLUGS, ...MARKETING_SLUGS, ...OPERATIONS_SLUGS],
    accent: "from-brand-500 to-purple-600",
    icon: "bot",
    badge: "Best value",
    pricing: calcPricing(totalMonthlyPrice([...ECOMMERCE_SLUGS, ...MARKETING_SLUGS, ...OPERATIONS_SLUGS])),
  },
];

export function getBundleBySlug(slug: string): Bundle | undefined {
  return BUNDLES.find((b) => b.slug === slug);
}

export function getBundleAgents(bundle: Bundle): Agent[] {
  return getAgentsBySlugs(bundle.agentSlugs);
}

/**
 * Format prezzo in EUR da centesimi.
 */
export function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

/**
 * Format prezzo al mese da centesimi.
 */
export function formatMonthlyPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}/mo`;
}
