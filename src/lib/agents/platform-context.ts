import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SHOPIFY_PRICING } from "@/lib/billing/pricing";
import { AGENT_RUNTIME } from "./registry";
import { getFeatureFlags } from "./feature-flags";

/**
 * Server-only platform knowledge for the general chat.
 *
 * Builds the system prompt for the non-agent chat (`/api/chat` without
 * `agentId`) from the REAL platform data: the active agents in the
 * `agents_registry` table (so counts always match what's actually in the
 * database) plus the runtime feature flags (which agents are available now
 * vs. coming soon), pricing, contacts and integrations. The agent list is
 * re-read from the database on every request, so the assistant always knows
 * the latest updates at that moment. When the database is unreachable, it
 * degrades to the in-code runtime registry without ever failing the chat
 * request.
 */

type AgentRow = {
  slug: string;
  name: string;
  display_price: string | null;
};

type PromptLabels = {
  intro: string;
  totalSuffix: string;
  sourceNote: string;
  available: string;
  comingSoon: string;
  none: string;
  pricingTitle: string;
  contactsTitle: string;
  integrationsTitle: string;
  liveNote: string;
  rules: string[];
  countSentence: (count: string) => string;
};

const PLATFORM_CONTACTS = {
  email: "info@agentcloud.agency",
  phone: "+39 351 986 3021",
};

const LABELS: Record<"it" | "en", PromptLabels> = {
  it: {
    intro:
      "Sei l'assistente AI di AgentCloud, la piattaforma di agenti AI per automatizzare e-commerce, marketing, supporto e operations.",
    totalSuffix: "agenti AI",
    sourceNote: "(fonte: database agents_registry, letto in tempo reale)",
    available: "Disponibili ora",
    comingSoon: "In arrivo",
    none: "- (nessuno)",
    pricingTitle: "**Piani e prezzi** (configurazione attuale):",
    contactsTitle: "**Contatti AgentCloud:**",
    integrationsTitle: "**Integrazioni principali:**",
    liveNote:
      "I dati su agenti, disponibilità e prezzi vengono letti dal database a ogni richiesta, quindi sono sempre aggiornati.",
    rules: [
      "Regole:",
      "- Rispondi nella lingua dell'utente (di norma in italiano).",
      "- Usa il markdown: **grassetto** per nomi e punti chiave, elenchi con • — la UI lo renderizza.",
      "- Sii conciso e concreto: dai subito il nome dell'agente giusto e cosa fa.",
      "- Non inventare agenti, prezzi o funzionalità oltre a queste informazioni: se non c'è in elenco, dillo chiaramente.",
      "- Se non conosci la risposta, ammettilo e suggerisci di contattare il team di AgentCloud (email o telefono sotto).",
    ],
    countSentence: (count) =>
      `Quando ti chiedono quanti agenti ci sono, cita il conteggio reale della piattaforma (${count}) e distingui tra disponibili ora e in arrivo.`,
  },
  en: {
    intro:
      "You are the AgentCloud assistant, the AI of the AgentCloud platform for automating e-commerce, marketing, support and operations.",
    totalSuffix: "AI agents",
    sourceNote: "(source: agents_registry database, read live)",
    available: "Available now",
    comingSoon: "Coming soon",
    none: "- (none)",
    pricingTitle: "**Plans and pricing** (current configuration):",
    contactsTitle: "**AgentCloud contacts:**",
    integrationsTitle: "**Main integrations:**",
    liveNote:
      "Agent, availability and pricing data is read from the database on every request, so it is always up to date.",
    rules: [
      "Rules:",
      "- Answer in the user's language.",
      "- Use markdown: **bold** for names and key points, • bullet lists — the UI renders it.",
      "- Be concise and concrete: name the right agent for the job and what it does.",
      "- Never invent agents, prices or features beyond this information: if it's not listed, say so clearly.",
      "- If you don't know the answer, admit it and suggest contacting the AgentCloud team (email or phone below).",
    ],
    countSentence: (count) =>
      `When asked how many agents there are, quote the real platform count (${count}) and distinguish between available now and coming soon.`,
  },
};

const CENTS_TO_DISPLAY = (cents: number): string =>
  `€${(cents / 100).toFixed(0)}/mese`;

function runtimeFallbackAgents(): AgentRow[] {
  return Object.values(AGENT_RUNTIME).map((a) => ({
    slug: a.id,
    name: a.name,
    display_price: CENTS_TO_DISPLAY(a.price),
  }));
}

