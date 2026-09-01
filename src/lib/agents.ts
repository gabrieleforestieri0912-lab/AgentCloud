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
  rating: string;
  installs: string;
  badge: "Popular" | "New" | "Customizable" | "Fast setup";
  description: string;
  longDescription: string;
  tasks: string[];
  integrations: string[];
  workflow: string[];
  previewPrompt: string;
  previewResult: string;
  accent: string;
  comingSoon?: true;
};



export const AGENT_CATEGORIES: Array<"All" | AgentCategory> = [
  "All",
  "Business & Operations",
  "Marketing & Sales",
  "Customer Service",
  "Development",
  "AI & Data",
  "Design & Content",
  "E-commerce & Finance",
];

export function resolveStripePriceId(slug: string, fallback: string): string {
  const envKey =
    "STRIPE_PRICE_" + slug.replace(/[^a-z0-9]/gi, "_").toUpperCase();
  return process.env[envKey] || fallback;
}

export function getAgentPriceCents(
  agent: Pick<Agent, "slug" | "priceCents">,
): number {
  return agent.priceCents;
}

type AgentSeed = Omit<Agent, "priceCents" | "stripePriceId"> & {
  priceCents: number;
  stripePriceId: string;
};

const SEEDS: AgentSeed[] = [
  {
    slug: "email-manager",
    name: "Email Manager",
    shortName: "Email Manager",
    category: "Business & Operations",
    industry: "Founders, executives and busy professionals",
    icon: "mail",
    price: "€39/mo",
    priceCents: 3900,
    stripePriceId: "price_email_manager",
    setupTime: "Same day",
    rating: "4.8",
    installs: "980",
    badge: "New",
    description:
      "Tidy your inbox, never miss an important commitment, and get a daily digest.",
    longDescription:
      "The Email Manager agent brings order to your inbox and keeps every commitment on track. It triages incoming mail, labels and files what matters, drafts clear replies for your approval, and watches for deadlines, meetings, and follow-ups hidden inside threads — turning them into tracked commitments with reminders. It summarizes your day into a short digest, flags what needs a decision, and follows up until things are done. Connected to Gmail, Google Calendar, Outlook, and Slack, it cuts hours of email admin every week so you answer what matters and never let an important appointment slip.",
    tasks: [
      "Inbox triage",
      "Reply drafting",
      "Commitment tracking",
      "Daily email digest",
    ],
    integrations: ["Gmail", "Google Calendar", "Outlook", "Slack"],
    workflow: [
      "Scan inbox",
      "Triage and file",
      "Track commitments",
      "Deliver digest",
    ],
    previewPrompt:
      "Tidy up my inbox and remind me of the commitments coming up this week.",
    previewResult:
      "I triaged 42 emails into 6 folders, flagged 3 that need your reply, and set reminders for 5 commitments due this week.",
    accent: "bg-emerald-500",
  },
  {
    slug: "seo-agent",
    name: "SEO Content Agent",
    shortName: "SEO Content",
    category: "Marketing & Sales",
    industry: "Content marketing teams",
    icon: "search",
    price: "€39/mo",
    priceCents: 3900,
    stripePriceId: "price_seo_agent",
    setupTime: "1 day",
    rating: "4.9",
    installs: "1.2k",
    badge: "Popular",
    description:
      "Write structured, keyword-driven articles that actually rank.",
    longDescription:
      "The SEO Content agent researches topics, inspects what competitors rank for, and produces structured, keyword-optimized articles end-to-end. It plans H1/H2 architecture, includes target keywords naturally, and adds meta descriptions and internal links automatically. Connected to Ahrefs, Google Search Console, WordPress, and Notion, it helps your content team publish more, rank faster, and convert readers — with every piece aimed at a real search intent rather than guesswork.",
    tasks: [
      "Keyword research",
      "Content structure",
      "SEO copywriting",
      "Meta optimization",
    ],
    integrations: ["Ahrefs", "Google Search Console", "WordPress", "Notion"],
    workflow: ["Research", "Structure", "Write", "Optimize"],
    previewPrompt:
      "Write an SEO article about local SEO for Italian restaurants.",
    previewResult:
      "I drafted a 1,500-word article with optimized H1/H2 structure, 5 target keywords, a meta description, and internal link suggestions.",
    accent: "bg-orange-500",
  },
  {
    slug: "personal-assistant",
    name: "Personal Assistant",
    shortName: "Personal Assistant",
    category: "Business & Operations",
    industry: "Busy professionals and solopreneurs",
    icon: "calendar",
    price: "€29/mo",
    priceCents: 2900,
    stripePriceId: "price_personal_assistant",
    setupTime: "Same day",
    rating: "4.8",
    installs: "2.0k",
    badge: "Fast setup",
    description:
      "Plan your day, clear your task list, and reclaim hours each week.",
    longDescription:
      "The Personal Assistant agent organizes your day the way a great EA would. It plans your schedule, manages task lists, summarizes meeting notes and documents, books time for deep work, and proactively suggests what to tackle next. Connected to Google Calendar, Gmail, Notion, and Slack, it keeps a busy professional or solopreneur on track — helping you reclaim several hours a week by removing the small logistics of the workday.",
    tasks: ["Schedule planning", "Task management", "Research", "Drafting"],
    integrations: ["Google Calendar", "Gmail", "Notion", "Slack"],
    workflow: ["Collect requests", "Plan day", "Draft actions", "Follow up"],
    previewPrompt:
      "Organize my week, prioritize meetings, and draft a summary email.",
    previewResult:
      "I created a prioritized plan for 5 tasks, rescheduled 2 low-value meetings, and drafted a concise weekly summary.",
    accent: "bg-brand-400",
  },
  {
    slug: "calendar-booking",
    name: "Calendar Booking Agent",
    shortName: "Calendar Booking",
    category: "Business & Operations",
    industry: "Scheduling and meeting teams",
    icon: "calendar",
    price: "€39/mo",
    priceCents: 3900,
    stripePriceId: "price_calendar_booking",
    setupTime: "Same day",
    rating: "4.8",
    installs: "820",
    badge: "Fast setup",
    description:
      "Find free time, book meetings, and send invites automatically.",
    longDescription:
      "The Calendar Booking agent handles scheduling end-to-end. It searches availability across attendees' calendars, proposes the best slots, books the meeting, confirms attendees, and attaches a video link. Connected to Google Calendar, Outlook, Zoom, and Slack, it removes the endless 'when works for you?' back-and-forth — a real time-saver for consultative sales, services businesses, and any team that lives on booked calls.",
    tasks: [
      "Find availability",
      "Schedule meetings",
      "Confirm attendees",
      "Send calendar invites",
    ],
    integrations: ["Google Calendar", "Outlook", "Zoom", "Slack"],
    workflow: [
      "Find free time",
      "Confirm slot",
      "Book meeting",
      "Send confirmation",
    ],
    previewPrompt:
      "Book a 30-minute introduction call with Marco and Anna next week.",
    previewResult:
      "I found three available slots, booked the most convenient 30-minute meeting with Zoom details, and confirmed the invite to all attendees.",
    accent: "bg-cyan-500",
  },
  {
    slug: "lead-capture",
    name: "Lead Capture Agent",
    shortName: "Lead Capture",
    category: "Marketing & Sales",
    industry: "Sales and lead generation",
    icon: "mail",
    price: "€29/mo",
    priceCents: 2900,
    stripePriceId: "price_lead_capture",
    setupTime: "Same day",
    rating: "4.7",
    installs: "660",
    badge: "New",
    description:
      "Capture every lead, enrich it, and alert sales in seconds.",
    longDescription:
      "The Lead Capture agent never lets a prospect slip through. It collects prospect details from forms, chats, and your site, enriches contacts with firmographic and context data, and notifies your sales team with a Slack alert and recommended next step. Connected to Slack, HubSpot, Salesforce, and Zapier, it turns your lead sources into an always-on pipeline — so sales reacts fast, and no inbound inquiry goes unanswered.",
    tasks: [
      "Capture leads",
      "Enrich profiles",
      "Notify sales",
      "Score prospects",
    ],
    integrations: ["Slack", "HubSpot", "Salesforce", "Zapier"],
    workflow: ["Capture details", "Enrich data", "Notify team", "Follow up"],
    previewPrompt:
      "Capture the lead from the website inquiry form and notify sales.",
    previewResult:
      "I captured the lead details, enriched the contact data, and sent a Slack alert to the sales channel with next-step recommendations.",
    accent: "bg-orange-500",
  },
  {
    slug: "support-agent",
    name: "Support Agent",
    shortName: "Support Agent",
    category: "Customer Service",
    industry: "Customer support teams",
    icon: "headphones",
    price: "€49/mo",
    priceCents: 4900,
    stripePriceId: "price_support_agent",
    setupTime: "1 day",
    rating: "4.9",
    installs: "3.2k",
    badge: "Popular",
    description:
      "Answer every ticket 24/7 and escalate only what needs a human.",
    longDescription:
      "The Support Agent resolves your customers' issues around the clock. Trained on your knowledge base, it answers tickets in seconds, drafts accurate replies, categorizes each issue, and escalates to your human team only when a case genuinely needs a person. Connected to Zendesk, Intercom, Help Scout, and Slack, it dramatically cuts first-response time and ticket backlog — letting you deliver fast, consistent support without scaling headcount.",
    tasks: [
      "24/7 responses",
      "Ticket categorization",
      "Reply drafting",
      "Smart escalation",
    ],
    integrations: ["Zendesk", "Intercom", "Help Scout", "Slack"],
    workflow: ["Read ticket", "Search KB", "Draft reply", "Escalate if needed"],
    previewPrompt: "Handle the open tickets from this morning.",
    previewResult:
      "I answered 18 tickets in seconds, drafted 6 replies that need human approval, and escalated 2 refunds to the manager.",
    accent: "bg-purple-500",
  },
  {
    slug: "copywriter",
    name: "Copywriter",
    shortName: "Copywriter",
    category: "Design & Content",
    industry: "Marketing and product teams",
    icon: "pen-tool",
    price: "€39/mo",
    priceCents: 3900,
    stripePriceId: "price_copywriter",
    setupTime: "Same day",
    rating: "4.9",
    installs: "2.3k",
    badge: "Popular",
    description:
      "Write copy that converts across landing pages, ads, and email.",
    longDescription:
      "The Copywriter agent writes the words that turn visitors into customers. It produces platform-aware copy for landing pages, ads, email, and product UI — with multiple variants ready for A/B testing. Integrated with Webflow, WordPress, Mailchimp, and Notion, it removes the bottleneck of waiting on freelance briefs, giving your marketing team on-brand copy in minutes and the volume of variants they need to actually optimize conversion.",
    tasks: ["Landing copy", "Ad copy", "Email copy", "UI microcopy"],
    integrations: ["Webflow", "WordPress", "Mailchimp", "Notion"],
    workflow: ["Brief", "Draft variants", "Refine", "Hand off"],
    previewPrompt: "Write 3 landing page variants for our new pricing.",
    previewResult:
      "I produced 3 hero variants, 6 subheadings, 4 CTA options, and 9 ad headlines optimized for cold traffic.",
    accent: "bg-pink-500",
  },
  {
    slug: "shopify-agent",
    name: "Shopify Agent",
    shortName: "Shopify Agent",
    category: "E-commerce & Finance",
    industry: "Shopify stores",
    icon: "shopping-cart",
    brand: "shopify",
    price: "€39/mo",
    priceCents: 3900,
    stripePriceId: "price_shopify_agent",
    setupTime: "Same day",
    rating: "4.9",
    installs: "630",
    badge: "New",
    description:
      "Manage your entire Shopify store — create products, discounts, track sales, and drive revenue.",
    longDescription:
      "The Shopify Agent is your full e-commerce command center. Whether you're launching your first store or scaling an existing one, it handles everything: creating products with optimized descriptions, setting up discount codes that convert, managing collections and inventory, analyzing sales performance, and generating direct cart links to close sales. It also tracks customer behavior and order status. New to Shopify? The agent guides you through store setup and connects your store in minutes. Already selling? It analyzes your analytics, suggests revenue-boosting actions, and executes them for you — turning conversations into revenue.",
    tasks: [
      "Create & manage products",
      "Set up discount codes",
      "Track sales analytics",
      "Manage inventory & collections",
    ],
    integrations: ["Shopify"],
    workflow: [
      "Connect store",
      "Analyze performance",
      "Create products & promotions",
      "Drive revenue",
    ],
    previewPrompt: "Create a summer collection and set up a 20% launch discount.",
    previewResult:
      "Ho creato 3 nuovi prodotti nella collezione Estate, ho configurato il codice sconto ESTATE20 al 20%, e ho generato i link diretti al carrello per condividerli sui social.",
    accent: "bg-green-500",
  },
  {
    slug: "business-manager",
    name: "Business Manager",
    shortName: "Business Manager",
    category: "Business & Operations",
    industry: "SMEs and founders",
    icon: "bar-chart",
    price: "€59/mo",
    priceCents: 5900,
    stripePriceId: "price_business_manager",
    setupTime: "2 days",
    rating: "4.8",
    installs: "320",
    badge: "Customizable",
    description:
      "A COO in chat: reports, planning, and decision support.",
    longDescription:
      "The Business Manager agent acts as a chief of staff for owners and founders. It reads your operational data, drafts executive reports, coordinates work across teams, and supports planning and decisions. Connected to Google Calendar, Gmail, Sheets, and Slack, it turns scattered spreadsheets and status updates into a clear picture of the business — so leaders get the numbers and the narrative they need to decide faster and run a growing company without dropping balls.",
    tasks: [
      "Executive reports",
      "Strategic planning",
      "Decision support",
      "Cross-team coordination",
    ],
    integrations: ["Google Calendar", "Gmail", "Sheets", "Slack"],
    workflow: ["Read data", "Analyze", "Recommend", "Coordinate"],
    previewPrompt: "Summarize Q2 performance and prep the board deck outline.",
    previewResult:
      "I analyzed revenue (+18% QoQ), flagged a 7% churn risk in SMB, and drafted a 10-slide board deck outline with KPIs.",
    accent: "bg-indigo-500",
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
export function localizeAgent(agent: Agent, locale: "it" | "en"): Agent {
  const localized = getAgentLocalization(agent.slug, locale);
  if (!localized) return agent;
  return {
    ...agent,
    name: localized.name,
    shortName: localized.shortName,
    category: localized.category as AgentCategory,
    industry: localized.industry,
    setupTime: localizeSetupTime(agent.setupTime, locale),
    // The badge overlay carries localized display text ("Popolare", "Novità",
    // "Consigliato") that doesn't fit the English union type — safe because
    // badge is rendered as display-only text everywhere in the UI.
    badge: localized.badge as Agent["badge"],
    description: localized.description,
    longDescription: localized.longDescription,
    tasks: localized.tasks,
    workflow: localized.workflow,
    previewPrompt: localized.previewPrompt,
    previewResult: localized.previewResult,
  };
}

export const SELLABLE_AGENTS: string[] = AGENTS.map((agent) => agent.slug);

// ─── Flag-driven marketplace ──────────────────────────────────────────────
// Which agents the marketplace offers is controlled by the runtime feature
// flags (see ./agents/feature-flags). Agents enabled by the flags are
// "available"; the rest of the catalog is shown as "coming soon".
//
// NOTE: `AGENTCLOUD_VERTICAL` / `AGENTCLOUD_FEATURE_FLAGS` are server-only env
// vars, so client bundles evaluate these with the default (shopify) config.
// Server components (e.g. /agents) see the real flags; pass the result down
// to client components via props when the value must be authoritative.

/** Slugs enabled by the active feature flags. */
export function getEnabledAgentSlugs(): string[] {
  return getFeatureFlags().enabledAgents;
}

export function isAvailable(slug: string): boolean {
  return getEnabledAgentSlugs().includes(slug);
}

export const AVAILABLE_AGENTS: Agent[] = AGENTS.filter((a) =>
  isAvailable(a.slug),
);

export const COMING_SOON_AGENTS: Agent[] = AGENTS.filter((a) =>
  !isAvailable(a.slug),
);
