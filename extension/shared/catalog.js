/* eslint-disable @typescript-eslint/no-unused-vars -- AGENT_CATALOG e getAgent sono usati da sidepanel.js come globali */
// SYNC WITH src/lib/agents.ts and docs/PRICING.md.
// Il catalogo serve solo alla vetrina dell'estensione: il checkout resta sempre sul sito.
// Usato dal pannello laterale (sidepanel/sidepanel.html) per l'account senza agenti attivi.
const AGENT_CATALOG = [
  { slug: "shopify-agent", name: "Shopify Agent", category: "E-commerce", price: "€9,99/mese", description: "Gestisce prodotti, ordini, sconti e link al carrello." },
  { slug: "lead-capture", name: "Lead Capture Agent", category: "Marketing & Sales", price: "€9,99/mese", description: "Cattura, arricchisce e qualifica i lead del sito." },
  { slug: "support-agent", name: "Support Agent", category: "Customer Service", price: "€14,99/mese", description: "Risponde ai ticket e prepara escalation per il team." },
  { slug: "calendar-booking", name: "Calendar Booking Agent", category: "Business & Operations", price: "€9,99/mese", description: "Trova disponibilità, prenota eventi e imposta reminder." },
  { slug: "quote-agent", name: "Preventivi Agent", category: "Sales", price: "€14,99/mese", description: "Raccoglie requisiti e prepara preventivi dettagliati." },
  { slug: "reviews-agent", name: "Reviews Agent", category: "Marketing & Sales", price: "€14,99/mese", description: "Analizza recensioni e prepara risposte professionali." },
  { slug: "seo-agent", name: "SEO Content Agent", category: "Marketing & Sales", price: "€14,99/mese", description: "Crea contenuti SEO con ricerca e struttura ottimizzata." },
  { slug: "email-manager", name: "Email Manager", category: "Business & Operations", price: "€14,99/mese", description: "Organizza inbox, prepara risposte e gestisce follow-up." },
  { slug: "copywriter", name: "Copywriter", category: "Design & Content", price: "€14,99/mese", description: "Scrive copy per landing, advertising ed email." },
  { slug: "business-manager", name: "Business Manager", category: "Business & Operations", price: "€14,99/mese", description: "Supporta reporting, pianificazione e analisi strategica." },
  { slug: "finance-manager", name: "Finance Manager", category: "E-commerce & Finance", price: "€14,99/mese", description: "Controlla cashflow, fatture e solleciti di pagamento." },
  { slug: "personal-assistant", name: "Personal Assistant", category: "Business & Operations", price: "€9,99/mese", description: "Ricerca, organizza attività e supporta la giornata." },
  { slug: "hr-recruiter", name: "HR & Recruiter Agent", category: "Business & Operations", price: "€14,99/mese", description: "Analizza CV e supporta la selezione dei candidati." },
  { slug: "social-media-agent", name: "Social Media Agent", category: "Design & Content", price: "€9,99/mese", description: "Pianifica il calendario social e crea caption." },
  { slug: "inventory-logistics", name: "Inventory & Logistics Agent", category: "E-commerce & Finance", price: "€14,99/mese", description: "Monitora stock, riordini e spedizioni." },
];

function getAgent(slug) {
  return AGENT_CATALOG.find((agent) => agent.slug === slug);
}
