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
  // Shopify è temporaneamente in "Prossimamente": l'integrazione non è
  // collegabile per il momento. `available: false` è l'unico interruttore:
  // pagina pubblica, dashboard, card agente e bottone Connetti derivano da qui.
  {
    name: "Shopify",
    brand: "shopify",
    category: "E-commerce",
    agentSlug: "shopify-agent",
    available: false,
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
    available: true,
    description: "Prodotti, ordini e clienti",
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
    category: "Marketing",
    available: false,
    description: "Audience, statistiche e campagne",
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
  // Microsoft suite — le restanti app restano come Prossimamente (Teams,
  // Outlook, OneDrive, SharePoint: quest'ultimo è l'opt-in Sites.ReadWrite.All).
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
  // Microsoft 365 — una sola connessione (provider `microsoft`) abilita Word,
  // Excel, PowerPoint e OneNote: le quattro card condividono lo stesso stato di
  // connessione. La connettività Microsoft è quindi provider-based, non
  // brand-based (vedi BRAND_TO_PROVIDER).
  {
    name: "Microsoft Word",
    brand: "microsoftword",
    category: "Productivity",
    available: true,
    description: "Documenti Word: crea, leggi, modifica",
  },
  {
    name: "Microsoft Excel",
    brand: "microsoftexcel",
    category: "Productivity",
    available: true,
    description: "Fogli di calcolo e range",
  },
  {
    name: "Microsoft PowerPoint",
    brand: "microsoftpowerpoint",
    category: "Productivity",
    available: true,
    description: "Presentazioni con slide e note",
  },
  {
    name: "Microsoft OneNote",
    brand: "microsoftonenote",
    category: "Productivity",
    available: true,
    description: "Note e pagine OneNote",
  },
];

/**
 * Brand della UI → id del provider OAuth. È la mappa che unisce il catalogo
 * statico delle app (brand) alle righe `tenant_integrations` (provider).
 *
 * Perché è esportata e non locale al componente: le quattro app Microsoft
 * condividono UNA sola connessione (`microsoft`), quindi sia la griglia sia il
 * conteggio di avanzamento devono risolvere brand→provider allo stesso modo,
 * altrimenti la barra conta 1 connessione mentre quattro card risultano attive.
 */
export const BRAND_TO_PROVIDER: Record<string, string> = {
  notion: "notion",
  slack: "slack",
  hubspot: "hubspot",
  googlesheets: "google_sheets",
  github: "github",
  clickup: "clickup",
  asana: "asana",
  googledrive: "google_drive",
  airtable: "airtable",
  trello: "trello",
  woocommerce: "woocommerce",
  mailchimp: "mailchimp",
  microsoftword: "microsoft",
  microsoftexcel: "microsoft",
  microsoftpowerpoint: "microsoft",
  microsoftonenote: "microsoft",
};

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
  { id: "woocommerce", names: ["woocommerce", "woo", "store wordpress"] },
  { id: "mailchimp", names: ["mailchimp", "newsletter", "email marketing"] },
  { id: "slack", names: ["slack"] },
  { id: "notion", names: ["notion"] },
  { id: "hubspot", names: ["hubspot"] },
  { id: "github", names: ["github"] },
  { id: "clickup", names: ["clickup", "click up"] },
  { id: "asana", names: ["asana"] },
  { id: "whatsapp", names: ["whatsapp"] },
];

/**
 * Verbi di richiesta di connessione in forma attiva (IT/EN/ES/DE/FR).
 *
 * Solo forme che chiedono un'AZIONE ("collega", "connect", "vincula"): i
 * participi di stato ("collegato", "connected", "nessun account") sono
 * esclusi di proposito — descrivono una situazione, non chiedono di collegare
 * nulla, ed è proprio su quelli che la card veniva spammata.
 */
const CONNECT_REQUEST_VERBS =
  /\b(collega|colleghi|collego|collegare|collegalo|collegala|collegami|connetti|connetto|connettere|connettilo|connettila|connect|links?|linka|attiva|attivare|autorizza|autorizzare|authorize|associa|associare|sincronizza|vincula|vincular|verbinde|verbinden|connecte|connectez)\b/i;

/**
 * Negazioni che annullano una richiesta ("non collegare", "senza connettere",
 * "do not connect"): se stanno subito prima del verbo, non è una richiesta.
 */
const CONNECT_NEGATION =
  /\b(non|senza|mai|neanche|nemmeno|niente|not|without|never|don't|do not|kein|keine|sans)\b/i;

/** Distanza (caratteri) entro cui verbo e app devono stare vicini. */
const CONNECT_WINDOW = 140;

/** Caratteri prima del verbo in cui si cerca una negazione. */
const NEGATION_WINDOW = 30;

/**
 * Marker `[[CONNECT:<id>]]` scritti nel testo (dal modello o dal risultato di
 * `request_integration_connect`). La UI li trasforma nella card con logo +
 * bottone "Connetti"; il server li usa per decidere quali eventi `connection`
 * inviare. Condiviso tra server e client così i due non divergono mai.
 */
export function extractConnectMarkers(text: string): string[] {
  if (!text) return [];
  const providers: string[] = [];
  const markerRe = /\[\[CONNECT:([a-zA-Z0-9_\-]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(text)) !== null) {
    const id = m[1]?.toLowerCase();
    if (id && !providers.includes(id)) providers.push(id);
  }
  return providers;
}

/**
 * Id delle app che l'UTENTE chiede esplicitamente di collegare.
 *
 * Regola di prodotto: la card con il bottone "Connetti" compare SOLO su
 * richiesta esplicita dell'utente, mai perché il modello ne parla. "Collega
 * Gmail" → `["gmail"]`; "Gmail non è collegato?" → `[]` (è una domanda sullo
 * stato, non una richiesta); "non collegare WhatsApp" → `[]`.
 *
 * La funzione è pura e gira sia sul server (route chat/agent, per decidere se
 * emettere l'evento `connection`) sia sul client (ChatInterface, per decidere
 * se mostrare la card del marker `[[CONNECT:id]]`).
 */
export function requestedConnectProviders(text: string): string[] {
  if (!text) return [];
  const lowered = text.toLowerCase();
  const found: string[] = [];

  /** True se il nome dell'app è vicino a un verbo di richiesta non negato. */
  const requestedNearby = (name: string): boolean => {
    let from = 0;
    // Ogni occorrenza del nome: la richiesta può stare prima o dopo.
    for (let hits = 0; hits < 25; hits++) {
      const idx = lowered.indexOf(name, from);
      if (idx === -1) return false;
      const start = Math.max(0, idx - CONNECT_WINDOW);
      const end = Math.min(lowered.length, idx + name.length + CONNECT_WINDOW);
      const window = text.slice(start, end);
      // Cerca il verbo nella finestra e verifica che non sia negato. Regex
      // globale costruita dal pattern: serve l'indice di ogni match.
      let match: RegExpExecArray | null;
      const global = new RegExp(CONNECT_REQUEST_VERBS.source, "gi");
      while ((match = global.exec(window)) !== null) {
        const before = window.slice(Math.max(0, match.index - NEGATION_WINDOW), match.index);
        if (!CONNECT_NEGATION.test(before)) return true;
      }
      from = idx + name.length;
    }
    return false;
  };

  // Una sola card per app, anche quando il nome compare più volte.
  for (const { id, names } of CONNECTABLE_PROVIDERS) {
    if (found.includes(id)) continue;
    if (names.some(requestedNearby)) found.push(id);
  }
  return found;
}

