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

export type Agent = {
  slug: string;
  name: string;
  shortName: string;
  category: AgentCategory;
  industry: string;
  icon: AgentIconKey;
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
    price: "€79/mo",
    priceCents: 7900,
    stripePriceId: "price_executive_assistant",
    setupTime: "Same day",
    rating: "4.9",
    installs: "1.4k",
    badge: "Popular",
    description:
      "Your AI right hand for calendar, email, meetings, and follow-ups.",
    longDescription:
      "An executive assistant agent that triages your inbox, schedules meetings across time zones, drafts replies, prepares daily briefings, and keeps your action items in order.",
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
    price: "€89/mo",
    priceCents: 8900,
    stripePriceId: "price_project_manager",
    setupTime: "1 day",
    rating: "4.8",
    installs: "920",
    badge: "Popular",
    description:
      "Plans, assigns, and follows up on tasks across your team automatically.",
    longDescription:
      "A project manager agent that turns goals into milestones, assigns owners, tracks blockers, and pings the right people when something is slipping.",
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
    price: "€59/mo",
    priceCents: 5900,
    stripePriceId: "price_meeting_assistant",
    setupTime: "Same day",
    rating: "4.7",
    installs: "1.1k",
    badge: "Fast setup",
    description:
      "Transcribes meetings, extracts action items, and sends follow-ups.",
    longDescription:
      "A meeting assistant that joins your calls, transcribes the conversation, extracts decisions and action items, and emails a structured recap to every participant.",
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
    price: "€99/mo",
    priceCents: 9900,
    stripePriceId: "price_crm_assistant",
    setupTime: "1 day",
    rating: "4.8",
    installs: "780",
    badge: "New",
    description:
      "Keeps your CRM clean, updated, and full of next-step reminders.",
    longDescription:
      "A CRM assistant that logs calls and emails automatically, enriches contacts, flags stale deals, and tells your reps what to do next to close more revenue.",
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
    price: "€119/mo",
    priceCents: 11900,
    stripePriceId: "price_customer_success",
    setupTime: "2 days",
    rating: "4.8",
    installs: "540",
    badge: "New",
    description: "Onboards new customers, tracks health, and prevents churn.",
    longDescription:
      "A customer success agent that monitors product usage, triggers onboarding sequences, runs NPS check-ins, and alerts your team when an account is at risk of churning.",
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
    price: "€99/mo",
    priceCents: 9900,
    stripePriceId: "price_marketing_strategist",
    setupTime: "2 days",
    rating: "4.8",
    installs: "870",
    badge: "Popular",
    description:
      "Plans campaigns, content calendars, and channel mix end-to-end.",
    longDescription:
      "A marketing strategist agent that turns business goals into channel plans, editorial calendars, budget allocations, and weekly performance reviews.",
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
    price: "€69/mo",
    priceCents: 6900,
    stripePriceId: "price_seo_specialist",
    setupTime: "1 day",
    rating: "4.9",
    installs: "1.3k",
    badge: "Popular",
    description:
      "Researches keywords, audits content, and writes SEO-optimized articles.",
    longDescription:
      "An SEO specialist that performs keyword research, audits existing content, analyzes competitors, and produces articles with proper structure, meta data, and internal linking.",
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
    price: "€79/mo",
    priceCents: 7900,
    stripePriceId: "price_seo_agent",
    setupTime: "1 day",
    rating: "4.9",
    installs: "1.2k",
    badge: "Popular",
    description:
      "Researches topics, plans SEO structure, and writes content optimized for search.",
    longDescription:
      "An SEO content agent that analyzes keyword opportunity, inspects competitors, drafts structured articles, and adds metadata so your content ranks and converts.",
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
    price: "€49/mo",
    priceCents: 4900,
    stripePriceId: "price_personal_assistant",
    setupTime: "Same day",
    rating: "4.8",
    installs: "2.0k",
    badge: "Fast setup",
    description:
      "Organizes your day, handles small tasks, and keeps your schedule on track.",
    longDescription:
      "A personal assistant agent that manages task lists, plans meetings, summarizes notes, and keeps your workday efficient with proactive suggestions.",
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
    price: "€89/mo",
    priceCents: 8900,
    stripePriceId: "price_google_ads_expert",
    setupTime: "1 day",
    rating: "4.8",
    installs: "610",
    badge: "New",
    description: "Builds, restructures, and optimizes Google Ads campaigns.",
    longDescription:
      "A Google Ads expert that designs campaign structure, writes responsive ad copy, picks keywords and negatives, and recommends budget shifts based on performance.",
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
    price: "€79/mo",
    priceCents: 7900,
    stripePriceId: "price_social_media_manager",
    setupTime: "1 day",
    rating: "4.7",
    installs: "2.1k",
    badge: "Popular",
    description:
      "Plans, drafts, and schedules posts across Instagram, TikTok, LinkedIn, and X.",
    longDescription:
      "A social media manager that builds a multi-platform content calendar, writes platform-native copy, suggests hashtags, and schedules posts at the best times.",
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
    price: "€59/mo",
    priceCents: 5900,
    stripePriceId: "price_cold_email_writer",
    setupTime: "Same day",
    rating: "4.8",
    installs: "1.7k",
    badge: "Fast setup",
    description: "Writes personalized cold email sequences that get replies.",
    longDescription:
      "A cold email writer that researches each prospect, personalizes subject lines and openings, builds multi-step follow-up sequences, and adapts tone to your buyer persona.",
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
    price: "€99/mo",
    priceCents: 9900,
    stripePriceId: "price_lead_qualification",
    setupTime: "2 days",
    rating: "4.8",
    installs: "730",
    badge: "Customizable",
    description: "Scores inbound leads and routes the best ones to your reps.",
    longDescription:
      "A lead qualification agent that enriches inbound leads, scores them on fit and intent, asks qualifying questions, and books meetings for your sales team.",
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
    price: "€79/mo",
    priceCents: 7900,
    stripePriceId: "price_calendar_booking",
    setupTime: "Same day",
    rating: "4.8",
    installs: "820",
    badge: "Fast setup",
    description:
      "Find availability and book meetings quickly on your calendar.",
    longDescription:
      "A calendar booking agent that searches availability, proposes suitable meeting slots, and schedules events with attendees and video links.",
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
    price: "€69/mo",
    priceCents: 6900,
    stripePriceId: "price_lead_capture",
    setupTime: "Same day",
    rating: "4.7",
    installs: "660",
    badge: "New",
    description: "Capture and route qualified leads automatically.",
    longDescription:
      "A lead capture agent that collects prospect details, enriches contacts, and notifies your sales team with the right context.",
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
    price: "€89/mo",
    priceCents: 8900,
    stripePriceId: "price_support_agent",
    setupTime: "1 day",
    rating: "4.9",
    installs: "3.2k",
    badge: "Popular",
    description:
      "Answers tickets 24/7 and escalates only what truly needs a human.",
    longDescription:
      "A support agent trained on your knowledge base that responds to tickets in seconds, drafts replies, categorizes issues, and escalates complex cases to your human team.",
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
    price: "€69/mo",
    priceCents: 6900,
    stripePriceId: "price_complaint_manager",
    setupTime: "1 day",
    rating: "4.7",
    installs: "410",
    badge: "Customizable",
    description:
      "Turns angry customers into loyal ones with smart, empathetic replies.",
    longDescription:
      "A complaint manager that detects negative sentiment, prioritizes urgent cases, drafts empathetic replies, and triggers the right retention play based on customer value.",
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
    price: "€149/mo",
    priceCents: 14900,
    stripePriceId: "price_fullstack_developer",
    setupTime: "Same day",
    rating: "4.8",
    installs: "1.9k",
    badge: "Popular",
    description:
      "Scaffolds apps, writes components, and ships full features faster.",
    longDescription:
      "A full stack developer agent that scaffolds Next.js, React, and Node projects, generates components, builds CRUD APIs, and writes tests so your team ships in days, not weeks.",
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
    price: "€99/mo",
    priceCents: 9900,
    stripePriceId: "price_api_integration",
    setupTime: "1 day",
    rating: "4.8",
    installs: "640",
    badge: "Customizable",
    description:
      "Connects your tools with secure, well-documented APIs and webhooks.",
    longDescription:
      "An API integration agent that designs and builds connectors, handles OAuth flows, sets up webhooks, writes retries and error handling, and keeps everything documented.",
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
    price: "€129/mo",
    priceCents: 12900,
    stripePriceId: "price_devops_engineer",
    setupTime: "2 days",
    rating: "4.8",
    installs: "520",
    badge: "New",
    description:
      "Sets up CI/CD, Docker, observability, and reliable deployments.",
    longDescription:
      "A DevOps engineer agent that provisions infrastructure, writes GitHub Actions pipelines, containerizes apps with Docker, and adds monitoring and alerting on top of it.",
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
    price: "€79/mo",
    priceCents: 7900,
    stripePriceId: "price_qa_tester",
    setupTime: "1 day",
    rating: "4.7",
    installs: "490",
    badge: "Fast setup",
    description: "Writes test plans, finds bugs, and keeps your releases safe.",
    longDescription:
      "A QA tester that generates test plans, writes automated tests (unit, integration, e2e), reproduces bugs from reports, and triages issues before they ship.",
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
    price: "€69/mo",
    priceCents: 6900,
    stripePriceId: "price_prompt_engineer",
    setupTime: "Same day",
    rating: "4.9",
    installs: "1.1k",
    badge: "Popular",
    description:
      "Optimizes prompts and system instructions for any LLM in your stack.",
    longDescription:
      "A prompt engineer that rewrites your prompts to be more reliable, cheaper, and more deterministic, with eval suites to measure improvements over time.",
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
    price: "€119/mo",
    priceCents: 11900,
    stripePriceId: "price_ai_automation",
    setupTime: "1 day",
    rating: "4.8",
    installs: "960",
    badge: "Popular",
    description:
      "Designs and ships automations across Zapier, Make.com, and n8n.",
    longDescription:
      "An AI automation builder that turns a workflow description into a production-ready automation, picks the right tools, and handles error cases, retries, and logging.",
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
    price: "€99/mo",
    priceCents: 9900,
    stripePriceId: "price_data_analyst",
    setupTime: "2 days",
    rating: "4.8",
    installs: "1.4k",
    badge: "New",
    description:
      "Writes SQL, builds dashboards, and explains your numbers in plain English.",
    longDescription:
      "A data analyst agent that queries your warehouse, builds SQL models, creates dashboards, and writes executive-ready summaries of what's happening in the business.",
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
    price: "€79/mo",
    priceCents: 7900,
    stripePriceId: "price_copywriter",
    setupTime: "Same day",
    rating: "4.9",
    installs: "2.3k",
    badge: "Popular",
    description:
      "Writes landing pages, ads, emails, and product copy that converts.",
    longDescription:
      "A copywriter agent that produces platform-aware copy for landing pages, ads, emails, and product UI, with multiple variants for A/B testing.",
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
    price: "€69/mo",
    priceCents: 6900,
    stripePriceId: "price_blog_writer",
    setupTime: "1 day",
    rating: "4.8",
    installs: "1.6k",
    badge: "Popular",
    description:
      "Researches and writes long-form articles that rank and read well.",
    longDescription:
      "A blog writer agent that researches a topic, outlines the article, writes long-form content with sources, and produces SEO meta data and social snippets.",
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
    price: "€89/mo",
    priceCents: 8900,
    stripePriceId: "price_ui_designer",
    setupTime: "1 day",
    rating: "4.8",
    installs: "720",
    badge: "New",
    description: "Generates UI concepts, design tokens, and polished mockups.",
    longDescription:
      "A UI designer agent that produces mockups, suggests design tokens, builds component specs, and writes handoff notes for engineering.",
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
    price: "€99/mo",
    priceCents: 9900,
    stripePriceId: "price_ecommerce_expert",
    setupTime: "1 day",
    rating: "4.8",
    installs: "880",
    badge: "Popular",
    description:
      "Optimizes listings, recovers carts, and answers product questions.",
    longDescription:
      "An e-commerce expert that audits your store, writes product descriptions, recovers abandoned carts, handles product Q&A, and surfaces upsell opportunities.",
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
    price: "€119/mo",
    priceCents: 11900,
    stripePriceId: "price_shopify_agent",
    setupTime: "Same day",
    rating: "4.9",
    installs: "630",
    badge: "New",
    description:
      "Search products, generate cart links, and check order status on Shopify.",
    longDescription:
      "A Shopify agent that looks up products, builds direct cart links, and checks order status securely with order number and email.",
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
    price: "€129/mo",
    priceCents: 12900,
    stripePriceId: "price_business_manager",
    setupTime: "2 days",
    rating: "4.8",
    installs: "320",
    badge: "Customizable",
    description: "Your COO in a chat: reports, planning, and decision support.",
    longDescription:
      "A business manager agent that reads your operational data, drafts executive reports, coordinates cross-functional work, and helps you make faster, better decisions.",
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

export const SELLABLE_AGENTS: string[] = AGENTS.map((agent) => agent.slug);

const AVAILABLE_SLUGS = ["shopify-agent", "calendar-booking"];
const COMING_SOON_SLUGS = ["support-agent", "lead-capture"];

export function isAvailable(slug: string): boolean {
  return AVAILABLE_SLUGS.includes(slug);
}

export const AVAILABLE_AGENTS: Agent[] = AGENTS.filter((a) =>
  AVAILABLE_SLUGS.includes(a.slug),
);

export const COMING_SOON_AGENTS: Agent[] = AGENTS.filter((a) =>
  COMING_SOON_SLUGS.includes(a.slug),
);
