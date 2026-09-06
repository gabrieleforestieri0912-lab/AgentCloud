/**
 * Catalogo agenti (contenuti) + helper di localizzazione.
 *
 * Come è organizzato: qui vivono i dati "canonici" di ogni agente del
 * marketplace in inglese (nome, descrizioni, categoria, prezzo, icona,
 * integrazioni...), usati sia per le card del marketplace sia per le pagine
 * agente. La versione italiana degli stessi campi è un overlay in
 * `src/lib/i18n/agentCatalog.ts`, applicato da `localizeAgent()` quando la
 * lingua attiva è l'italiano. Le stringhe qui sono CONTENUTI mostrati agli
 * utenti (in inglese di default), non commenti: non vanno tradotte nel file.
 */
import { getFeatureFlags } from "./agents/feature-flags";
import {
  getAgentLocalization,
  localizeSetupTime,
} from "./i18n/agentCatalog";

export type AgentCategory =
  | "Business & Operations"
  | "Marketing & Sales"
  | "Customer Service"
  | "Development"
  | "AI & Data"
  | "Design & Content"
  | "E-commerce & Finance";

export type AgentIconKey =
  | "briefcase"
  | "calendar"
  | "message-square"
  | "users"
  | "bar-chart"
  | "search"
  | "megaphone"
  | "mail"
  | "globe"
  | "headphones"
  | "shield"
  | "wrench"
  | "code"
  | "git-branch"
  | "bug"
  | "cpu"
  | "database"
  | "pen-tool"
  | "file-text"
  | "palette"
  | "shopping-cart"
  | "package"
  | "file-text-dollar"
  | "bot";

/** Brand whose official logo is rendered instead of the generic Lucide icon. */
export type AgentBrand = "shopify";

export type Agent = {
  slug: string;
  name: string;
  shortName: string;
  category: AgentCategory;
  industry: string;
  icon: AgentIconKey;
  brand?: AgentBrand;
  price: string;
  priceCents: number;
  stripePriceId: string;
  setupTime: string;
  badge: "Popular" | "New" | "Customizable" | "Fast setup";
  description: string;
  longDescription: string;
  tasks: string[];
  integrations: string[];
  workflow: string[];
  accent: string;
  comingSoon?: true;
};

export function resolveStripePriceId(slug: string, fallback: string): string {
  const envKey =
    "STRIPE_PRICE_" + slug.replace(/[^a-z0-9]/gi, "_").toUpperCase();
  return process.env[envKey] || fallback;
}

type AgentSeed = Omit<Agent, "priceCents" | "stripePriceId"> & {
  priceCents: number;
  stripePriceId: string;
};

