export type Integration = {
  name: string;
  brand: string;
  category: string;
  agentSlug?: string;
  available: boolean;
  description: string;
};

export const INTEGRATIONS: Integration[] = [
  {
    name: "Shopify",
    brand: "shopify",
    category: "E-commerce",
    agentSlug: "shopify-agent",
    available: true,
    description: "Sincronizza prodotti, ordini e carrello",
  },
  {
    name: "Stripe",
    brand: "stripe",
    category: "Payments",
    agentSlug: "finance-manager",
    available: true,
    description: "Pagamenti e fatture",
  },
  {
    name: "Gmail",
    brand: "gmail",
    category: "Email Service",
    agentSlug: "email-manager",
    available: true,
    description: "Smistamento e bozze email",
  },
  {
    name: "Google Calendar",
    brand: "googlecalendar",
    category: "Calendar",
    agentSlug: "calendar-booking",
    available: true,
    description: "Prenotazioni e disponibilità",
  },
  {
    name: "HubSpot",
    brand: "hubspot",
    category: "CRM",
    agentSlug: "lead-capture",
    available: true,
    description: "CRM e pipeline vendite",
  },
  {
    name: "Notion",
    brand: "notion",
    category: "Productivity",
    agentSlug: "personal-assistant",
    available: true,
    description: "Documenti e knowledge base",
  },
  {
    name: "Google Sheets",
    brand: "googlesheets",
    category: "Productivity",
    agentSlug: "business-manager",
    available: true,
    description: "Fogli e report operativi",
  },
  {
    name: "Slack",
    brand: "slack",
    category: "Messaging",
    agentSlug: "support-agent",
    available: true,
    description: "Notifiche e supporto team",
  },
  // Coming soon
  {
    name: "WhatsApp",
    brand: "whatsapp",
    category: "Messaging",
    available: false,
    description: "Messaggistica clienti",
  },
  {
    name: "WooCommerce",
    brand: "woocommerce",
    category: "E-commerce",
    available: false,
    description: "Store WooCommerce",
  },
  {
    name: "PayPal",
    brand: "paypal",
    category: "Payments",
    available: false,
    description: "Pagamenti PayPal",
  },
  {
    name: "Facebook",
    brand: "facebook",
    category: "Social & Ads",
    available: false,
    description: "Ads e pagine",
  },
  {
    name: "Instagram",
    brand: "instagram",
    category: "Social & Ads",
    available: false,
    description: "Social e DM",
  },
  {
    name: "TikTok",
    brand: "tiktok",
    category: "Social & Ads",
    available: false,
    description: "Ads e contenuti",
  },
  {
    name: "Google Ads",
    brand: "googleads",
    category: "Advertising",
    available: false,
    description: "Campagne ADS",
  },
  {
    name: "Google Analytics",
    brand: "googleanalytics",
    category: "Analytics",
    available: false,
    description: "Analytics sito",
  },
  {
    name: "Google Meet",
    brand: "googlemeet",
    category: "Meetings",
    available: false,
    description: "Video meeting",
  },
  {
    name: "Mailchimp",
    brand: "mailchimp",
    category: "Email Marketing",
    available: false,
    description: "Newsletter",
  },
  {
    name: "Calendly",
    brand: "calendly",
    category: "Scheduling",
    available: false,
    description: "Scheduling esterno",
  },
  {
    name: "Zendesk",
    brand: "zendesk",
    category: "Support",
    available: false,
    description: "Ticketing",
  },
];

export function getIntegrationHref(integration: Integration): string {
  if (integration.available && integration.agentSlug) return `/agents/${integration.agentSlug}`;
  return "/integrations";
}

export const INTEGRATION_CATEGORIES = [...new Set(INTEGRATIONS.map((i) => i.category))];
