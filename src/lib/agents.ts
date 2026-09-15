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
  localizeBadge,
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
  /** Localized display label for `badge`, set by `localizeAgent()`. */
  badgeLabel?: string;
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
    industry: "E-commerce stores and D2C brands",
    icon: "shopping-cart",
    brand: "shopify",
    price: "€9,99/mo",
    priceCents: 999,
    stripePriceId: "price_shopify_agent",
    setupTime: "Same day",
    badge: "Popular",
    description:
      "Run your whole Shopify store: product search, discount creation, direct cart links and sales tracking.",
    longDescription:
      "The Shopify Agent is the command centre for your e-commerce. It searches your catalog, generates cart links with instant checkout, tracks shipment status for customers and sets up strategic discounts. Natively integrated with the Shopify ecosystem, it turns visitor chats into immediate purchases.",
    tasks: [
      "Product search in the catalog",
      "Direct cart link generation",
      "Order status and tracking",
      "Discount code creation",
    ],
    integrations: ["Shopify"],
    workflow: [
      "Query the catalog",
      "Suggest the right products",
      "Generate a fast checkout",
      "Send confirmation to the customer",
    ],
    accent: "bg-green-500",
  },
  {
    slug: "lead-capture",
    name: "Lead Capture Agent",
    shortName: "Lead Capture",
    category: "Marketing & Sales",
    industry: "Sales teams, consultants and agencies",
    icon: "mail",
    price: "€9,99/mo",
    priceCents: 999,
    stripePriceId: "price_lead_capture",
    setupTime: "Same day",
    badge: "New",
    description:
      "Capture every lead from your site, enrich profiles with company data and alert the sales team in real time.",
    longDescription:
      "The Lead Capture Agent never lets a qualified visitor slip away. It collects contacts from forms and chats, enriches company data (industry, size, role) and instantly notifies the sales team on Slack or via webhook with the recommended next steps.",
    tasks: [
      "Lead capture from chat and forms",
      "Company profile enrichment",
      "Sales notifications on Slack/Webhook",
      "Automatic contact scoring",
    ],
    integrations: ["Slack", "HubSpot", "Salesforce", "Zapier"],
    workflow: [
      "Capture the contact",
      "Enrich company data",
      "Score the lead",
      "Notify the sales team",
    ],
    accent: "bg-orange-500",
  },
  {
    slug: "support-agent",
    name: "Support Agent",
    shortName: "Support Agent",
    category: "Customer Service",
    industry: "Service companies, SaaS and online stores",
    icon: "headphones",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_support_agent",
    setupTime: "1 day",
    badge: "Popular",
    description:
      "Answers tickets 24/7 from your company knowledge base and escalates intelligently only when needed.",
    longDescription:
      "The Support Agent resolves customer requests at any hour. Trained on your documents and FAQs through a RAG knowledge base, it gives empathetic and accurate answers. If a problem needs a human, it prepares a detailed briefing and notifies the team.",
    tasks: [
      "24/7 answers from the knowledge base",
      "Ticket and urgency classification",
      "Resolution of recurring issues",
      "Smart escalation to the human team",
    ],
    integrations: ["Zendesk", "Intercom", "Help Scout", "Slack"],
    workflow: [
      "Analyse the request",
      "Search the knowledge base",
      "Answer with clear steps",
      "Check customer satisfaction",
    ],
    accent: "bg-purple-500",
  },
  {
    slug: "calendar-booking",
    name: "Calendar Booking Agent",
    shortName: "Calendar Booking",
    category: "Business & Operations",
    industry: "Professional practices, clinics, consultants and salons",
    icon: "calendar",
    price: "€9,99/mo",
    priceCents: 999,
    stripePriceId: "price_calendar_booking",
    setupTime: "Same day",
    badge: "Fast setup",
    description:
      "Checks availability, books appointments on Google Calendar and sends confirmations with a video link.",
    longDescription:
      "The Calendar Booking Agent removes the endless back-and-forth of finding a date. It looks up free slots on Google Calendar, proposes the best options to the customer, books the appointment and sends the invite with the Meet or Zoom link already attached.",
    tasks: [
      "Real-time availability checks",
      "Automatic booking on Calendar",
      "Reminders and meeting links",
      "Cancellations and rescheduling",
    ],
    integrations: ["Google Calendar", "Outlook", "Zoom", "Slack"],
    workflow: [
      "Find free time slots",
      "Offer options to the customer",
      "Confirm and book the event",
      "Send the invite with a video link",
    ],
    accent: "bg-cyan-500",
  },
  {
    slug: "quote-agent",
    name: "Quotes & Estimates Agent",
    shortName: "Quotes Agent",
    category: "E-commerce & Finance",
    industry: "SMBs, tradespeople, workshops and agencies",
    icon: "file-text",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_quote_agent",
    setupTime: "Same day",
    badge: "Popular",
    description:
      "Collects requirements in chat, calculates subtotal, VAT and discounts, and sends formal quotes by email.",
    longDescription:
      "The Quotes Agent guides prospects through the services they need, instantly generates a transparent estimate with tax calculation and, on request, sends a formal proposal by email with a summary attached.",
    tasks: [
      "Project requirements gathering",
      "Detailed subtotal and VAT calculation",
      "Custom discount application",
      "Formal quote sent by email",
    ],
    integrations: ["Resend", "Stripe", "Gmail", "Slack"],
    workflow: [
      "Collect the line items",
      "Calculate total and taxes",
      "Show a preview to the customer",
      "Send the proposal by email",
    ],
    accent: "bg-emerald-600",
  },
  {
    slug: "reviews-agent",
    name: "Reviews & Reputation Agent",
    shortName: "Reviews Agent",
    category: "Customer Service",
    industry: "Restaurants, hotels, shops and local businesses",
    icon: "message-square",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_reviews_agent",
    setupTime: "Same day",
    badge: "Popular",
    description:
      "Monitors Google Business reviews, reads the sentiment and replies with personalised, empathetic messages.",
    longDescription:
      "The Reviews Agent protects and builds your business reputation on Google Business Profile. It analyses customer feedback, spots recurring issues and drafts kind, on-point replies ready to publish once you approve them.",
    tasks: [
      "Google Business review monitoring",
      "Customer sentiment analysis",
      "Personalised draft replies",
      "Timely handling of critical feedback",
    ],
    integrations: ["Google Business Profile", "Slack", "WhatsApp"],
    workflow: [
      "Fetch new reviews",
      "Analyse tone and rating",
      "Write a professional reply",
      "Publish after approval",
    ],
    accent: "bg-amber-500",
  },
  {
    slug: "seo-agent",
    name: "SEO Content Agent",
    shortName: "SEO Content",
    category: "Marketing & Sales",
    industry: "Marketing teams and content creators",
    icon: "search",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_seo_agent",
    setupTime: "1 day",
    badge: "Popular",
    description:
      "Writes structured, search-optimised articles with competitor analysis and keyword research.",
    longDescription:
      "The SEO Content Agent finds topics with high traffic potential, analyses the top search results and writes complete articles with H1/H2 structure, compelling meta descriptions and internal linking suggestions.",
    tasks: [
      "Keyword research and search intent",
      "Competitor content analysis",
      "Writing SEO-optimised articles",
      "Meta tag and internal link optimisation",
    ],
    integrations: ["Ahrefs", "Google Search Console", "WordPress", "Notion"],
    workflow: [
      "Research keywords",
      "Review the top competitors",
      "Write the in-depth article",
      "Optimise the meta description",
    ],
    accent: "bg-orange-500",
  },
  {
    slug: "email-manager",
    name: "Email Manager",
    shortName: "Email Manager",
    category: "Business & Operations",
    industry: "Executives, professionals and business owners",
    icon: "mail",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_email_manager",
    setupTime: "Same day",
    badge: "New",
    description:
      "Tidies up your inbox, tracks deadlines and key commitments, and delivers a daily summary.",
    longDescription:
      "The Email Manager reads your inbox, highlights the messages that matter, prepares draft replies for you to confirm and lifts commitments and dates out of threads, turning them into practical reminders.",
    tasks: [
      "Email triage and categorisation",
      "Quick draft replies",
      "Deadline tracking and reminders",
      "Short end-of-day digest",
    ],
    integrations: ["Gmail", "Google Calendar", "Outlook", "Slack"],
    workflow: [
      "Scan the messages",
      "Prioritise the urgent ones",
      "Prepare draft replies",
      "Generate the daily summary",
    ],
    accent: "bg-emerald-500",
  },
  {
    slug: "copywriter",
    name: "Copywriter Agent",
    shortName: "Copywriter",
    category: "Design & Content",
    industry: "Marketing teams, communication agencies and startups",
    icon: "pen-tool",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_copywriter",
    setupTime: "Same day",
    badge: "Popular",
    description:
      "Writes high-converting copy for landing pages, ad campaigns and email marketing, with A/B variants.",
    longDescription:
      "The Copywriter Agent produces conversion-focused copy for every channel. It generates multiple A/B variants with different angles (cost saving, time saving, exclusivity) ready to publish.",
    tasks: [
      "Landing page copywriting",
      "Meta and Google ad copy",
      "Email sequences and newsletters",
      "Microcopy for interfaces and buttons",
    ],
    integrations: ["Webflow", "WordPress", "Mailchimp", "Notion"],
    workflow: [
      "Analyse audience and offer",
      "Develop three persuasive angles",
      "Write complete variants",
      "Save a ready-to-use draft",
    ],
    accent: "bg-pink-500",
  },
  {
    slug: "business-manager",
    name: "Business Manager Agent",
    shortName: "Business Manager",
    category: "Business & Operations",
    industry: "Entrepreneurs, SMB owners and startup founders",
    icon: "bar-chart",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_business_manager",
    setupTime: "Same day",
    badge: "Customizable",
    description:
      "A virtual COO in chat: operational reports, KPI sync and strategic decision support.",
    longDescription:
      "The Business Manager Agent acts as a strategic assistant for company leadership. It aggregates sales, calendar and performance data, writes clear operational reports and suggests the priorities that move the business forward.",
    tasks: [
      "Executive reports and KPI analysis",
      "Strategic planning and priorities",
      "Support for business decisions",
      "Operational coordination of workflows",
    ],
    integrations: ["Google Calendar", "Gmail", "Google Sheets", "Slack"],
    workflow: [
      "Sync data and metrics",
      "Spot anomalies and trends",
      "Compile the executive briefing",
      "Propose priority actions",
    ],
    accent: "bg-indigo-500",
  },

  // ─── Finance, assistant, HR, social, inventory ──────────────────────────────
  {
    slug: "finance-manager",
    name: "Finance Manager Agent",
    shortName: "Finance Manager",
    category: "E-commerce & Finance",
    industry: "SMBs, freelancers and store managers",
    icon: "file-text-dollar",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_finance_manager",
    setupTime: "1 day",
    badge: "New",
    description:
      "Monitors cash flow, tax deadlines, payment reconciliation and invoice reminders.",
    longDescription:
      "The Finance Manager Agent keeps your company numbers under control. It reconciles income and expenses, prepares polite reminders for outstanding payments and gives you a clear view of liquidity without sprawling spreadsheets.",
    tasks: [
      "Income and expense reconciliation",
      "Invoice deadline monitoring",
      "Automatic payment reminders",
      "Liquidity and cash flow briefing",
    ],
    integrations: ["Stripe", "QuickBooks", "Google Sheets", "Slack"],
    workflow: [
      "Track Stripe payments",
      "Check open invoices",
      "Prepare payment reminders",
      "Generate the monthly cash report",
    ],
    accent: "bg-brand-600",
  },
  {
    slug: "personal-assistant",
    name: "Personal Assistant Agent",
    shortName: "Personal Assistant",
    category: "Business & Operations",
    industry: "Professionals, consultants and entrepreneurs",
    icon: "calendar",
    price: "€9,99/mo",
    priceCents: 999,
    stripePriceId: "price_personal_assistant",
    setupTime: "Same day",
    badge: "Fast setup",
    description:
      "Plans your days, organises your to-do list, summarises meetings and protects time for deep work.",
    longDescription:
      "The Personal Assistant Agent works like a personal executive assistant. It structures your daily agenda, manages your priority list, summarises notes and documents and helps you reclaim precious hours every week.",
    tasks: [
      "Daily agenda planning",
      "Priority and task list management",
      "Notes and meeting minutes summaries",
      "Deep work focus blocks",
    ],
    integrations: ["Google Calendar", "Gmail", "Notion", "Slack"],
    workflow: [
      "Collect commitments and tasks",
      "Prioritise the urgent ones",
      "Optimise the day",
      "Send the morning recap",
    ],
    accent: "bg-brand-400",
  },
  {
    slug: "hr-recruiter",
    name: "HR & Recruiter Agent",
    shortName: "HR Recruiter",
    category: "Business & Operations",
    industry: "Growing SMBs, agencies and HR teams",
    icon: "users",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_hr_recruiter",
    setupTime: "Same day",
    badge: "New",
    description:
      "Automates hiring: CV screening, candidate pre-qualification and interview scheduling.",
    longDescription:
      "The HR Recruiter Agent speeds up your hiring process. It reviews incoming CVs against the role requirements, asks pre-qualification questions and schedules first interviews on Calendar.",
    tasks: [
      "Automatic CV screening",
      "Skills vs job description matching",
      "Candidate communication and feedback",
      "Interview scheduling",
    ],
    integrations: ["LinkedIn", "Google Calendar", "Gmail", "Notion"],
    workflow: [
      "Receive applications",
      "Extract key skills",
      "Score the fit",
      "Schedule the first interview",
    ],
    accent: "bg-blue-500",
  },
  {
    slug: "social-media-agent",
    name: "Social Media Agent",
    shortName: "Social Media",
    category: "Design & Content",
    industry: "Brands, shops, agencies and content creators",
    icon: "palette",
    price: "€9,99/mo",
    priceCents: 999,
    stripePriceId: "price_social_media_agent",
    setupTime: "Same day",
    badge: "Popular",
    description:
      "Plans your social content calendar, writes engaging captions, suggests hashtags and tracks trends.",
    longDescription:
      "The Social Media Agent is your dedicated copywriter and planner for Instagram, LinkedIn, TikTok and Facebook. It proposes post ideas built on current trends, writes engaging copy with targeted hashtags and lays out your weekly content plan.",
    tasks: [
      "Weekly content plans",
      "Instagram and LinkedIn post copy",
      "Hashtag and industry trend research",
      "Format adaptation per channel",
    ],
    integrations: ["Instagram", "LinkedIn", "Facebook", "Notion"],
    workflow: [
      "Identify trending topics",
      "Write copy with a call to action",
      "Pick the best hashtags",
      "Schedule on the social calendar",
    ],
    accent: "bg-rose-500",
  },
  {
    slug: "inventory-logistics",
    name: "Inventory & Logistics Agent",
    shortName: "Logistics Agent",
    category: "E-commerce & Finance",
    industry: "E-commerce, retailers and physical warehouses",
    icon: "package",
    price: "€14,99/mo",
    priceCents: 1499,
    stripePriceId: "price_inventory_logistics",
    setupTime: "1 day",
    badge: "New",
    description:
      "Monitors warehouse stock, alerts you on low-stock products and tracks supplier shipments.",
    longDescription:
      "The Inventory & Logistics Agent prevents stock-outs and delivery delays. It checks warehouse levels in real time, calculates the best reorder timing and tracks shipments in transit, flagging problems early.",
    tasks: [
      "Warehouse stock level checks",
      "Automatic low-stock alerts",
      "Reorder volume forecasting",
      "Shipment status tracking",
    ],
    integrations: ["Shopify", "Google Sheets", "Slack", "Gmail"],
    workflow: [
      "Check current stock",
      "Calculate the sales rate",
      "Alert on critical items",
      "Draft the supplier order",
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
 * localized overlays come from `./i18n/agentCatalog.{it,es,de,fr}`.
 * The badge stays canonical (it drives the badge colour) and is paired with
 * a localized `badgeLabel` for display.
 */
export function localizeAgent(agent: Agent, locale: import("./i18n/constants").Locale): Agent {
  const localized = getAgentLocalization(agent.slug, locale);
  const base = {
    ...agent,
    badgeLabel: localizeBadge(agent.badge, locale),
  };
  if (!localized) return base;
  return {
    ...base,
    name: localized.name,
    shortName: localized.shortName,
    category: localized.category as AgentCategory,
    industry: localized.industry,
    setupTime: localizeSetupTime(agent.setupTime, locale),
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
