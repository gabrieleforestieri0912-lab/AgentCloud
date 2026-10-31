/**
 * Setup guidato (onboarding) — opzioni e tipi condivisi client/server.
 *
 * Modulo PURO: nessun import runtime (i file che lo usano passano da qui sia
 * nel browser sia nelle API). Le ETICHETTE visibili all'utente non stanno qui
 * ma in `src/lib/i18n/onboarding.ts` (it + en): gli id qui sotto sono le chiavi
 * di quelle traduzioni e i valori salvati su DB. Se cambi un id qui, cambia in
 * i18n e in eventuali righe già salvate.
 *
 * Il campo `defaultAgentSlug` NON è qui: l'agente predefinito vive nella
 * preferenza `agentcloud_chat_default_agent` (user_preferences), che la chat
 * già legge; il JSONB `profiles.onboarding` ne tiene una copia per l'export.
 */

/** Occupazione (schermata 2, scelta singola). */
export const OCCUPATIONS = [
  "employee",
  "business",
  "student",
  "exploring",
  "other",
] as const;
export type Occupation = (typeof OCCUPATIONS)[number];

/** Ruoli (schermata 3, lavoro/attività). "other" apre un campo libero. */
export const ROLES = [
  "product-manager",
  "developer",
  "marketer",
  "sales-rep",
  "solo-founder",
  "designer",
  "data-analyst",
  "customer-success",
  "community-lead",
  "finance-ops",
  "operations",
  "course-creator",
] as const;
export type Role = (typeof ROLES)[number];

/** Niveau di studio (schermata 3, risposta "student"). */
export const STUDY_LEVELS = [
  "highschool",
  "university",
  "postgrad",
  "self-taught",
] as const;
export type StudyLevel = (typeof STUDY_LEVELS)[number];

/**
 * Cosa vorrebbe delegare (schermata 4, multi fino a 3). Ogni obiettivo è
 * mappato su una categoria VERA del catalogo agenti (vedi `src/lib/agents.ts`):
 * è quella che alimenta lo scoring della raccomandazione.
 */
export const GOALS = [
  "sales-finance",
  "marketing",
  "customers",
  "admin",
  "content",
  "data",
  "dev",
] as const;
export type GoalId = (typeof GOALS)[number];
export const GOAL_CATEGORY: Record<GoalId, string> = {
  "sales-finance": "E-commerce & Finance",
  marketing: "Marketing & Sales",
  customers: "Customer Service",
  admin: "Business & Operations",
  content: "Design & Content",
  data: "AI & Data",
  dev: "Development",
};

/** Massimo obiettivi selezionabili (la domanda chiede "al massimo 3"). */
export const GOALS_MAX = 3;

/**
 * Tool dichiarati (schermata 5, multi). `label` è il nome usato in
 * `agent.integrations` del catalogo (inglese canonico): lo scoring li incrocia
 * così senza traduzioni. `brand` è lo slug di `src/lib/brands.ts` /
 * `public/brand-logos` per il logo.
 */
export const TOOLS = [
  { id: "gmail", label: "Gmail", brand: "gmail" },
  { id: "google-calendar", label: "Google Calendar", brand: "googlecalendar" },
  { id: "google-drive", label: "Google Drive", brand: "googledrive" },
  { id: "google-sheets", label: "Google Sheets", brand: "googlesheets" },
  { id: "google-docs", label: "Google Docs", brand: "googledocs" },
  { id: "outlook", label: "Outlook", brand: "microsoftoutlook" },
  { id: "notion", label: "Notion", brand: "notion" },
  { id: "slack", label: "Slack", brand: "slack" },
  { id: "whatsapp", label: "WhatsApp", brand: "whatsapp" },
  { id: "instagram", label: "Instagram", brand: "instagram" },
  { id: "shopify", label: "Shopify", brand: "shopify" },
  { id: "hubspot", label: "HubSpot", brand: "hubspot" },
  { id: "stripe", label: "Stripe", brand: "stripe" },
  { id: "github", label: "GitHub", brand: "github" },
  { id: "mailchimp", label: "Mailchimp", brand: "mailchimp" },
  { id: "google-analytics", label: "Google Analytics", brand: "googleanalytics" },
] as const;
export type ToolId = (typeof TOOLS)[number]["id"];
export const TOOL_IDS = TOOLS.map((t) => t.id) as readonly ToolId[];

/** Etichetta canonica (English di catalogo) per un id di tool. */
export function toolLabel(id: string): string {
  return TOOLS.find((t) => t.id === id)?.label ?? "";
}