const SEEDS: AgentSeed[] = [
  // ─── 10 AGENTI DISPONIBILI ────────────────────────────────────────────────
  {
    slug: "shopify-agent",
    name: "Shopify Agent",
    shortName: "Shopify Agent",
    category: "E-commerce & Finance",
    industry: "Negozi e-commerce e brand D2C",
    icon: "shopping-cart",
    brand: "shopify",
    price: "€9,99/mo",
    priceCents: 999,
    stripePriceId: "price_shopify_agent",
    setupTime: "Same day",
    badge: "Popular",
    description:
      "Gestisci l'intero store Shopify: ricerca prodotti, creazione sconti, link carrello diretti e tracking vendite.",
    longDescription:
      "Lo Shopify Agent è il centro di comando per il tuo e-commerce. Ricerca prodotti nel catalogo, genera link carrello con checkout istantaneo, monitora lo stato delle spedizioni per i clienti e configura sconti strategici. Integrato nativamente con l'ecosistema Shopify, trasforma le chat dei visitatori in acquisti immediati.",
    tasks: [
      "Ricerca prodotti nel catalogo",
      "Generazione link carrello diretti",
      "Stato ordini e tracciamento",
      "Creazione codici sconto",
    ],
    integrations: ["Shopify"],
    workflow: [
      "Interroga catalogo",
      "Proponi prodotti ideali",
      "Genera checkout rapido",
      "Invia conferma al cliente",
    ],
    accent: "bg-green-500",
  },
  {
    slug: "lead-capture",
    name: "Lead Capture Agent",
    shortName: "Lead Capture",
    category: "Marketing & Sales",
    industry: "Team commerciali, consulenti e agenzie",
    icon: "mail",
    price: "€9,99/mo",
    priceCents: 999,
    stripePriceId: "price_lead_capture",
    setupTime: "Same day",
    badge: "New",
    description:
      "Cattura ogni lead dal sito, arricchisce i profili con dati aziendali e allerta il team vendite in tempo reale.",
    longDescription:
      "Il Lead Capture Agent non lascia sfuggire alcun visitatore qualificato. Raccoglie i contatti dai form e dalle chat, arricchisce i dati aziendali (settore, dimensione, ruolo) e invia istantaneamente una notifica al team commerciale su Slack o webhook con i prossimi passi consigliati.",
    tasks: [
      "Acquisizione lead da chat e form",
      "Arricchimento profili aziendali",
      "Notifiche vendite su Slack/Webhook",
      "Scoring automatico del contatto",
    ],
    integrations: ["Slack", "HubSpot", "Salesforce", "Zapier"],
    workflow: [
      "Cattura contatto",
      "Arricchisci dati azienda",
      "Assegna punteggio lead",
      "Notifica team commerciale",
    ],
    accent: "bg-orange-500",
  },
  {
    slug: "support-agent",
    name: "Support Agent",
    shortName: "Support Agent",
    category: "Customer Service",
    industry: "Aziende di servizi, SaaS e negozi online",
    icon: "headphones",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_support_agent",
    setupTime: "1 day",
    badge: "Popular",
    description:
      "Risponde ai ticket 24/7 con la knowledge base aziendale ed effettua escalation intelligente solo quando necessario.",
    longDescription:
      "Il Support Agent risolve le richieste dei tuoi clienti a qualsiasi ora. Addestrato sui tuoi documenti e FAQ tramite Knowledge Base RAG, fornisce risposte empatiche e precise. Se un problema richiede un intervento umano, prepara un briefing dettagliato e notifica il team.",
    tasks: [
      "Risposte 24/7 su Knowledge Base",
      "Classificazione ticket e urgenza",
      "Risoluzione problemi frequenti",
      "Escalation intelligente al team umano",
    ],
    integrations: ["Zendesk", "Intercom", "Help Scout", "Slack"],
    workflow: [
      "Analizza richiesta",
      "Cerca nella Knowledge Base",
      "Rispondi con passaggi chiari",
      "Verifica soddisfazione cliente",
    ],
    accent: "bg-purple-500",
  },
  {
    slug: "calendar-booking",
    name: "Calendar Booking Agent",
    shortName: "Calendar Booking",
    category: "Business & Operations",
    industry: "Studi professionali, medici, consulenti e saloni",
    icon: "calendar",
    price: "€9,99/mo",
    priceCents: 999,
    stripePriceId: "price_calendar_booking",
    setupTime: "Same day",
    badge: "Fast setup",
    description:
      "Controlla le disponibilità, prenota appuntamenti su Google Calendar e invia conferme con link video.",
    longDescription:
      "Il Calendar Booking Agent elimina il continuo scambio di messaggi per fissare una data. Cerca gli slot liberi su Google Calendar, propone le opzioni migliori al cliente, fissa l'appuntamento e invia l'invito con il link Meet o Zoom già allegato.",
    tasks: [
      "Verifica disponibilità in tempo reale",
      "Prenotazione automatica su Calendar",
      "Invio promemoria e link riunione",
      "Gestione cancellazioni e spostamenti",
    ],
    integrations: ["Google Calendar", "Outlook", "Zoom", "Slack"],
    workflow: [
      "Trova orari liberi",
      "Proponi opzioni al cliente",
      "Conferma e prenota evento",
      "Invia invito con link video",
    ],
    accent: "bg-cyan-500",
  },
  {
    slug: "quote-agent",
    name: "Preventivi & Quote Agent",
    shortName: "Preventivi Agent",
    category: "E-commerce & Finance",
    industry: "PMI, artigiani, officine e agenzie",
    icon: "file-text",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_quote_agent",
    setupTime: "Same day",
    badge: "Popular",
    description:
      "Raccoglie requisiti in chat, calcola subtotale, IVA e sconti e invia preventivi formali via email.",
    longDescription:
      "Il Preventivi Agent guida i potenziali clienti nella definizione dei servizi richiesti, genera istantaneamente una stima trasparente con calcolo delle imposte e, su richiesta dell'utente, trasmette una proposta formale via email con allegato di riepilogo.",
    tasks: [
      "Raccolta specifiche del progetto",
      "Calcolo dettagliato subtotale e IVA",
      "Applicazione sconti personalizzati",
      "Invio preventivo formale via email",
    ],
    integrations: ["Resend", "Stripe", "Gmail", "Slack"],
    workflow: [
      "Raccogli voci di spesa",
      "Calcola totale e imposte",
      "Mostra anteprima al cliente",
      "Invia proposta via email",
    ],
    accent: "bg-emerald-600",
  },
  {
    slug: "reviews-agent",
    name: "Recensioni & Reputation Agent",
    shortName: "Recensioni Agent",
    category: "Customer Service",
    industry: "Ristoranti, hotel, negozi e attività locali",
    icon: "message-square",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_reviews_agent",
    setupTime: "Same day",
    badge: "Popular",
    description:
      "Monitora le recensioni Google Business, rileva il sentiment e risponde con messaggi personalizzati ed empatici.",
    longDescription:
      "Il Recensioni Agent protegge e valorizza la reputazione del tuo locale o attività su Google Business Profile. Analizza i feedback dei clienti, individua criticità e propone bozze di risposta gentili e mirate, pronte per essere pubblicate con la tua approvazione.",
    tasks: [
      "Monitoraggio recensioni Google Business",
      "Analisi del sentiment clienti",
      "Bozze di risposta personalizzate",
      "Gestione tempestiva feedback critici",
    ],
    integrations: ["Google Business Profile", "Slack", "WhatsApp"],
    workflow: [
      "Recupera nuove recensioni",
      "Analizza tono e valutazione",
      "Redigi risposta professionale",
      "Pubblica con approvazione",
    ],
    accent: "bg-amber-500",
  },
  {
    slug: "seo-agent",
    name: "SEO Content Agent",
    shortName: "SEO Content",
    category: "Marketing & Sales",
    industry: "Team di marketing e creatori di contenuti",
    icon: "search",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_seo_agent",
    setupTime: "1 day",
    badge: "Popular",
    description:
      "Crea articoli strutturati e ottimizzati per i motori di ricerca con analisi dei competitor e keyword research.",
    longDescription:
      "Il SEO Content Agent individua gli argomenti ad alto potenziale di traffico, analizza i primi risultati sui motori di ricerca e scrive articoli completi con struttura H1/H2, meta description accattivanti e suggerimenti per la link building interna.",
    tasks: [
      "Keyword research e intento di ricerca",
      "Analisi dei contenuti dei competitor",
      "Scrittura articoli ottimizzati SEO",
      "Ottimizzazione meta tag e link interni",
    ],
    integrations: ["Ahrefs", "Google Search Console", "WordPress", "Notion"],
    workflow: [
      "Cerca parole chiave",
      "Esamina i competitor top",
      "Redigi articolo approfondito",
      "Ottimizza meta description",
    ],
    accent: "bg-orange-500",
  },
  {
    slug: "email-manager",
    name: "Email Manager",
    shortName: "Email Manager",
    category: "Business & Operations",
    industry: "Dirigenti, professionisti e titolari d'azienda",
    icon: "mail",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_email_manager",
    setupTime: "Same day",
    badge: "New",
    description:
      "Riordina la casella di posta, monitora scadenze e impegni importanti e fornisce un riassunto giornaliero.",
    longDescription:
      "L'Email Manager analizza la posta in arrivo, evidenzia le comunicazioni prioritarie, prepara bozze di risposta da confermare ed estrae impegni e date importanti trasformandoli in promemoria pratici.",
    tasks: [
      "Smistamento e categorizzazione email",
      "Preparazione bozze di risposta rapida",
      "Tracciamento scadenze e promemoria",
      "Digest sintetico di fine giornata",
    ],
    integrations: ["Gmail", "Google Calendar", "Outlook", "Slack"],
    workflow: [
      "Scansiona messaggi",
      "Prioritizza le urgenze",
      "Prepara bozze risposte",
      "Genera riassunto giornaliero",
    ],
    accent: "bg-emerald-500",
  },
  {
    slug: "copywriter",
    name: "Copywriter Agent",
    shortName: "Copywriter",
    category: "Design & Content",
    industry: "Marketing, agenzie di comunicazione e startup",
    icon: "pen-tool",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_copywriter",
    setupTime: "Same day",
    badge: "Popular",
    description:
      "Scrive testi ad alta conversione per landing page, campagne pubblicitarie ed email marketing con varianti A/B.",
    longDescription:
      "Il Copywriter Agent produce testi orientati alla conversione per ogni canale. Genera molteplici varianti per test A/B con angoli comunicativi differenti (vantaggio economico, risparmio di tempo, esclusività) pronti per la pubblicazione.",
    tasks: [
      "Copywriting per landing page",
      "Annunci pubblicitari Meta e Google",
      "Sequenze email e newsletter",
      "Microcopy per interfacce e pulsanti",
    ],
    integrations: ["Webflow", "WordPress", "Mailchimp", "Notion"],
    workflow: [
      "Analizza target e offerta",
      "Elabora 3 angoli persuasivi",
      "Redigi varianti complete",
      "Salva bozza pronta all'uso",
    ],
    accent: "bg-pink-500",
  },
  {
    slug: "business-manager",
    name: "Business Manager Agent",
    shortName: "Business Manager",
    category: "Business & Operations",
    industry: "Imprenditori, titolari di PMI e startup founder",
    icon: "bar-chart",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_business_manager",
    setupTime: "Same day",
    badge: "Customizable",
    description:
      "Un COO virtuale in chat: report operativi, sincronizzazione KPI e supporto decisionale strategico.",
    longDescription:
      "Il Business Manager Agent funge da assistente strategico per la direzione aziendale. Aggrega dati di vendita, appuntamenti e performance, redige report operativi chiari e suggerisce priorità d'azione per scalare l'attività.",
    tasks: [
      "Report dirigenziali e analisi KPI",
      "Pianificazione strategica e priorità",
      "Supporto alle decisioni aziendali",
      "Coordinamento operativo dei flussi",
    ],
    integrations: ["Google Calendar", "Gmail", "Google Sheets", "Slack"],
    workflow: [
      "Sincronizza dati e metriche",
      "Individua anomalie e trend",
      "Compila briefing esecutivo",
      "Proponi azioni prioritarie",
    ],
    accent: "bg-indigo-500",
  },

  // ─── Finance, assistant, HR, social, inventory ──────────────────────────────
  {
    slug: "finance-manager",
    name: "Finance Manager Agent",
    shortName: "Finance Manager",
    category: "E-commerce & Finance",
    industry: "PMI, liberi professionisti e store manager",
    icon: "file-text-dollar",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_finance_manager",
    setupTime: "1 day",
    badge: "New",
    description:
      "Monitora flussi di cassa, scadenze fiscali, riconciliazione pagamenti e solleciti fatture.",
    longDescription:
      "Il Finance Manager Agent mantiene sotto controllo i numeri della tua azienda. Riconcilia incassi e spese, prepara solleciti gentili per i pagamenti in sospeso e fornisce una panoramica chiara della liquidità senza fogli di calcolo dispersivi.",
    tasks: [
      "Riconciliazione entrate e uscite",
      "Monitoraggio scadenze fatture",
      "Solleciti di pagamento automatici",
      "Briefing liquidità e cash flow",
    ],
    integrations: ["Stripe", "QuickBooks", "Google Sheets", "Slack"],
    workflow: [
      "Traccia incassi Stripe",
      "Verifica fatture aperte",
      "Prepara solleciti di pagamento",
      "Genera report mensile liquidità",
    ],
    accent: "bg-brand-600",
  },
  {
    slug: "personal-assistant",
    name: "Personal Assistant Agent",
    shortName: "Personal Assistant",
    category: "Business & Operations",
    industry: "Professionisti, consulenti e imprenditori",
    icon: "calendar",
    price: "€9,99/mo",
    priceCents: 999,
    stripePriceId: "price_personal_assistant",
    setupTime: "Same day",
    badge: "Fast setup",
    description:
      "Pianifica le tue giornate, organizza la to-do list, riassume riunioni e riserva tempo per il deep work.",
    longDescription:
      "Il Personal Assistant Agent agisce come un assistente esecutivo personale. Struttura la tua agenda quotidiana, gestisce la lista delle attività prioritarie, riassume note e documenti e ti aiuta a recuperare ore preziose ogni settimana.",
    tasks: [
      "Pianificazione agenda giornaliera",
      "Gestione priorità e task list",
      "Sintesi di note e verbali riunione",
      "Blocchi di concentrazione deep work",
    ],
    integrations: ["Google Calendar", "Gmail", "Notion", "Slack"],
    workflow: [
      "Raccogli impegni e compiti",
      "Prioritizza le urgenze",
      "Ottimizza la giornata",
      "Invia resoconto mattutino",
    ],
    accent: "bg-brand-400",
  },
  {
    slug: "hr-recruiter",
    name: "HR & Recruiter Agent",
    shortName: "HR Recruiter",
    category: "Business & Operations",
    industry: "PMI in crescita, agenzie e reparti risorse umane",
    icon: "users",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_hr_recruiter",
    setupTime: "Same day",
    badge: "New",
    description:
      "Automatizza la selezione del personale: screening CV, prequalifica candidati e organizzazione colloqui.",
    longDescription:
      "L'HR Recruiter Agent accelera il processo di assunzione per la tua azienda. Analizza i curricula ricevuti confrontandoli con i requisiti della posizione, formula domande di prequalifica e pianifica i primi colloqui su Calendar.",
    tasks: [
      "Screening automatico dei CV",
      "Confronto competenze e job description",
      "Comunicazioni e feedback candidati",
      "Pianificazione interviste e colloqui",
    ],
    integrations: ["LinkedIn", "Google Calendar", "Gmail", "Notion"],
    workflow: [
      "Ricevi candidature",
      "Estrai competenze chiave",
      "Assegna punteggio di adeguatezza",
      "Pianifica primo colloquio",
    ],
    accent: "bg-blue-500",
  },
  {
    slug: "social-media-agent",
    name: "Social Media Agent",
    shortName: "Social Media",
    category: "Design & Content",
    industry: "Brand, negozi, agenzie e content creator",
    icon: "palette",
    price: "€9,99/mo",
    priceCents: 999,
    stripePriceId: "price_social_media_agent",
    setupTime: "Same day",
    badge: "Popular",
    description:
      "Pianifica il calendario editoriale social, crea caption ingaggianti, suggerisce hashtag e analizza i trend.",
    longDescription:
      "Il Social Media Agent è il tuo copywriter e planner dedicato per Instagram, LinkedIn, TikTok e Facebook. Propone idee di post basate sui trend del momento, scrive testi coinvolgenti con hashtag mirati e organizza il piano editoriale settimanale.",
    tasks: [
      "Piani editoriali settimanali",
      "Copy per post Instagram e LinkedIn",
      "Ricerca hashtag e trend di settore",
      "Adattamento formati per canale",
    ],
    integrations: ["Instagram", "LinkedIn", "Facebook", "Notion"],
    workflow: [
      "Individua argomenti di tendenza",
      "Redigi testi con call to action",
      "Seleziona hashtag ottimali",
      "Pianifica sul calendario social",
    ],
    accent: "bg-rose-500",
  },
  {
    slug: "inventory-logistics",
    name: "Inventory & Logistics Agent",
    shortName: "Logistics Agent",
    category: "E-commerce & Finance",
    industry: "E-commerce, rivenditori e magazzini fisici",
    icon: "package",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_inventory_logistics",
    setupTime: "1 day",
    badge: "New",
    description:
      "Monitora le scorte in magazzino, allerta sui prodotti sottoscorta e traccia le spedizioni dei fornitori.",
    longDescription:
      "L'Inventory & Logistics Agent evita rotture di stock e ritardi nelle consegne. Controlla le giacenze di magazzino in tempo reale, calcola i tempi ottimali di riordino merci e monitora le spedizioni in transito segnalando tempestivamente le anomalie.",
    tasks: [
      "Controllo livelli scorte magazzino",
      "Avvisi automatici di sottoscorta",
      "Previsione volumi di riordino",
      "Tracciamento stato spedizioni merci",
    ],
    integrations: ["Shopify", "Google Sheets", "Slack", "Gmail"],
    workflow: [
      "Verifica giacenze attuali",
      "Calcola velocità di vendita",
      "Allerta su articoli critici",
      "Genera bozza ordine fornitore",
    ],
    accent: "bg-amber-600",
  },
];

