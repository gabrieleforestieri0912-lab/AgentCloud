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
    slug: "executive-assistant",
    name: "Executive Assistant",
    shortName: "Executive Assistant",
    category: "Business & Operations",
    industry: "Founders and executives",
    icon: "briefcase",
    price: "€39/mo",
    priceCents: 3900,
    stripePriceId: "price_executive_assistant",
    setupTime: "Same day",
    rating: "4.9",
    installs: "1.4k",
    badge: "Popular",
    description:
      "Triage your inbox, schedule across time zones, and never miss a follow-up.",
    longDescription:
      "The Executive Assistant agent becomes your AI right hand. It prioritizes your inbox so urgent emails never bury what matters, drafts on-brand replies for approval, schedules meetings across time zones, prepares a daily briefing of decisions and action items, and tracks every follow-up until it's done. It connects to Gmail, Google Calendar, Outlook, and Notion so you save 5–10 hours a week on coordination and focus on decisions instead of logistics.",
    tasks: [
      "Inbox triage",
      "Calendar scheduling",
      "Daily briefings",
      "Action item tracking",
    ],
    integrations: ["Gmail", "Google Calendar", "Outlook", "Notion"],
    workflow: [
      "Scan inbox",
      "Prioritize messages",
      "Draft replies",
      "Schedule meetings",
    ],
    previewPrompt:
      "Prepare my morning briefing and reschedule today's meetings.",
    previewResult:
      "I summarized 14 priority emails, flagged 2 urgent items, and moved 3 meetings to free a 90-minute focus block.",
    accent: "bg-brand-500",
  },
  {
    slug: "project-manager",
    name: "Project Manager",
    shortName: "Project Manager",
    category: "Business & Operations",
    industry: "Operations and delivery teams",
    icon: "calendar",
    price: "€49/mo",
    priceCents: 4900,
    stripePriceId: "price_project_manager",
    setupTime: "1 day",
    rating: "4.8",
    installs: "920",
    badge: "Popular",
    description:
      "Turn goals into milestones, owners, and blockers — with automatic follow-ups.",
    longDescription:
      "The Project Manager agent turns a high-level goal into a realistic milestone plan: it breaks work into tasks, assigns owners based on workload, sets deadlines, tracks blockers, and pings the right person when something is slipping. It integrates with Notion, Asana, Slack, and Linear to keep your team aligned and your deliveries on time, so every launch ships with clear ownership instead of a scramble at the end.",
    tasks: [
      "Milestone planning",
      "Task assignment",
      "Blocker alerts",
      "Weekly standups",
    ],
    integrations: ["Notion", "Asana", "Slack", "Linear"],
    workflow: [
      "Define goal",
      "Break into tasks",
      "Assign owners",
      "Send reminders",
    ],
    previewPrompt: "Plan the launch of our new pricing page.",
    previewResult:
      "I drafted 8 tasks across Design, Copy, and Eng, assigned owners based on last quarter, and set a 2-week timeline with 3 milestones.",
    accent: "bg-indigo-500",
  },
  {
    slug: "meeting-assistant",
    name: "Meeting Assistant",
    shortName: "Meeting Assistant",
    category: "Business & Operations",
    industry: "Customer-facing and internal teams",
    icon: "headphones",
    price: "€29/mo",
    priceCents: 2900,
    stripePriceId: "price_meeting_assistant",
    setupTime: "Same day",
    rating: "4.7",
    installs: "1.1k",
    badge: "Fast setup",
    description:
      "Join every call, transcribe it, and never miss an action item again.",
    longDescription:
      "The Meeting Assistant attends your calls so nobody has to take notes. It transcribes the conversation in real time, extracts decisions and ownerships, and emails a structured recap to every participant with action items, owners, and deadlines. Integrated with Google Meet, Zoom, Slack, and HubSpot, it keeps a searchable decision log that makes everyone accountable — no more 'can you send me the notes from that call?'. ",
    tasks: [
      "Live transcription",
      "Action item extraction",
      "Auto recap email",
      "Decision log",
    ],
    integrations: ["Google Meet", "Zoom", "Slack", "HubSpot"],
    workflow: [
      "Join meeting",
      "Transcribe",
      "Extract action items",
      "Email recap",
    ],
    previewPrompt: "Process the recording of today's discovery call.",
    previewResult:
      "I extracted 6 action items, captured 3 key decisions, and drafted a recap email assigned to the right owners.",
    accent: "bg-purple-500",
  },
  {
    slug: "crm-assistant",
    name: "CRM Assistant",
    shortName: "CRM Assistant",
    category: "Business & Operations",
    industry: "Sales and account teams",
    icon: "users",
    price: "€59/mo",
    priceCents: 5900,
    stripePriceId: "price_crm_assistant",
    setupTime: "1 day",
    rating: "4.8",
    installs: "780",
    badge: "New",
    description:
      "Auto-log every call and email, and keep your pipeline moving forward.",
    longDescription:
      "The CRM Assistant keeps your CRM clean without any manual entry. It automatically logs calls and emails, enriches contacts with firmographic and intent data, flags stale deals before they die, and tells each rep the exact next step to move a deal forward. Connected to HubSpot, Salesforce, Gmail, and Apollo, it gives your sales team a pipeline they trust — so forecasting is accurate and revenue isn't lost to forgotten follow-ups.",
    tasks: [
      "Auto-logging",
      "Contact enrichment",
      "Stale deal alerts",
      "Next-step suggestions",
    ],
    integrations: ["HubSpot", "Salesforce", "Gmail", "Apollo"],
    workflow: [
      "Detect activity",
      "Update CRM",
      "Enrich data",
      "Suggest next step",
    ],
    previewPrompt: "Show me deals that have gone stale this week.",
    previewResult:
      "I found 14 stale deals, drafted 14 personalized follow-ups, and updated the close date for 6 of them.",
    accent: "bg-brand-400",
  },
  {
    slug: "customer-success",
    name: "Customer Success Manager",
    shortName: "Customer Success",
    category: "Business & Operations",
    industry: "B2B SaaS and services",
    icon: "shield",
    price: "€59/mo",
    priceCents: 5900,
    stripePriceId: "price_customer_success",
    setupTime: "2 days",
    rating: "4.8",
    installs: "540",
    badge: "New",
    description:
      "Track account health and save customers before they churn.",
    longDescription:
      "The Customer Success Manager agent keeps every account healthy. It monitors product usage in real time, triggers personalized onboarding sequences, runs NPS check-ins, scores account health, and alerts your team the moment an account shows churn risk — with the exact usage pattern and a suggested save play. Connected to Intercom, HubSpot, Stripe, and Mixpanel, it turns reactive firefighting into a predictable retention motion that protects recurring revenue.",
    tasks: [
      "Onboarding flows",
      "Health scoring",
      "NPS check-ins",
      "Churn alerts",
    ],
    integrations: ["Intercom", "HubSpot", "Stripe", "Mixpanel"],
    workflow: ["Track usage", "Score health", "Trigger outreach", "Alert CSM"],
    previewPrompt: "Find accounts at risk of churning this month.",
    previewResult:
      "I flagged 9 at-risk accounts, identified the usage drop pattern, and drafted personalized save plays for each.",
    accent: "bg-pink-500",
  },
  {
    slug: "marketing-strategist",
    name: "Marketing Strategist",
    shortName: "Marketing Strategist",
    category: "Marketing & Sales",
    industry: "Growth marketers",
    icon: "megaphone",
    price: "€59/mo",
    priceCents: 5900,
    stripePriceId: "price_marketing_strategist",
    setupTime: "2 days",
    rating: "4.8",
    installs: "870",
    badge: "Popular",
    description:
      "Turn business goals into a channel plan, calendar, and budget.",
    longDescription:
      "The Marketing Strategist agent turns a business goal into an executable marketing plan: it picks the right channels, allocates budget, builds an editorial calendar, and reviews weekly performance against KPIs. Connected to Notion, Google Ads, Meta Ads, and Mailchimp, it gives your team a clear roadmap and a feedback loop — so campaigns launch on time, on budget, and continuously improve instead of guessing from month to month.",
    tasks: [
      "Campaign planning",
      "Editorial calendar",
      "Channel mix",
      "Performance reviews",
    ],
    integrations: ["Notion", "Google Ads", "Meta Ads", "Mailchimp"],
    workflow: [
      "Define goal",
      "Choose channels",
      "Plan calendar",
      "Review weekly",
    ],
    previewPrompt: "Plan a 30-day launch for our new SaaS feature.",
    previewResult:
      "I picked 4 channels, drafted a 12-post calendar, allocated €2,000 across paid, and set 3 weekly KPIs to track.",
    accent: "bg-pink-600",
  },
  {
    slug: "seo-specialist",
    name: "SEO Specialist",
    shortName: "SEO Specialist",
    category: "Marketing & Sales",
    industry: "Content teams",
    icon: "search",
    price: "€39/mo",
    priceCents: 3900,
    stripePriceId: "price_seo_specialist",
    setupTime: "1 day",
    rating: "4.9",
    installs: "1.3k",
    badge: "Popular",
    description:
      "Research keywords, audit your content, and climb Google's rankings.",
    longDescription:
      "The SEO Specialist agent runs the full on-page SEO motion. It researches ranking opportunities, audits your existing pages, analyzes competitors, and produces fully optimized articles with proper heading structure, meta data, and internal linking. Integrated with WordPress, Webflow, Ahrefs, and Google Search Console, it turns vague 'we need more traffic' into a prioritized list of pages to fix and keywords to target — so organic growth becomes systematic, not sporadic.",
    tasks: [
      "Keyword research",
      "Content audit",
      "Competitor analysis",
      "SEO writing",
    ],
    integrations: ["WordPress", "Webflow", "Ahrefs", "Google Search Console"],
    workflow: ["Research", "Audit", "Brief", "Write and optimize"],
    previewPrompt: "Write an SEO article about AI for small businesses.",
    previewResult:
      "I researched 12 keywords, analyzed 5 competitors, and produced a 1,500-word article with H1/H2 structure and 8 internal linking opportunities.",
    accent: "bg-orange-500",
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
    slug: "google-ads-expert",
    name: "Google Ads Expert",
    shortName: "Google Ads Expert",
    category: "Marketing & Sales",
    industry: "Performance marketing teams",
    icon: "bar-chart",
    price: "€49/mo",
    priceCents: 4900,
    stripePriceId: "price_google_ads_expert",
    setupTime: "1 day",
    rating: "4.8",
    installs: "610",
    badge: "New",
    description:
      "Build, restructure, and optimize Google Ads campaigns for profit.",
    longDescription:
      "The Google Ads Expert agent manages your account like a senior PPC specialist. It designs campaign and ad-group structure, writes responsive ad copy, picks target keywords and negatives, monitors quality score, and recommends budget shifts where spend actually converts. Connected to Google Ads, Google Analytics, Looker, and Slack, it cuts wasted spend and improves ROI — turning a messy account into a predictable acquisition channel.",
    tasks: [
      "Campaign structure",
      "Ad copy",
      "Keyword strategy",
      "Budget optimization",
    ],
    integrations: ["Google Ads", "Google Analytics", "Looker", "Slack"],
    workflow: ["Audit account", "Restructure", "Write ads", "Optimize bids"],
    previewPrompt: "Restructure our Search campaigns for better quality score.",
    previewResult:
      "I grouped 320 keywords into 12 tighter ad groups, wrote 18 new RSAs, and reduced wasted spend by an estimated 22%.",
    accent: "bg-brand-600",
  },
  {
    slug: "social-media-manager",
    name: "Social Media Manager",
    shortName: "Social Media Manager",
    category: "Marketing & Sales",
    industry: "Brands and creators",
    icon: "globe",
    price: "€39/mo",
    priceCents: 3900,
    stripePriceId: "price_social_media_manager",
    setupTime: "1 day",
    rating: "4.7",
    installs: "2.1k",
    badge: "Popular",
    description:
      "Plan, write, and schedule platform-native content across all your channels.",
    longDescription:
      "The Social Media Manager agent runs your content calendar across Instagram, TikTok, LinkedIn, and X. It plans the week, writes copy tailored to each platform's style and audience, researches hashtags, and schedules posts at peak times. Integrated with Buffer and your brand accounts, it turns posting into a consistent, multi-channel system — so your brand shows up regularly without you or your team spending hours each day creating and publishing.",
    tasks: [
      "Content calendar",
      "Platform-native copy",
      "Hashtag research",
      "Auto-scheduling",
    ],
    integrations: ["Instagram", "TikTok", "LinkedIn", "Buffer"],
    workflow: ["Plan week", "Draft posts", "Adapt per channel", "Schedule"],
    previewPrompt: "Plan next week's content for our fitness brand.",
    previewResult:
      "I drafted 5 Reels, 8 static posts, and 3 LinkedIn articles, adapted each to the platform, and scheduled them at peak times.",
    accent: "bg-purple-600",
  },
  {
    slug: "cold-email-writer",
    name: "Cold Email Writer",
    shortName: "Cold Email Writer",
    category: "Marketing & Sales",
    industry: "B2B sales teams",
    icon: "mail",
    price: "€29/mo",
    priceCents: 2900,
    stripePriceId: "price_cold_email_writer",
    setupTime: "Same day",
    rating: "4.8",
    installs: "1.7k",
    badge: "Fast setup",
    description:
      "Write personalized cold sequences that book meetings, not silence.",
    longDescription:
      "The Cold Email Writer agent builds outbound sequences that get replies. It researches each prospect, personalizes subject lines and openings around their actual company and role, structures multi-step follow-ups with the right cadence, and adapts tone to your buyer persona. Connected to Apollo, LinkedIn, HubSpot, and Instantly, it turns a generic blast into a targeted pipeline-builder — giving your sales team a higher reply rate and more qualified meetings.",
    tasks: [
      "Prospect research",
      "Personalization",
      "Follow-up sequences",
      "Reply handling",
    ],
    integrations: ["Apollo", "LinkedIn", "HubSpot", "Instantly"],
    workflow: ["Research", "Draft", "Sequence", "Reply triage"],
    previewPrompt:
      "Write a 4-step sequence targeting RevOps leaders in fintech.",
    previewResult:
      "I researched 25 prospects, personalized 4 emails per contact, and built a 12-day follow-up cadence with reply triggers.",
    accent: "bg-indigo-500",
  },
  {
    slug: "lead-qualification",
    name: "Lead Qualification Agent",
    shortName: "Lead Qualification",
    category: "Marketing & Sales",
    industry: "Inbound sales teams",
    icon: "search",
    price: "€49/mo",
    priceCents: 4900,
    stripePriceId: "price_lead_qualification",
    setupTime: "2 days",
    rating: "4.8",
    installs: "730",
    badge: "Customizable",
    description:
      "Score inbound leads on fit and intent, and book meetings for your reps.",
    longDescription:
      "The Lead Qualification agent decides which inbound leads deserve your reps' time. It enriches every lead, scores them on fit and buying intent, asks qualifying questions through chat, and automatically books meetings for the highest-potential ones. Integrated with HubSpot, Salesforce, Calendly, and Slack, it keeps your team from chasing tire-kickers — focusing them on the small set of leads most likely to become customers.",
    tasks: [
      "Lead enrichment",
      "Fit scoring",
      "Qualifying chat",
      "Meeting routing",
    ],
    integrations: ["HubSpot", "Salesforce", "Calendly", "Slack"],
    workflow: ["Capture lead", "Enrich", "Score", "Route"],
    previewPrompt: "Score and qualify the leads from this morning.",
    previewResult:
      "I enriched 23 leads, qualified 11 as high-fit, and booked 4 discovery calls directly on my reps' calendars.",
    accent: "bg-brand-500",
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
    slug: "complaint-manager",
    name: "Complaint Manager",
    shortName: "Complaint Manager",
    category: "Customer Service",
    industry: "Support and customer success",
    icon: "shield",
    price: "€39/mo",
    priceCents: 3900,
    stripePriceId: "price_complaint_manager",
    setupTime: "1 day",
    rating: "4.7",
    installs: "410",
    badge: "Customizable",
    description:
      "Detect negative sentiment early and win back frustrated customers.",
    longDescription:
      "The Complaint Manager agent turns unhappy customers into retained ones. It detects negative sentiment across your support channels, prioritizes urgent or high-value cases, drafts empathetic and on-brand replies, and triggers the right retention play based on customer value. Connected to Zendesk, Intercom, HubSpot, and Stripe, it helps you recover revenue that would otherwise walk out the door — responding with the right tone and the right offer, fast.",
    tasks: [
      "Sentiment detection",
      "Urgent prioritization",
      "Empathetic replies",
      "Retention plays",
    ],
    integrations: ["Zendesk", "Intercom", "HubSpot", "Stripe"],
    workflow: ["Detect tone", "Prioritize", "Reply", "Trigger play"],
    previewPrompt: "Handle today's negative reviews and complaints.",
    previewResult:
      "I flagged 7 high-risk cases, drafted empathetic replies for each, and triggered save flows for the top 3 accounts by MRR.",
    accent: "bg-pink-500",
  },
  {
    slug: "fullstack-developer",
    name: "Full Stack Developer",
    shortName: "Full Stack Developer",
    category: "Development",
    industry: "Engineering teams",
    icon: "code",
    price: "€49/mo",
    priceCents: 4900,
    stripePriceId: "price_fullstack_developer",
    setupTime: "Same day",
    rating: "4.8",
    installs: "1.9k",
    badge: "Popular",
    description:
      "Scaffold apps, build features, and ship in days, not weeks.",
    longDescription:
      "The Full Stack Developer agent accelerates your build. It scaffolds Next.js, React, and Node projects, generates components, builds CRUD APIs, and writes tests — taking a feature from idea to shipped code. Integrated with GitHub, Vercel, Supabase, and Postgres, it amplifies small teams by handling the boilerplate and boring parts, so your developers focus on product logic and you ship features in days rather than release cycles.",
    tasks: [
      "App scaffolding",
      "Component generation",
      "API building",
      "Test writing",
    ],
    integrations: ["GitHub", "Vercel", "Supabase", "Postgres"],
    workflow: ["Plan", "Scaffold", "Build", "Test"],
    previewPrompt:
      "Scaffold a customer portal with auth, billing, and a dashboard.",
    previewResult:
      "I scaffolded a Next.js app with Supabase auth, Stripe subscriptions, a billing portal, and a working admin dashboard.",
    accent: "bg-brand-500",
  },
  {
    slug: "api-integration",
    name: "API Integration Expert",
    shortName: "API Integration",
    category: "Development",
    industry: "Engineering and ops teams",
    icon: "git-branch",
    price: "€49/mo",
    priceCents: 4900,
    stripePriceId: "price_api_integration",
    setupTime: "1 day",
    rating: "4.8",
    installs: "640",
    badge: "Customizable",
    description:
      "Connect your tools with secure, well-documented APIs and webhooks.",
    longDescription:
      "The API Integration agent builds the connectors that tie your stack together. It designs API integrations, handles OAuth authentication, sets up webhooks, adds retries and error handling, and documents everything. Working with Postman, GitHub, Zapier, and Make.com, it delivers production-ready connectors you can trust — so your apps share data reliably and your team never has to read three SDK docs to make two systems talk.",
    tasks: [
      "Connector design",
      "OAuth setup",
      "Webhook handling",
      "API documentation",
    ],
    integrations: ["Postman", "GitHub", "Zapier", "Make.com"],
    workflow: ["Map fields", "Build connector", "Add auth", "Document"],
    previewPrompt:
      "Connect HubSpot, Stripe, and Slack into one customer workflow.",
    previewResult:
      "I designed a connector with 3 OAuth flows, added webhook handlers, and produced OpenAPI docs for the whole integration.",
    accent: "bg-indigo-500",
  },
  {
    slug: "devops-engineer",
    name: "DevOps Engineer",
    shortName: "DevOps Engineer",
    category: "Development",
    industry: "Platform and SRE teams",
    icon: "wrench",
    price: "€59/mo",
    priceCents: 5900,
    stripePriceId: "price_devops_engineer",
    setupTime: "2 days",
    rating: "4.8",
    installs: "520",
    badge: "New",
    description:
      "Ship faster with CI/CD, Docker, observability, and reliable deploys.",
    longDescription:
      "The DevOps Engineer agent sets up the engineering backbone behind fast, reliable releases. It provisions cloud infrastructure, writes GitHub Actions pipelines, containerizes apps with Docker, and adds monitoring and alerting. Connected to GitHub, Docker, AWS, and Datadog, it turns manual, error-prone deploys into an automated pipeline — so your team ships more often with confidence and notices problems before your users do.",
    tasks: [
      "CI/CD pipelines",
      "Docker setup",
      "Monitoring",
      "Incident response",
    ],
    integrations: ["GitHub", "Docker", "AWS", "Datadog"],
    workflow: ["Plan", "Provision", "Deploy", "Monitor"],
    previewPrompt: "Containerize our app and set up CI/CD with monitoring.",
    previewResult:
      "I wrote a multi-stage Dockerfile, a GitHub Actions pipeline, Terraform for AWS, and wired Datadog dashboards and alerts.",
    accent: "bg-neutral-900",
  },
  {
    slug: "qa-tester",
    name: "QA Tester",
    shortName: "QA Tester",
    category: "Development",
    industry: "Engineering teams",
    icon: "bug",
    price: "€39/mo",
    priceCents: 3900,
    stripePriceId: "price_qa_tester",
    setupTime: "1 day",
    rating: "4.7",
    installs: "490",
    badge: "Fast setup",
    description:
      "Catch bugs before users do with automated test coverage.",
    longDescription:
      "The QA Tester agent protects your releases. It generates test plans, writes automated tests (unit, integration, and e2e), reproduces bugs from reports, and triages issues before they reach production. Integrated with GitHub, Playwright, Jira, and Linear, it gives your engineering team a safety net — so regressions are caught automatically, releases ship with confidence, and your developers spend time on features instead of manual testing.",
    tasks: [
      "Test plans",
      "Automated tests",
      "Bug reproduction",
      "Release sign-off",
    ],
    integrations: ["GitHub", "Playwright", "Jira", "Linear"],
    workflow: ["Plan", "Write tests", "Run", "Report"],
    previewPrompt: "Cover the new checkout flow with tests.",
    previewResult:
      "I wrote 14 unit tests, 6 integration tests, and 4 e2e flows covering happy paths, errors, and refund edge cases.",
    accent: "bg-pink-600",
  },
  {
    slug: "prompt-engineer",
    name: "Prompt Engineer",
    shortName: "Prompt Engineer",
    category: "AI & Data",
    industry: "AI and product teams",
    icon: "cpu",
    price: "€29/mo",
    priceCents: 2900,
    stripePriceId: "price_prompt_engineer",
    setupTime: "Same day",
    rating: "4.9",
    installs: "1.1k",
    badge: "Popular",
    description:
      "Make your LLM outputs cheaper, faster, and more reliable.",
    longDescription:
      "The Prompt Engineer agent optimizes the prompts behind your AI features. It rewrites prompts and system instructions to be more reliable, cheaper, and more deterministic, and sets up evaluation suites to measure improvements over time. Working with OpenAI, Anthropic, LangSmith, and Notion, it translates rough AI experiments into production-grade behavior — cutting token costs, reducing broken outputs, and giving your product team confidence in every LLM call.",
    tasks: [
      "Prompt rewriting",
      "Eval suites",
      "Cost optimization",
      "Reliability scoring",
    ],
    integrations: ["OpenAI", "Anthropic", "LangSmith", "Notion"],
    workflow: ["Baseline", "Iterate", "Evaluate", "Ship"],
    previewPrompt: "Improve the prompt behind our customer support assistant.",
    previewResult:
      "I rewrote the system prompt, added 12 evaluation cases, cut cost by 38%, and lifted accuracy from 81% to 93%.",
    accent: "bg-purple-600",
  },
  {
    slug: "ai-automation",
    name: "AI Automation Builder",
    shortName: "AI Automation",
    category: "AI & Data",
    industry: "Ops and AI builders",
    icon: "git-branch",
    price: "€59/mo",
    priceCents: 5900,
    stripePriceId: "price_ai_automation",
    setupTime: "1 day",
    rating: "4.8",
    installs: "960",
    badge: "Popular",
    description:
      "Turn a workflow idea into an automation that runs on its own.",
    longDescription:
      "The AI Automation Builder turns a rough workflow description into a production-ready automation. It designs the workflow, picks the right tools, and handles the hard parts — error cases, retries, and logging. Working across Zapier, Make.com, n8n, and Slack, it ships automations your team can actually rely on: from a Stripe-to-Slack alert to a full customer onboarding flow that runs end-to-end without someone babysitting it.",
    tasks: [
      "Workflow design",
      "Tool selection",
      "Error handling",
      "Logging and alerts",
    ],
    integrations: ["Zapier", "Make.com", "n8n", "Slack"],
    workflow: ["Map workflow", "Pick tools", "Build", "Test and ship"],
    previewPrompt:
      "Build an automation that posts new Stripe customers to Slack.",
    previewResult:
      "I built a workflow with a Stripe webhook, a deduplication step, a Slack message template, and a daily summary to #sales.",
    accent: "bg-brand-500",
  },
  {
    slug: "data-analyst",
    name: "Data Analyst",
    shortName: "Data Analyst",
    category: "AI & Data",
    industry: "Data and ops teams",
    icon: "database",
    price: "€49/mo",
    priceCents: 4900,
    stripePriceId: "price_data_analyst",
    setupTime: "2 days",
    rating: "4.8",
    installs: "1.4k",
    badge: "New",
    description:
      "Query your data and get answers in plain English, not raw SQL.",
    longDescription:
      "The Data Analyst agent turns raw data into decisions. It queries your warehouse, builds SQL models, creates dashboards, and writes plain-English executive summaries of what's happening in the business. Connected to BigQuery, Snowflake, Metabase, and Slack, it answers questions like 'why did revenue drop last week?' in minutes — putting analysis in everyone's hands without building a data team or waiting days for a BI ticket.",
    tasks: [
      "SQL queries",
      "Dashboards",
      "Anomaly detection",
      "Executive summaries",
    ],
    integrations: ["BigQuery", "Snowflake", "Metabase", "Slack"],
    workflow: ["Pull data", "Model", "Visualize", "Explain"],
    previewPrompt: "Why did revenue drop last week?",
    previewResult:
      "I queried 3 tables, found that 2 large customers paused, and drafted an exec summary with the recommended recovery actions.",
    accent: "bg-brand-600",
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
    slug: "blog-writer",
    name: "Blog Writer",
    shortName: "Blog Writer",
    category: "Design & Content",
    industry: "Content teams and solopreneurs",
    icon: "file-text",
    price: "€29/mo",
    priceCents: 2900,
    stripePriceId: "price_blog_writer",
    setupTime: "1 day",
    rating: "4.8",
    installs: "1.6k",
    badge: "Popular",
    description:
      "Research and write long-form articles that rank and read well.",
    longDescription:
      "The Blog Writer agent produces long-form articles end-to-end. It researches the topic, outlines the piece, writes with cited sources, and adds SEO meta data and social snippets. Connected to WordPress, Webflow, Ahrefs, and Notion, it lets a small content team publish consistently — turning a content calendar from an aspiration into a regular output of rank-ready articles your audience actually wants to read.",
    tasks: [
      "Topic research",
      "Article outlining",
      "Long-form writing",
      "SEO meta",
    ],
    integrations: ["WordPress", "Webflow", "Ahrefs", "Notion"],
    workflow: ["Research", "Outline", "Write", "Polish"],
    previewPrompt: "Write a 1,800-word article on AI agents for SMBs.",
    previewResult:
      "I produced an 1,820-word article with 5 H2 sections, 14 sources, a 158-character meta description, and 3 social snippets.",
    accent: "bg-orange-500",
  },
  {
    slug: "ui-designer",
    name: "UI Designer",
    shortName: "UI Designer",
    category: "Design & Content",
    industry: "Product teams",
    icon: "palette",
    price: "€49/mo",
    priceCents: 4900,
    stripePriceId: "price_ui_designer",
    setupTime: "1 day",
    rating: "4.8",
    installs: "720",
    badge: "New",
    description:
      "Turn product briefs into polished mockups and dev-ready specs.",
    longDescription:
      "The UI Designer agent takes a product brief from concept to handoff. It produces polished mockups, defines a design-token system, writes component specs with all their states, and prepares clear notes for engineering. Integrated with Figma, Notion, Linear, and GitHub, it speeds up feature delivery — reducing the design-to-development gap so your team ships better interfaces faster, without waiting on a busy design department.",
    tasks: ["Mockups", "Design tokens", "Component specs", "Handoff notes"],
    integrations: ["Figma", "Notion", "Linear", "GitHub"],
    workflow: ["Brief", "Mock", "Spec", "Handoff"],
    previewPrompt: "Design a settings page with billing and team management.",
    previewResult:
      "I produced 3 mockups, defined 18 design tokens, and wrote a component spec with 6 states per component.",
    accent: "bg-brand-400",
  },
  {
    slug: "ecommerce-expert",
    name: "E-commerce Expert",
    shortName: "E-commerce Expert",
    category: "E-commerce & Finance",
    industry: "Shopify, WooCommerce, Amazon sellers",
    icon: "shopping-cart",
    price: "€39/mo",
    priceCents: 3900,
    stripePriceId: "price_ecommerce_expert",
    setupTime: "1 day",
    rating: "4.8",
    installs: "880",
    badge: "Popular",
    description:
      "Recover abandoned carts and turn listings into sales.",
    longDescription:
      "The E-commerce Expert agent optimizes your store for revenue. It audits your shop, writes better product descriptions, recovers abandoned carts with personalized follow-ups, answers product questions, and surfaces upsell opportunities. Connected to Shopify, WooCommerce, Klaviyo, and Stripe, it attacks the biggest revenue leaks in e-commerce — so more visitors convert, more carts are recovered, and average order value grows.",
    tasks: [
      "Product descriptions",
      "Cart recovery",
      "Product Q&A",
      "Upsell flows",
    ],
    integrations: ["Shopify", "WooCommerce", "Klaviyo", "Stripe"],
    workflow: ["Audit", "Optimize", "Engage", "Report"],
    previewPrompt: "Recover yesterday's abandoned carts.",
    previewResult:
      "I drafted 3 personalized recovery flows for 53 carts and estimated €4,280 in recoverable revenue.",
    accent: "bg-pink-600",
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
      "Search products, build cart links, and check orders on your store.",
    longDescription:
      "The Shopify agent runs conversational commerce for your store. It searches your catalog, builds direct cart links for specific variants, checks order status securely using order number and email, and reports availability in seconds. Connected to your Shopify store, Stripe, Slack, and email, it gives shoppers the answer and the next step instantly — turning a product question from your customers into a completed order link rather than a dead-end conversation.",
    tasks: [
      "Search products",
      "Generate cart links",
      "Check order status",
      "Report availability",
    ],
    integrations: ["Shopify", "Stripe", "Slack", "Email"],
    workflow: [
      "Search catalog",
      "Build cart link",
      "Verify order",
      "Deliver summary",
    ],
    previewPrompt: "Find a running shoe product and generate a cart link.",
    previewResult:
      "Ho trovato 4 prodotti disponibili, ho generato il link al carrello per la variante più economica e ho fornito il prezzo e l'URL del prodotto.",
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
