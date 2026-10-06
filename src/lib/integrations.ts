/**
 * Catalogo statico delle integrazioni mostrate nella pagina /integrations.
 *
 * Perché esiste: la pagina elenca i servizi collegabili (Shopify, Gmail,
 * Stripe...) con stato di disponibilità. Ogni voce può puntare all'agente che
 * la gestisce (`agentSlug`): se disponibile il click porta alla pagina
 * dell'agente, altrimenti resta sulla pagina integrazioni. I dati qui sono
 * statici e usati solo per la UI.
 */
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
  // In arrivo (non ancora disponibili: solo catalogo, niente agente collegato)
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
  // Produttività estesa — aggiunte per AgentCloud (disponibili come roadmap, icone già in BrandLogo)
  {
    name: "Trello",
    brand: "trello",
    category: "Project Management",
    available: true,
    description: "Board, liste e card",
  },
  {
    name: "Asana",
    brand: "asana",
    category: "Productivity",
    available: true,
    description: "Gestione progetti e task",
  },
  {
    name: "Airtable",
    brand: "airtable",
    category: "Database",
    available: true,
    description: "Basi, tabelle e record",
  },
  {
    name: "ClickUp",
    brand: "clickup",
    category: "Productivity",
    available: true,
    description: "Task, doc e goal",
  },
  {
    name: "Jira",
    brand: "jira",
    category: "Productivity",
    available: false,
    description: "Issue tracking Agile",
  },
  {
    name: "Figma",
    brand: "figma",
    category: "Design",
    available: false,
    description: "Design e prototipi",
  },
  {
    name: "GitHub",
    brand: "github",
    category: "Developer",
    available: true,
    description: "Repo, PR e CI/CD",
  },
  {
    name: "Google Drive",
    brand: "googledrive",
    category: "Storage",
    available: true,
    description: "Cerca e leggi i tuoi file",
  },
  {
    name: "Dropbox",
    brand: "dropbox",
    category: "Storage",
    available: false,
    description: "Storage e sync file",
  },
  // Google suite estesa — tutte come Prossimamente (già disponibili: Gmail, Calendar, Sheets, Drive)
  {
    name: "Google Docs",
    brand: "googledocs",
    category: "Productivity",
    available: false,
    description: "Documenti e collaborazione",
  },
  {
    name: "Google Slides",
    brand: "googleslides",
    category: "Productivity",
    available: false,
    description: "Presentazioni",
  },
  {
    name: "Google Forms",
    brand: "googleforms",
    category: "Productivity",
    available: false,
    description: "Moduli e sondaggi",
  },
  {
    name: "Google Keep",
    brand: "googlekeep",
    category: "Productivity",
    available: false,
    description: "Note e promemoria",
  },
  {
    name: "Google Tasks",
    brand: "googletasks",
    category: "Productivity",
    available: false,
    description: "Task e to-do",
  },
  {
    name: "Google Chat",
    brand: "googlechat",
    category: "Messaging",
    available: false,
    description: "Chat Workspace",
  },
  {
    name: "Google Cloud",
    brand: "googlecloud",
    category: "Cloud",
    available: false,
    description: "Infrastruttura e API",
  },
  // Microsoft suite — tutte come Prossimamente
  {
    name: "Microsoft Teams",
    brand: "microsoftteams",
    category: "Messaging",
    available: false,
    description: "Chat e meeting Teams",
  },
  {
    name: "Microsoft Outlook",
    brand: "microsoftoutlook",
    category: "Email Service",
    available: false,
    description: "Email e calendario",
  },
  {
    name: "OneDrive",
    brand: "microsoftonedrive",
    category: "Storage",
    available: false,
    description: "File cloud Microsoft",
  },
  {
    name: "SharePoint",
    brand: "microsoftsharepoint",
    category: "Storage",
    available: false,
    description: "Intranet e documenti",
  },
  {
    name: "Microsoft Excel",
    brand: "microsoftexcel",
    category: "Productivity",
    available: false,
    description: "Fogli Excel online",
  },
];

/**
 * True se l'app citata nelle integrazioni di un agente (es. "Salesforce",
 * "Google Business Profile") è disponibile come integrazione collegabile.
 * Le card agente usano questo per mostrare "Prossimamente" al posto del
 * bottone Connetti quando l'app non è ancora live nel catalogo.
 */
