// SYNC WITH src/lib/agents.ts and docs/PRICING.md.
export type CatalogAgent = { slug: string; name: string; category: string; price: string };

export const CATALOG: CatalogAgent[] = [
  ["shopify-agent", "Shopify Agent", "E-commerce", "€9,99/mese"],
  ["lead-capture", "Lead Capture Agent", "Marketing & Sales", "€9,99/mese"],
  ["support-agent", "Support Agent", "Customer Service", "€14,99/mese"],
  ["calendar-booking", "Calendar Booking Agent", "Business & Operations", "€9,99/mese"],
  ["quote-agent", "Preventivi Agent", "Sales", "€14,99/mese"],
  ["reviews-agent", "Reviews Agent", "Marketing & Sales", "€14,99/mese"],
  ["seo-agent", "SEO Content Agent", "Marketing & Sales", "€14,99/mese"],
  ["email-manager", "Email Manager", "Business & Operations", "€14,99/mese"],
  ["copywriter", "Copywriter", "Design & Content", "€14,99/mese"],
  ["business-manager", "Business Manager", "Business & Operations", "€14,99/mese"],
  ["finance-manager", "Finance Manager", "E-commerce & Finance", "€14,99/mese"],
  ["personal-assistant", "Personal Assistant", "Business & Operations", "€9,99/mese"],
  ["hr-recruiter", "HR & Recruiter Agent", "Business & Operations", "€14,99/mese"],
  ["social-media-agent", "Social Media Agent", "Design & Content", "€9,99/mese"],
  ["inventory-logistics", "Inventory & Logistics Agent", "E-commerce & Finance", "€14,99/mese"],
].map(([slug, name, category, price]) => ({ slug, name, category, price }));
