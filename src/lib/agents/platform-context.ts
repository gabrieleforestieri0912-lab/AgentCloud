import { createAdminClient } from "@/lib/supabase/admin";
import type { Locale } from "@/lib/i18n/constants";
import { createClient } from "@/lib/supabase/server";
import { SHOPIFY_PRICING } from "@/lib/billing/pricing";
import { AGENT_RUNTIME } from "./registry";
import { getFeatureFlags } from "./feature-flags";

/**
 * Conoscenza piattaforma server-only per la chat generica.
 *
 * Come funziona: costruisce il system prompt della chat senza agente
 * (`/api/chat` senza `agentId`) a partire dai DATI REALI della piattaforma:
 * gli agenti attivi nella tabella `agents_registry` (così i conteggi coincidono
 * sempre con ciò che c'è davvero nel DB) più i feature flag runtime (quali
 * agenti sono disponibili ora vs. in arrivo), prezzi, contatti e integrazioni.
 * La lista agenti viene riletta dal database a ogni richiesta, quindi
 * l'assistente conosce sempre gli ultimi aggiornamenti. Se il database non è
 * raggiungibile degrada al registry runtime nel codice, senza mai far fallire
 * la richiesta di chat.
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

const LABELS: Record<Locale, PromptLabels> = {
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
  es: {
    intro:
      "Eres el asistente de AgentCloud, la IA de la plataforma AgentCloud para automatizar e-commerce, marketing, soporte y operaciones.",
    totalSuffix: "agentes IA",
    sourceNote: "(fuente: base de datos agents_registry, leída en vivo)",
    available: "Disponibles ahora",
    comingSoon: "Próximamente",
    none: "- (ninguno)",
    pricingTitle: "**Planes y precios** (configuración actual):",
    contactsTitle: "**Contactos AgentCloud:**",
    integrationsTitle: "**Integraciones principales:**",
    liveNote:
      "Los datos de agentes, disponibilidad y precios se leen de la base de datos en cada solicitud, por lo que siempre están actualizados.",
    rules: [
      "Reglas:",
      "- Responde en el idioma del usuario.",
      "- Usa markdown: **negrita** para nombres y puntos clave, listas con •.",
      "- Sé conciso y concreto: nombra el agente adecuado y qué hace.",
      "- Nunca inventes agentes, precios o funciones más allá de esta información.",
      "- Si no sabes la respuesta, admítelo y sugiere contactar al equipo de AgentCloud.",
    ],
    countSentence: (count) =>
      `Cuando te pregunten cuántos agentes hay, cita el recuento real de la plataforma (${count}) y distingue entre disponibles ahora y próximamente.`,
  },
  de: {
    intro:
      "Du bist der AgentCloud-Assistent, die KI der AgentCloud-Plattform zur Automatisierung von E-Commerce, Marketing, Support und Operations.",
    totalSuffix: "KI-Agenten",
    sourceNote: "(Quelle: agents_registry Datenbank, live gelesen)",
    available: "Jetzt verfügbar",
    comingSoon: "Demnächst",
    none: "- (keine)",
    pricingTitle: "**Pläne und Preise** (aktuelle Konfiguration):",
    contactsTitle: "**AgentCloud-Kontakte:**",
    integrationsTitle: "**Wichtigste Integrationen:**",
    liveNote:
      "Agent-, Verfügbarkeits- und Preisdaten werden bei jeder Anfrage aus der Datenbank gelesen und sind daher immer aktuell.",
    rules: [
      "Regeln:",
      "- Antworte in der Sprache des Nutzers.",
      "- Verwende Markdown: **fett** für Namen und Kernpunkte, Aufzählungen mit •.",
      "- Sei präzise und konkret: nenne den passenden Agenten und seine Aufgabe.",
      "- Erfinde niemals Agenten, Preise oder Funktionen über diese Informationen hinaus.",
      "- Wenn du die Antwort nicht weißt, gib es zu und verweise an das AgentCloud-Team.",
    ],
    countSentence: (count) =>
      `Wenn nach der Anzahl der Agenten gefragt wird, nenne die echte Plattformzahl (${count}) und unterscheide zwischen jetzt verfügbar und demnächst.`,
  },
  fr: {
    intro:
      "Vous êtes l'assistant AgentCloud, l'IA de la plateforme AgentCloud pour automatiser e-commerce, marketing, support et opérations.",
    totalSuffix: "agents IA",
    sourceNote: "(source : base de données agents_registry, lue en direct)",
    available: "Disponibles maintenant",
    comingSoon: "Bientôt disponible",
    none: "- (aucun)",
    pricingTitle: "**Plans et tarifs** (configuration actuelle) :",
    contactsTitle: "**Contacts AgentCloud :**",
    integrationsTitle: "**Intégrations principales :**",
    liveNote:
      "Les données d'agents, de disponibilité et de tarifs sont lues depuis la base de données à chaque requête, donc toujours à jour.",
    rules: [
      "Règles :",
      "- Répondez dans la langue de l'utilisateur.",
      "- Utilisez le markdown : **gras** pour les noms et points clés, listes à puces avec •.",
      "- Soyez concis et concret : nommez le bon agent et ce qu'il fait.",
      "- N'inventez jamais d'agents, tarifs ou fonctionnalités au-delà de ces informations.",
      "- Si vous ne connaissez pas la réponse, admettez-le et suggérez de contacter l'équipe AgentCloud.",
    ],
    countSentence: (count) =>
      `Quand on demande combien d'agents il y a, citez le nombre réel de la plateforme (${count}) et distinguez entre disponibles maintenant et bientôt.`,
  },
};

const CENTS_TO_DISPLAY = (cents: number): string =>
  `€${(cents / 100).toFixed(0)}/mese`;

const CATALOG_SLUGS = [
  "seo-agent",
  "business-manager",
  "personal-assistant",
  "email-manager",
  "finance-manager",
  "shopify-agent",
  "calendar-booking",
  "lead-capture",
  "support-agent",
  "copywriter",
];

function runtimeFallbackAgents(): AgentRow[] {
  return CATALOG_SLUGS.map((slug) => AGENT_RUNTIME[slug])
    .filter(Boolean)
    .map((a) => ({
      slug: a.id,
      name: a.name,
      display_price: CENTS_TO_DISPLAY(a.price),
    }));
}

/** Quale preset verticale è attivo (da env), usato come contesto nel prompt. */
function activeVerticalLabel(locale: Locale): string {
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

/** Righe prezzi + add-on generate dalla configurazione prezzi Shopify. */
function pricingLines(locale: Locale): string[] {
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
 * Interroga gli agenti attivi da `agents_registry`. Restituisce null quando
 * il database non è disponibile o è vuoto, così i chiamanti possono ripiegare
 * sul registry runtime. Non lancia mai.
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
 * Costruisce il system prompt della chat generica con la conoscenza reale
 * della piattaforma (agenti, prezzi e conteggi dal database, più prezzi,
 * contatti e integrazioni).
 */
export async function buildPlatformSystemPrompt(
  locale: Locale,
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