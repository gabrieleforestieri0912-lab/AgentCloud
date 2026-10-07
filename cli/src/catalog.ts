// SYNC WITH src/lib/agents.ts and docs/PRICING.md.
// Fonte di verità: `src/lib/agents.ts` — slug, name, category, price e lo stato
// `comingSoon` devono restare identici. Il test `scripts/test-clients-alignment.mjs`
// confronta i due file e fallisce se divergono.
//
// Formato prezzo: lo stesso del web ("€9,99/mo"), non "€9,99/mese": così la card
// CLI, quella web e quella mobile mostrano esattamente lo stesso valore.
export type CatalogAgent = {
  slug: string;
  name: string;
  category: string;
  price: string;
  /** True per gli agenti annunciati ma non ancora acquistabili (non nei feature flag). */
  comingSoon: boolean;
};

type Row = [slug: string, name: string, category: string, price: string];

// I 15 agenti abilitati dai feature flag di default (ACTIVE_15_AGENTS).
const AVAILABLE: Row[] = [
  ["shopify-agent", "Shopify Agent", "E-commerce & Finance", "€9,99/mo"],
  ["lead-capture", "Lead Capture Agent", "Marketing & Sales", "€4,99/mo"],
  ["support-agent", "Support Agent", "Customer Service", "€9,99/mo"],
  ["calendar-booking", "Calendar Booking Agent", "Business & Operations", "€4,99/mo"],
  ["quote-agent", "Quotes & Estimates Agent", "E-commerce & Finance", "€7,99/mo"],
  ["reviews-agent", "Reviews & Reputation Agent", "Customer Service", "€4,99/mo"],
  ["seo-agent", "SEO Content Agent", "Marketing & Sales", "€9,99/mo"],
  ["email-manager", "Email Manager", "Business & Operations", "€9,99/mo"],
  ["copywriter", "Copywriter Agent", "Design & Content", "€7,99/mo"],
  ["business-manager", "Business Manager Agent", "Business & Operations", "€14,99/mo"],
  ["finance-manager", "Finance Manager Agent", "E-commerce & Finance", "€14,99/mo"],
  ["personal-assistant", "Personal Assistant Agent", "Business & Operations", "€7,99/mo"],
  ["hr-recruiter", "HR & Recruiter Agent", "Business & Operations", "€14,99/mo"],
  ["social-media-agent", "Social Media Agent", "Design & Content", "€7,99/mo"],
  ["inventory-logistics", "Inventory & Logistics Agent", "E-commerce & Finance", "€14,99/mo"],
];

// I 7 agenti "Prossimamente": presenti nel catalogo, non acquistabili.
const COMING_SOON: Row[] = [
  ["email-agent", "Email Agent", "Business & Operations", "€9,99/mo"],
  ["whatsapp-agent", "WhatsApp Agent", "Customer Service", "€9,99/mo"],
  ["invoice-agent", "Invoice Agent", "E-commerce & Finance", "€7,99/mo"],
  ["analytics-agent", "Analytics Agent", "AI & Data", "€14,99/mo"],
  ["crm-agent", "CRM Agent", "Marketing & Sales", "€9,99/mo"],
  ["document-agent", "Document Agent", "AI & Data", "€7,99/mo"],
  ["research-agent", "Research Agent", "AI & Data", "€9,99/mo"],
];

export const CATALOG: CatalogAgent[] = [
  ...AVAILABLE.map(([slug, name, category, price]) => ({ slug, name, category, price, comingSoon: false })),
  ...COMING_SOON.map(([slug, name, category, price]) => ({ slug, name, category, price, comingSoon: true })),
];