/** Tono delle risposte (schermata 6). */
export const TONES = ["direct", "stepbystep", "technical", "friendly"] as const;
export type Tone = (typeof TONES)[number];

/** Lingua preferita per le risposte: le stesse lingue della piattaforma. */
export const LANGUAGES = ["it", "en", "es", "de", "fr"] as const;
export type Language = (typeof LANGUAGES)[number];

/** Massimo caratteri per i campi liberi (occupazione "other", ruolo "other",
 *  area di studio, nome). Server e client validano lo stesso tetto. */
export const FREE_TEXT_MAX = 200;
export const NAME_MAX = 80;

/**
 * Ruoli tipici di ogni agente (config "suggestedRoles"): +1 allo scoring se
 * il ruolo dell'utente è qui. Le chiavi sono gli slug del catalogo
 * (`src/lib/agents.ts`), i valori id di ROLES. Aggiungere un agente senza
 * riga qui è ok: semplicemente non prende il bonus ruolo.
 */
export const AGENT_ROLE_FIT: Record<string, readonly Role[]> = {
  "shopify-agent": ["solo-founder", "operations", "finance-ops"],
  "lead-capture": ["sales-rep", "marketer", "data-analyst"],
  "support-agent": ["customer-success", "community-lead", "operations"],
  "calendar-booking": ["solo-founder", "operations", "sales-rep", "product-manager"],
  "quote-agent": ["solo-founder", "sales-rep", "finance-ops"],
  "reviews-agent": ["customer-success", "community-lead", "solo-founder"],
  "seo-agent": ["marketer", "course-creator"],
  "email-manager": ["product-manager", "operations", "sales-rep", "solo-founder"],
  "copywriter": ["marketer", "community-lead", "course-creator", "designer"],
  "business-manager": ["solo-founder", "product-manager", "operations", "finance-ops"],
  "finance-manager": ["finance-ops", "solo-founder"],
  "personal-assistant": ["product-manager", "operations", "solo-founder", "data-analyst"],
  "hr-recruiter": ["operations", "customer-success"],
  "social-media-agent": ["marketer", "designer", "community-lead", "course-creator"],
  "inventory-logistics": ["operations", "finance-ops"],
  "network-marketing": ["sales-rep", "solo-founder", "community-lead"],
  "webdev-agent": ["developer", "designer"],
  "email-agent": ["product-manager", "operations"],
  "whatsapp-agent": ["customer-success", "sales-rep", "community-lead"],
  "invoice-agent": ["finance-ops", "solo-founder"],
  "analytics-agent": ["data-analyst", "marketer", "product-manager"],
  "crm-agent": ["sales-rep", "marketer", "data-analyst"],
  "document-agent": ["product-manager", "operations", "data-analyst"],
  "research-agent": ["data-analyst", "product-manager", "marketer"],
};

/**
 * Ordine di preferenza quando lo scoring NON raccoglie punti: agenti
 * versatili/popolari al prime in alto. La variante per chi studia o cerca
 * ancora un compasso rimanda versi la ricerca e i documenti, non alle
 * abbonamenti per ecosystem.
 */
export const POPULAR_PREFERENCE = [
  "personal-assistant",
  "email-manager",
  "business-manager",
  "research-agent",
] as const;

export const STUDENT_PREFERENCE = [
  "research-agent",
  "document-agent",
  "personal-assistant",
  "business-manager",
] as const;

/** Azioni dell'agente predefinito (schermata 7). */
export const DEFAULT_AGENT_NONE = ""; // nessun default: "chiedimi ogni volta"

/** Forma delle risposte salvate in `profiles.onboarding` (JSONB). Tutti i
 *  campi sono opzionali: la riga cresce schermata per schermata. */
export type OnboardingAnswers = {
  displayName?: string;
  occupation?: Occupation;
  /** Campo libero se occupation === "other". */
  occupationOther?: string;
  role?: Role;
  /** Campo libero se role === "other" (non è tra i ROLES fissi). */
  roleOther?: string;
  studyLevel?: StudyLevel;
  studyArea?: string;
  goals?: GoalId[];
  tools?: ToolId[];
  tone?: Tone;
  language?: Language;
  /** Slug dell'agente predefinito; "" = nessuno ("fammi scegliere ogni volta"). */
  defaultAgentSlug?: string;
};

/** Aggiornamento parziale (le chiavi presenti vengono sovrascritte). */
export type OnboardingPatch = Partial<OnboardingAnswers>;