export function isIntegrationAvailable(label: string): boolean {
  const key = label.trim().toLowerCase();
  if (!key) return false;
  const entry = INTEGRATIONS.find(
    (i) =>
      i.name.toLowerCase() === key ||
      i.brand === key ||
      key.includes(i.name.toLowerCase()),
  );
  return entry?.available ?? false;
}

/**
 * App collegabili con l'id usato dal marker inline `[[CONNECT:<id>]]` che la UI
 * trasforma nella card con logo + bottone "Connetti". Gli id coincidono con
 * quelli accettati dal tool `request_integration_connect` (vedi `tools.ts`).
 */
const CONNECTABLE_PROVIDERS: { id: string; names: string[] }[] = [
  { id: "shopify", names: ["shopify"] },
  { id: "gmail", names: ["gmail", "google mail"] },
  { id: "calendar", names: ["google calendar", "calendario", "calendar"] },
  { id: "sheets", names: ["google sheets", "spreadsheet", "fogli", "sheets"] },
  { id: "drive", names: ["google drive", "drive"] },
  { id: "airtable", names: ["airtable"] },
  { id: "trello", names: ["trello", "kanban"] },
  { id: "slack", names: ["slack"] },
  { id: "notion", names: ["notion"] },
  { id: "hubspot", names: ["hubspot"] },
  { id: "github", names: ["github"] },
  { id: "clickup", names: ["clickup", "click up"] },
  { id: "asana", names: ["asana"] },
  { id: "whatsapp", names: ["whatsapp"] },
];

/**
 * Intenzione di connessione, in italiano/inglese/spagnolo/tedesco/francese.
 * Cattura sia l'infinito ("collegare", "connect") sia il participio passato
 * ("non collegato", "not connected") che è il modo più frequente in cui un
 * agente spiega che manca un account.
 */
const CONNECT_INTENT =
  /(connett|colleg|connect|vincul|verbind|\blink (?:your|the|an)\b|\bnot linked\b|nessun account|kein konto|aucun compte)/i;

/** Distanza (caratteri) entro cui l'app deve essere citata dall'intenzione. */
const CONNECT_WINDOW = 140;

/**
 * Ritorna gli id delle app che il testo sta dicendo all'utente di collegare.
 *
 * Perché esiste: la card di connessione compare solo quando il modello emette
 * il marker `[[CONNECT:<id>]]` o chiama il tool `request_integration_connect`,
 * ma l'adesione a quelle istruzioni non è garantita (il testo può spiegare
 * come collegare l'app senza emettere nulla). Questa funzione è il fallback
 * lato server: se la risposta parla di collegare un'app e il marker manca, la
 * route invia comunque l'evento `connection` e la UI mostra la card.
 *
 * Restituisce solo le app davvero citate accanto a un'intenzione di
 * connessione, così una risposta che menziona "Shopify" a caso non fa apparire
 * card inutili. I marker già presenti nel testo vengono ignorati.
 */
export function detectConnectProviders(text: string): string[] {
  if (!text) return [];
  const cleaned = text.replace(/\[\[CONNECT:[a-zA-Z0-9_\-]+\]\]/g, " ");
  const lowered = cleaned.toLowerCase();
  const found: string[] = [];

  /** True se il nome dell'app è citato accanto a un'intenzione di connessione. */
  const mentionsWithIntent = (name: string): boolean => {
    let from = 0;
    // Ogni occorrenza del nome: l'intenzione può stare prima o dopo.
    for (let hits = 0; hits < 25; hits++) {
      const idx = lowered.indexOf(name, from);
      if (idx === -1) return false;
      const start = Math.max(0, idx - CONNECT_WINDOW);
      const end = Math.min(lowered.length, idx + name.length + CONNECT_WINDOW);
      if (CONNECT_INTENT.test(cleaned.slice(start, end))) return true;
      from = idx + name.length;
    }
    return false;
  };

  // Una sola card per app, anche quando il nome compare più volte ("Google
  // Calendar" è citato due volte → una card, non due).
  for (const { id, names } of CONNECTABLE_PROVIDERS) {
    if (found.includes(id)) continue;
    if (names.some(mentionsWithIntent)) found.push(id);
  }
  return found;
}

