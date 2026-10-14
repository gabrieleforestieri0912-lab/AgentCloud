/** Catalogo agenti statico (mirror di lib/agents.ts web): niente API pubblica di catalogo. */
export type AgentInfo = { slug: string; name: string; category: string };

export const AGENTS: AgentInfo[] = [
  { slug: "shopify-agent", name: "Shopify Commerce Agent", category: "E-commerce" },
  { slug: "lead-capture", name: "Lead Capture Agent", category: "Vendite" },
  { slug: "support-agent", name: "Support Agent", category: "Supporto" },
  { slug: "calendar-booking", name: "Calendar Booking Agent", category: "Produttività" },
  { slug: "quote-agent", name: "Preventivi & Quote Agent", category: "Vendite" },
  { slug: "reviews-agent", name: "Recensioni & Reputation Agent", category: "Marketing" },
  { slug: "seo-agent", name: "SEO Content Agent", category: "Marketing" },
  { slug: "email-manager", name: "Email Manager", category: "Produttività" },
  { slug: "copywriter", name: "Copywriter", category: "Marketing" },
  { slug: "business-manager", name: "Business Manager Agent", category: "Operatività" },
  { slug: "finance-manager", name: "Finance Manager Agent", category: "Finanza" },
  { slug: "personal-assistant", name: "Personal Assistant Agent", category: "Produttività" },
  { slug: "hr-recruiter", name: "HR & Recruiter Agent", category: "HR" },
  { slug: "social-media-agent", name: "Social Media Agent", category: "Marketing" },
  { slug: "inventory-logistics", name: "Inventory & Logistics Agent", category: "E-commerce" },
];

/** Provider OAuth → URL web di connessione (si apre nel browser di sistema). */
export function connectUrlFor(baseUrl: string, provider: string): string {
  const p = provider.toLowerCase();
  if (p.includes("gmail") || p.includes("calendar")) return `${baseUrl}/api/auth/google/connect`;
  const direct: Record<string, string> = {
    sheets: "google_sheets",
    drive: "google_drive",
    docs: "google_docs",
    forms: "google_forms",
    analytics: "google_analytics",
    outlook: "microsoft_outlook",
    notion: "notion",
    slack: "slack",
    hubspot: "hubspot",
    github: "github",
    clickup: "clickup",
    asana: "asana",
    airtable: "airtable",
    trello: "trello",
    woocommerce: "woocommerce",
    mailchimp: "mailchimp",
  };
  for (const [key, providerId] of Object.entries(direct)) {
    if (p.includes(key)) return `${baseUrl}/api/integrations/${providerId}/authorize`;
  }
  return `${baseUrl}/dashboard/integrations`;
}