export const AGENTS: Agent[] = SEEDS.map((seed) => ({
  ...seed,
  stripePriceId: resolveStripePriceId(seed.slug, seed.stripePriceId),
}));

export function getAgentBySlug(slug: string) {
  return AGENTS.find((agent) => agent.slug === slug);
}

/**
 * Returns a copy of the agent with the user-facing fields overlaid in the
 * given locale. English (the canonical catalog) is returned unchanged;
 * Italian overlays come from `./i18n/agentCatalog`.
 */
export function localizeAgent(agent: Agent, locale: import("./i18n/constants").Locale): Agent {
  const localized = getAgentLocalization(agent.slug, locale);
  if (!localized) return agent;
  return {
    ...agent,
    name: localized.name,
    shortName: localized.shortName,
    category: localized.category as AgentCategory,
    industry: localized.industry,
    setupTime: localizeSetupTime(agent.setupTime, locale),
    // L'overlay del badge porta testi di display localizzati ("Popolare",
    // "Novità", "Consigliato") che non rientrano nel tipo union inglese —
    // sicuro perché il badge è renderizzato solo come testo ovunque nella UI.
    badge: localized.badge as Agent["badge"],
    description: localized.description,
    longDescription: localized.longDescription,
    tasks: localized.tasks,
    workflow: localized.workflow,
  };
}