/** Which vertical preset is active (from env), used for context in the prompt. */
function activeVerticalLabel(locale: "it" | "en"): string {
  const vertical = process.env.AGENTCLOUD_VERTICAL?.toLowerCase();
  if (locale === "it") {
    if (vertical === "full" || vertical === "all") return "piattaforma completa";
    if (vertical === "services") return "verticale servizi";
    return "verticale Shopify (e-commerce)";
  }
  if (vertical === "full" || vertical === "all") return "full platform";
  if (vertical === "services") return "services vertical";
  return "Shopify (e-commerce) vertical";
}

/** Pricing + add-ons rendered from the Shopify pricing config. */
function pricingLines(locale: "it" | "en"): string[] {
  const { plans } = SHOPIFY_PRICING;
  const perMonth = locale === "it" ? "mese" : "month";
  const tokens = locale === "it" ? "token/mese" : "tokens/month";
  const lines = [plans.starter, plans.growth].map(
    (plan) =>
      `- **${plan.name}** — ${plan.priceDisplay} — fino a ${plan.tokens.toLocaleString("it-IT")} ${tokens}`,
  );
  const addon = plans.starter.addons?.webSearch;
  if (addon) {
    lines.push(
      `- **Web Search** — ${addon.priceDisplay} — ${addon.description} (${perMonth})`,
    );
  }
  return lines;
}

/**
 * Query the active agents from `agents_registry`. Returns null when the
 * database is unavailable or empty so callers can fall back to the runtime
 * registry. Never throws.
 */
async function fetchActiveAgentsFromDb(): Promise<AgentRow[] | null> {
  try {
    const admin = createAdminClient();
    const supabase = admin ?? (await createClient());

    const { data, error } = await supabase
      .from("agents_registry")
      .select("slug, name, display_price")
      .eq("active", true)
      .order("name");

    if (error || !data || data.length === 0) return null;
    return data as AgentRow[];
  } catch {
    return null;
  }
}

/**
 * Build the system prompt for the general chat with the real platform
 * knowledge (agents, prices and counts from the database, plus pricing,
 * contacts and integrations).
 */
export async function buildPlatformSystemPrompt(
  locale: "it" | "en",
): Promise<string> {
  const agents =
    (await fetchActiveAgentsFromDb()) ?? runtimeFallbackAgents();
  const labels = LABELS[locale];

  const enabledSlugs = new Set(getFeatureFlags().enabledAgents);
  const available = agents.filter((a) => enabledSlugs.has(a.slug));
  const comingSoon = agents.filter((a) => !enabledSlugs.has(a.slug));

  const describe = (a: AgentRow) => {
    const runtime = AGENT_RUNTIME[a.slug];
    const price = a.display_price ? ` · ${a.display_price}` : "";
    const description = runtime?.description ? ` — ${runtime.description}` : "";
    return `- **${a.name}** (\`${a.slug}\`)${price}${description}`;
  };

  const count = `${agents.length} (${available.length} ${locale === "it" ? "disponibili" : "available"}, ${comingSoon.length} ${locale === "it" ? "in arrivo" : "coming soon"})`;

  const verticalLine = `Configurazione attiva: ${activeVerticalLabel(locale)}.`;

  const sections = [
    labels.intro,
    "",
    `**${agents.length} ${labels.totalSuffix}** ${labels.sourceNote}:`,
    "",
    `**${labels.available} (${available.length}):**`,
    ...(available.length > 0 ? available.map(describe) : [labels.none]),
    "",
    `**${labels.comingSoon} (${comingSoon.length}):**`,
    ...(comingSoon.length > 0 ? comingSoon.map(describe) : [labels.none]),
    "",
    labels.pricingTitle,
    ...pricingLines(locale),
    "",
    labels.integrationsTitle,
    ...(locale === "it"
      ? [
          "- **Shopify** — negozio collegato dal cliente via OAuth (prodotti, ordini, clienti, sconti, analytics)",
          "- **Stripe** — abbonamenti, pagamenti e fatturazione",
          "- **Google Calendar** — prenotazioni e appuntamenti",
          "- **Web search** — ricerca sul web (Tavily)",
        ]
      : [
          "- **Shopify** — the customer's store connected via OAuth (products, orders, customers, discounts, analytics)",
          "- **Stripe** — subscriptions, payments and billing",
          "- **Google Calendar** — bookings and appointments",
          "- **Web search** — web search (Tavily)",
        ]),
    "",
    labels.contactsTitle,
    `- **Email:** ${PLATFORM_CONTACTS.email}`,
    `- **Telefono:** ${PLATFORM_CONTACTS.phone}`,
    "",
    ...labels.rules,
    labels.countSentence(count),
    "",
    verticalLine,
    labels.liveNote,
  ];

  return sections.join("\n");
}
