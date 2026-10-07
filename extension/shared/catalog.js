/* eslint-disable @typescript-eslint/no-unused-vars -- AGENT_CATALOG e getAgent sono usati da sidepanel.js come globali */
// SYNC WITH src/lib/agents.ts and docs/PRICING.md.
// Il catalogo serve solo alla vetrina dell'estensione: il checkout resta sempre sul sito.
// Usato dal pannello laterale (sidepanel/sidepanel.html) per l'account senza agenti attivi.
//
// Slug, nome, categoria e prezzo sono identici alla fonte di verità web; `comingSoon`
// indica gli agenti annunciati ma non ancora acquistabili. Il test
// `scripts/test-clients-alignment.mjs` fallisce se questo file diverge da src/lib/agents.ts.
const AGENT_CATALOG = [
  // ─── Disponibili (15) ───
  { slug: "shopify-agent", name: "Shopify Agent", category: "E-commerce & Finance", price: "€9,99/mo", comingSoon: false, description: "Gestisce prodotti, ordini, sconti e link al carrello." },
  { slug: "lead-capture", name: "Lead Capture Agent", category: "Marketing & Sales", price: "€4,99/mo", comingSoon: false, description: "Cattura, arricchisce e qualifica i lead del sito." },
  { slug: "support-agent", name: "Support Agent", category: "Customer Service", price: "€9,99/mo", comingSoon: false, description: "Risponde ai ticket e prepara escalation per il team." },
  { slug: "calendar-booking", name: "Calendar Booking Agent", category: "Business & Operations", price: "€4,99/mo", comingSoon: false, description: "Trova disponibilità, prenota eventi e imposta reminder." },
  { slug: "quote-agent", name: "Quotes & Estimates Agent", category: "E-commerce & Finance", price: "€7,99/mo", comingSoon: false, description: "Raccoglie requisiti e prepara preventivi dettagliati." },
  { slug: "reviews-agent", name: "Reviews & Reputation Agent", category: "Customer Service", price: "€4,99/mo", comingSoon: false, description: "Analizza recensioni e prepara risposte professionali." },
  { slug: "seo-agent", name: "SEO Content Agent", category: "Marketing & Sales", price: "€9,99/mo", comingSoon: false, description: "Crea contenuti SEO con ricerca e struttura ottimizzata." },
  { slug: "email-manager", name: "Email Manager", category: "Business & Operations", price: "€9,99/mo", comingSoon: false, description: "Organizza inbox, prepara risposte e gestisce follow-up." },
  { slug: "copywriter", name: "Copywriter Agent", category: "Design & Content", price: "€7,99/mo", comingSoon: false, description: "Scrive copy per landing, advertising ed email." },
  { slug: "business-manager", name: "Business Manager Agent", category: "Business & Operations", price: "€14,99/mo", comingSoon: false, description: "Supporta reporting, pianificazione e analisi strategica." },
  { slug: "finance-manager", name: "Finance Manager Agent", category: "E-commerce & Finance", price: "€14,99/mo", comingSoon: false, description: "Controlla cashflow, fatture e solleciti di pagamento." },
  { slug: "personal-assistant", name: "Personal Assistant Agent", category: "Business & Operations", price: "€7,99/mo", comingSoon: false, description: "Ricerca, organizza attività e supporta la giornata." },
  { slug: "hr-recruiter", name: "HR & Recruiter Agent", category: "Business & Operations", price: "€14,99/mo", comingSoon: false, description: "Analizza CV e supporta la selezione dei candidati." },
  { slug: "social-media-agent", name: "Social Media Agent", category: "Design & Content", price: "€7,99/mo", comingSoon: false, description: "Pianifica il calendario social e crea caption." },
  { slug: "inventory-logistics", name: "Inventory & Logistics Agent", category: "E-commerce & Finance", price: "€14,99/mo", comingSoon: false, description: "Monitora stock, riordini e spedizioni." },
  // ─── Prossimamente (7) ───
  { slug: "email-agent", name: "Email Agent", category: "Business & Operations", price: "€9,99/mo", comingSoon: true, description: "Legge, classifica e gestisce le email operative." },
  { slug: "whatsapp-agent", name: "WhatsApp Agent", category: "Customer Service", price: "€9,99/mo", comingSoon: true, description: "Conversazioni WhatsApp automatiche per clienti e lead." },
  { slug: "invoice-agent", name: "Invoice Agent", category: "E-commerce & Finance", price: "€7,99/mo", comingSoon: true, description: "Fatture automatiche: generazione, invio e solleciti." },
  { slug: "analytics-agent", name: "Analytics Agent", category: "AI & Data", price: "€14,99/mo", comingSoon: true, description: "Dai dati alle decisioni: KPI e report automatici." },
  { slug: "crm-agent", name: "CRM Agent", category: "Marketing & Sales", price: "€9,99/mo", comingSoon: true, description: "CRM sempre aggiornato: lead, deal e follow-up." },
  { slug: "document-agent", name: "Document Agent", category: "AI & Data", price: "€7,99/mo", comingSoon: true, description: "Legge PDF ed estrae dati e risposte." },
  { slug: "research-agent", name: "Research Agent", category: "AI & Data", price: "€9,99/mo", comingSoon: true, description: "Ricerche automatiche con fonti verificate." },
];

function getAgent(slug) {
  return AGENT_CATALOG.find((agent) => agent.slug === slug);
}