// ─── Marketplace guidato dai flag ─────────────────────────────────────────
// Quali agenti offre il marketplace lo decidono i feature flag runtime (vedi
// ./agents/feature-flags). Gli agenti abilitati dai flag sono "available"; il
// resto del catalogo appare come "coming soon".
//
// NOTA: `AGENTCLOUD_VERTICAL` / `AGENTCLOUD_FEATURE_FLAGS` sono env var solo
// server, quindi i bundle client li valutano con la config di default
// (shopify). I server component (es. /agents) vedono i flag reali; passa il
// risultato ai componenti client via props quando il valore deve essere
// autoritativo.

/** Slug abilitati dai feature flag attivi. */
export function getEnabledAgentSlugs(): string[] {
  return getFeatureFlags().enabledAgents;
}

export function isAvailable(slug: string): boolean {
  return getEnabledAgentSlugs().includes(slug);
}

export const AVAILABLE_AGENTS: Agent[] = AGENTS.filter((a) =>
  isAvailable(a.slug),
);

// ─── Agenti in evidenza nella navbar ──────────────────────────────────────
// Il menu a tendina della navbar mostra volutamente un set fisso di agenti
// di punta per restare compatto — NON deve crescere quando si aggiungono
// agenti al catalogo. Il catalogo completo è a un click con "Sfoglia tutti
// gli agenti".

export const FEATURED_AGENT_SLUGS = [
  "shopify-agent",
  "email-manager",
  "support-agent",
  "lead-capture",
] as const;

/** Sottoinsieme in evidenza di una lista di agenti, nell'ordine curato. */
export function getFeaturedAgents(agents: Agent[]): Agent[] {
  return FEATURED_AGENT_SLUGS.map((slug) =>
    agents.find((a) => a.slug === slug),
  ).filter((a): a is Agent => Boolean(a));
}

export const COMING_SOON_AGENTS: Agent[] = AGENTS.filter((a) =>
  !isAvailable(a.slug),
);
