import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { AGENT_RUNTIME } from "./registry";
import { getFeatureFlags } from "./feature-flags";

/**
 * Server-only platform knowledge for the general chat.
 *
 * Builds the system prompt for the non-agent chat (`/api/chat` without
 * `agentId`) from the REAL platform data: the active agents in the
 * `agents_registry` table (so counts always match what's actually in the
 * database) plus the runtime feature flags (which agents are available now
 * vs. coming soon). When the database is unreachable, it degrades to the
 * in-code runtime registry without ever failing the chat request.
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
  rules: string[];
  countSentence: (count: string) => string;
};

const LABELS: Record<"it" | "en", PromptLabels> = {
  it: {
    intro:
      "Sei l'assistente AI di AgentCloud, la piattaforma di agenti AI per automatizzare e-commerce, marketing, supporto e operations.",
    totalSuffix: "agenti AI",
    sourceNote: "(fonte: database agents_registry)",
    available: "Disponibili ora",
    comingSoon: "In arrivo",
    none: "- (nessuno)",
    rules: [
      "Regole:",
      "- Rispondi nella lingua dell'utente (di norma in italiano).",
      "- Usa il markdown: **grassetto** per nomi e punti chiave, elenchi con • — la UI lo renderizza.",
      "- Sii conciso e concreto: dai subito il nome dell'agente giusto e cosa fa.",
      "- Non inventare agenti, prezzi o funzionalità oltre a questa lista: se non c'è in elenco, dillo chiaramente.",
      "- Se non conosci la risposta, ammettilo e suggerisci di contattare il team di AgentCloud.",
    ],
    countSentence: (count) =>
      `Quando ti chiedono quanti agenti ci sono, cita il conteggio reale della piattaforma (${count}) e distingui tra disponibili ora e in arrivo.`,
  },
  en: {
    intro:
      "You are the AgentCloud assistant, the AI of the AgentCloud platform for automating e-commerce, marketing, support and operations.",
    totalSuffix: "AI agents",
    sourceNote: "(source: agents_registry database)",
    available: "Available now",
    comingSoon: "Coming soon",
    none: "- (none)",
    rules: [
      "Rules:",
      "- Answer in the user's language.",
      "- Use markdown: **bold** for names and key points, • bullet lists — the UI renders it.",
      "- Be concise and concrete: name the right agent for the job and what it does.",
      "- Never invent agents, prices or features beyond this list: if it's not listed, say so clearly.",
      "- If you don't know the answer, admit it and suggest contacting the AgentCloud team.",
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
 * knowledge (agents, prices and counts from the database).
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
    ...labels.rules,
    labels.countSentence(count),
  ];

  return sections.join("\n");
}