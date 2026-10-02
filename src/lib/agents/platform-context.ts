import type { Locale } from "@/lib/i18n/constants";
import { SHOPIFY_PRICING } from "@/lib/billing/pricing";
import { AGENTS, isAvailable, localizeAgent, type Agent } from "@/lib/agents";
import { languageDirective } from "./language";

/**
 * Conoscenza piattaforma server-only per la chat generica.
 *
 * Come funziona: costruisce il system prompt della chat senza agente
 * (`/api/chat` senza `agentId`) a partire dal CATALOGO UFFICIALE in
 * `src/lib/agents.ts`, lo stesso array che alimenta la UI, più i feature flag
 * runtime (disponibili ora vs. in arrivo), prezzi, contatti e integrazioni.
 *
 * Perché il catalogo e non la tabella `agents_registry`: le due fonti erano
 * in disaccordo (il seed del database contiene 10 righe, il catalogo 15
 * agenti) e il prompt riportava il numero del database mentre la landing
 * mostrava `AGENTS.length`. L'assistente rispondeva quindi "10 agenti" mentre
 * la pagina ne prometteva 15. Usando il catalogo, i conteggi non possono
 * divergere: un solo numero, una sola fonte. Non serve più interrogare il
 * database a ogni richiesta.
 *
 * I dati sono localizzati con `localizeAgent`, quindi un prompt italiano
 * contiene nomi, descrizioni e task in italiano.
 */

/** Riga di catalogo pronta per il prompt: agente canonico + overlay locale. */
type CatalogEntry = {
  agent: Agent;
  price: string;
  setup: string;
};

const DECIMAL_SEP: Record<Locale, string> = {
  it: ",",
  en: ".",
  es: ",",
  de: ",",
  fr: ",",
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
  /** Titolo e regola del catalogo compatto dato agli agenti singoli. */
  catalogTitle: string;
  catalogRule: string;
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
    sourceNote: "(catalogo ufficiale della piattaforma)",
    available: "Disponibili ora",
    comingSoon: "In arrivo",
    none: "- (nessuno)",
    pricingTitle: "**Piani e prezzi** (configurazione attuale):",
    contactsTitle: "**Contatti AgentCloud:**",
    integrationsTitle: "**Integrazioni principali:**",
    liveNote:
      "Agenti, disponibilità e prezzi arrivano dal catalogo ufficiale della piattaforma, quindi sono sempre aggiornati.",
    catalogTitle:
      "## Catalogo piattaforma (AgentCloud)\nQuesti sono gli agenti AI della piattaforma. Quando ti chiedono quanti agenti ci sono, di cosa fanno o quanto costano, usa questo elenco e non altri numeri.",
    catalogRule:
      "Resta il tuo ruolo: se la domanda riguarda te, rispondi come agente. Se riguarda gli altri agenti o la piattaforma, indirizza in base a questo elenco.",
    rules: [
      "Regole:",
      "- Usa il markdown: **grassetto** per nomi e punti chiave, elenchi con • — la UI lo renderizza.",
      "- Sii conciso e concreto: dai subito il nome dell'agente giusto e cosa fa.",
      "- Non inventare agenti, prezzi o funzionalità oltre a queste informazioni: se non c'è in elenco, dillo chiaramente.",
      "- Se non conosci la risposta, ammettilo e suggerisci di contattare il team di AgentCloud (email o telefono sotto).",
      "- Non usare emoji nelle risposte.",
    ],
    countSentence: (count) =>
      `Quando ti chiedono quanti agenti ci sono, cita il conteggio reale della piattaforma (${count}) e distingui tra disponibili ora e in arrivo.`,
  },
  en: {
    intro:
      "You are the AgentCloud assistant, the AI of the AgentCloud platform for automating e-commerce, marketing, support and operations.",
    totalSuffix: "AI agents",
    sourceNote: "(official platform catalog)",
    available: "Available now",
    comingSoon: "Coming soon",
    none: "- (none)",
    pricingTitle: "**Plans and pricing** (current configuration):",
    contactsTitle: "**AgentCloud contacts:**",
    integrationsTitle: "**Main integrations:**",
    liveNote:
      "Agents, availability and pricing come from the official platform catalog, so they are always up to date.",
    catalogTitle:
      "## Platform catalog (AgentCloud)\nThese are the platform's AI agents. When asked how many agents there are, what they do or how much they cost, use this list and no other numbers.",
    catalogRule:
      "Stay in your role: if the question is about you, answer as the agent. If it is about other agents or the platform, point using this list.",
    rules: [
      "Rules:",
      "- Use markdown: **bold** for names and key points, • bullet lists — the UI renders it.",
      "- Be concise and concrete: name the right agent for the job and what it does.",
      "- Never invent agents, prices or features beyond this information: if it's not listed, say so clearly.",
      "- If you don't know the answer, admit it and suggest contacting the AgentCloud team (email or phone below).",
      "- Never use emoji in your replies.",
    ],
    countSentence: (count) =>
      `When asked how many agents there are, quote the real platform count (${count}) and distinguish between available now and coming soon.`,
  },
  es: {
    intro:
      "Eres el asistente de AgentCloud, la IA de la plataforma AgentCloud para automatizar e-commerce, marketing, soporte y operaciones.",
    totalSuffix: "agentes IA",
    sourceNote: "(catálogo oficial de la plataforma)",
    available: "Disponibles ahora",
    comingSoon: "Próximamente",
    none: "- (ninguno)",
    pricingTitle: "**Planes y precios** (configuración actual):",
    contactsTitle: "**Contactos AgentCloud:**",
    integrationsTitle: "**Integraciones principales:**",
    liveNote:
      "Los datos de agentes, disponibilidad y precios provienen del catálogo oficial de la plataforma, por lo que siempre están actualizados.",
    catalogTitle:
      "## Catálogo de la plataforma (AgentCloud)\nEstos son los agentes IA de la plataforma. Cuando pregunten cuántos agentes hay, qué hacen o cuánto cuestan, usa esta lista y ningún otro número.",
    catalogRule:
      "Mantén tu rol: si la pregunta es sobre ti, responde como agente. Si es sobre otros agentes o la plataforma, orienta con esta lista.",
    rules: [
      "Reglas:",
      "- Usa markdown: **negrita** para nombres y puntos clave, listas con •.",
      "- Sé conciso y concreto: nombra el agente adecuado y qué hace.",
      "- Nunca inventes agentes, precios o funciones más allá de esta información.",
      "- Si no sabes la respuesta, admítelo y sugiere contactar al equipo de AgentCloud.",
      "- No uses emoji en tus respuestas.",
    ],
    countSentence: (count) =>
      `Cuando te pregunten cuántos agentes hay, cita el recuento real de la plataforma (${count}) y distingue entre disponibles ahora y próximamente.`,
  },
  de: {
    intro:
      "Du bist der AgentCloud-Assistent, die KI der AgentCloud-Plattform zur Automatisierung von E-Commerce, Marketing, Support und Operations.",
    totalSuffix: "KI-Agenten",
    sourceNote: "(offizieller Plattformkatalog)",
    available: "Jetzt verfügbar",
    comingSoon: "Demnächst",
    none: "- (keine)",
    pricingTitle: "**Pläne und Preise** (aktuelle Konfiguration):",
    contactsTitle: "**AgentCloud-Kontakte:**",
    integrationsTitle: "**Wichtigste Integrationen:**",
    liveNote:
      "Agenten-, Verfügbarkeits- und Preisdaten stammen aus dem offiziellen Plattformkatalog und sind daher immer aktuell.",
    catalogTitle:
      "## Plattformkatalog (AgentCloud)\nDas sind die KI-Agenten der Plattform. Wenn gefragt wird, wie viele Agenten es gibt, was sie tun oder was sie kosten, nutze diese Liste und keine anderen Zahlen.",
    catalogRule:
      "Bleibe in deiner Rolle: Geht es um dich, antworte als Agent. Geht es um andere Agenten oder die Plattform, verweise mit dieser Liste.",
    rules: [
      "Regeln:",
      "- Verwende Markdown: **fett** für Namen und Kernpunkte, Aufzählungen mit •.",
      "- Sei präzise und konkret: nenne den passenden Agenten und seine Aufgabe.",
      "- Erfinde niemals Agenten, Preise oder Funktionen über diese Informationen hinaus.",
      "- Wenn du die Antwort nicht weißt, gib es zu und verweise an das AgentCloud-Team.",
      "- Verwende keine Emojis in deinen Antworten.",
    ],
    countSentence: (count) =>
      `Wenn nach der Anzahl der Agenten gefragt wird, nenne die echte Plattformzahl (${count}) und unterscheide zwischen jetzt verfügbar und demnächst.`,
  },
  fr: {
    intro:
      "Vous êtes l'assistant AgentCloud, l'IA de la plateforme AgentCloud pour automatiser e-commerce, marketing, support et opérations.",
    totalSuffix: "agents IA",
    sourceNote: "(catalogue officiel de la plateforme)",
    available: "Disponibles maintenant",
    comingSoon: "Bientôt disponible",
    none: "- (aucun)",
    pricingTitle: "**Plans et tarifs** (configuration actuelle) :",
    contactsTitle: "**Contacts AgentCloud :**",
    integrationsTitle: "**Intégrations principales :**",
    liveNote:
      "Les données d'agents, de disponibilité et de tarifs proviennent du catalogue officiel de la plateforme, donc toujours à jour.",
    catalogTitle:
      "## Catalogue de la plateforme (AgentCloud)\nVoici les agents IA de la plateforme. Lorsqu'on demande combien d'agents il existe, ce qu'ils font ou ce qu'ils coûtent, utilise cette liste et aucun autre chiffre.",
    catalogRule:
      "Reste dans ton rôle : si la question te concerne, réponds en tant qu'agent. Si elle concerne les autres agents ou la plateforme, oriente avec cette liste.",
    rules: [
      "Règles :",
      "- Utilisez le markdown : **gras** pour les noms et points clés, listes à puces avec •.",
      "- Soyez concis et concret : nommez le bon agent et ce qu'il fait.",
      "- N'inventez jamais d'agents, tarifs ou fonctionnalités au-delà de ces informations.",
      "- Si vous ne connaissez pas la réponse, admettez-le et suggérez de contacter l'équipe AgentCloud.",
      "- N'utilisez jamais d'emoji dans vos réponses.",
    ],
    countSentence: (count) =>
      `Quand on demande combien d'agents il y a, citez le nombre réel de la plateforme (${count}) et distinguez entre disponibles maintenant et bientôt.`,
  },
};

/**
 * Suffisso del prezzo e parole usate nel prompt, per locale.
 *
 * Prima esisteva un `locale === "it" ? "mese" : "month"` sparso in tre punti:
 * es/de/fr ricevevano il suffisso inglese dentro un prompt già tradotto.
 */
const PROMPT_WORDS: Record<
  Locale,
  {
    perMonth: string;
    available: string;
    comingSoon: string;
    verticalFull: string;
    verticalServices: string;
    verticalShopify: string;
    verticalConfigPrefix: string;
    integrations: string[];
  }
> = {
  it: {
    perMonth: "mese",
    available: "disponibili",
    comingSoon: "in arrivo",
    verticalFull: "piattaforma completa",
    verticalServices: "verticale servizi",
    verticalShopify: "verticale Shopify (e-commerce)",
    verticalConfigPrefix: "Configurazione attiva",
    integrations: [
      "- **Shopify** — negozio collegato dal cliente via OAuth (prodotti, ordini, clienti, sconti, analytics)",
      "- **Stripe** — abbonamenti, pagamenti e fatturazione",
      "- **Google Calendar** — prenotazioni e appuntamenti",
      "- **Web search** — ricerca sul web via Chrome/Tavily",
    ],
  },
  en: {
    perMonth: "month",
    available: "available",
    comingSoon: "coming soon",
    verticalFull: "full platform",
    verticalServices: "services vertical",
    verticalShopify: "Shopify (e-commerce) vertical",
    verticalConfigPrefix: "Active configuration",
    integrations: [
      "- **Shopify** — the customer's store connected via OAuth (products, orders, customers, discounts, analytics)",
      "- **Stripe** — subscriptions, payments and billing",
      "- **Google Calendar** — bookings and appointments",
      "- **Web search** — web search via Chrome/Tavily",
    ],
  },
  es: {
    perMonth: "mes",
    available: "disponibles",
    comingSoon: "próximamente",
    verticalFull: "plataforma completa",
    verticalServices: "vertical de servicios",
    verticalShopify: "vertical de Shopify (e-commerce)",
    verticalConfigPrefix: "Configuración activa",
    integrations: [
      "- **Shopify** — la tienda del cliente conectada vía OAuth (productos, pedidos, clientes, descuentos, analítica)",
      "- **Stripe** — suscripciones, pagos y facturación",
      "- **Google Calendar** — reservas y citas",
      "- **Web search** — búsqueda web vía Chrome/Tavily",
    ],
  },
  de: {
    perMonth: "Monat",
    available: "verfügbar",
    comingSoon: "demnächst",
    verticalFull: "vollständige Plattform",
    verticalServices: "Dienstleistungs-Vertical",
    verticalShopify: "Shopify-Vertical (E-Commerce)",
    verticalConfigPrefix: "Aktive Konfiguration",
    integrations: [
      "- **Shopify** — der per OAuth verbundene Shop des Kunden (Produkte, Bestellungen, Kunden, Rabatte, Analytics)",
      "- **Stripe** — Abonnements, Zahlungen und Abrechnung",
      "- **Google Calendar** — Buchungen und Termine",
      "- **Web search** — Websuche über Chrome/Tavily",
    ],
  },
  fr: {
    perMonth: "mois",
    available: "disponibles",
    comingSoon: "bientôt disponibles",
    verticalFull: "plateforme complète",
    verticalServices: "verticale services",
    verticalShopify: "verticale Shopify (e-commerce)",
    verticalConfigPrefix: "Configuration active",
    integrations: [
      "- **Shopify** — la boutique du client connectée via OAuth (produits, commandes, clients, remises, analytique)",
      "- **Stripe** — abonnements, paiements et facturation",
      "- **Google Calendar** — réservations et rendez-vous",
      "- **Web search** — recherche web via Chrome/Tavily",
    ],
  },
};

/** Prezzo con 2 decimali e separatore decimale della lingua del prompt. */
function formatPrice(cents: number, locale: Locale): string {
  const amount = (cents / 100).toFixed(2).replace(".", DECIMAL_SEP[locale]);
  return `€${amount}/${PROMPT_WORDS[locale].perMonth}`;
}

/**
 * Catalogo localizzato pronto per il prompt. La disponibilità usa
 * `isAvailable`, cioè gli stessi feature flag che guidano la UI: se un agente
 * è in arrivo sulla pagina /agents, qui lo è anche nel prompt.
 */
function catalogEntries(locale: Locale): CatalogEntry[] {
  return AGENTS.map((agent) => {
    const localized = localizeAgent(agent, locale);
    return { agent: localized, price: formatPrice(agent.priceCents, locale), setup: localized.setupTime };
  });
}

/** Scheda completa di un agente: identità, prezzo, descrizione, task, tool. */
function describeEntry(entry: CatalogEntry): string[] {
  const { agent, price, setup } = entry;
  const lines = [
    `- **${agent.name}** (\`${agent.slug}\`) · ${price} · setup: ${setup} · ${agent.badgeLabel ?? agent.badge}`,
    `  ${agent.description}`,
    `  Categoria: ${agent.category} — ${agent.industry}`,
  ];
  if (agent.tasks.length > 0) {
    lines.push(`  Fa: ${agent.tasks.join("; ")}`);
  }
  if (agent.integrations.length > 0) {
    lines.push(`  Integra: ${agent.integrations.join(", ")}`);
  }
  return lines;
}

/** Quale preset verticale è attivo (da env), usato come contesto nel prompt. */
function activeVerticalLabel(locale: Locale): string {
  const w = PROMPT_WORDS[locale];
  const vertical = process.env.AGENTCLOUD_VERTICAL?.toLowerCase();
  if (vertical === "full" || vertical === "all") return w.verticalFull;
  if (vertical === "services") return w.verticalServices;
  return w.verticalShopify;
}

/** Righe prezzi + add-on generate dalla configurazione prezzi Shopify. */
function pricingLines(locale: Locale): string[] {
  const { plans } = SHOPIFY_PRICING;
  const perMonth = PROMPT_WORDS[locale].perMonth;
  const lines = [plans.starter, plans.growth].map(
    (plan) => `- **${plan.name}** — ${plan.priceDisplay}`,
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
 * Costruisce il system prompt della chat generica con la conoscenza reale
 * della piattaforma: catalogo completo degli agenti con prezzi e task,
 * disponibilità, piani Shopify, contatti e integrazioni.
 */
export async function buildPlatformSystemPrompt(
  locale: Locale,
): Promise<string> {
  const labels = LABELS[locale];
  const entries = catalogEntries(locale);
  const available = entries.filter((e) => isAvailable(e.agent.slug));
  const comingSoon = entries.filter((e) => !isAvailable(e.agent.slug));

  const words = PROMPT_WORDS[locale];
  const count = `${entries.length} (${available.length} ${words.available}, ${comingSoon.length} ${words.comingSoon})`;

  const verticalLine = `${words.verticalConfigPrefix}: ${activeVerticalLabel(locale)}.`;

  const sections = [
    labels.intro,
    "",
    `**${entries.length} ${labels.totalSuffix}** ${labels.sourceNote}:`,
    "",
    `**${labels.available} (${available.length}):**`,
    ...(available.length > 0 ? available.flatMap(describeEntry) : [labels.none]),
    "",
    `**${labels.comingSoon} (${comingSoon.length}):**`,
    ...(comingSoon.length > 0 ? comingSoon.flatMap(describeEntry) : [labels.none]),
    "",
    labels.pricingTitle,
    ...pricingLines(locale),
    "",
    labels.integrationsTitle,
    ...words.integrations,
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
    // Lingua delle risposte: la politica condivisa con gli agenti
    // (lingua del messaggio, altrimenti lingua della piattaforma).
    "",
    languageDirective(locale),
  ];

  return sections.join("\n");
}

/**
 * Contesto compatto di catalogo per il system prompt di un agente singolo
 * (`/api/agent/run`). Un agente sapeva solo di sé: chiedendo "quanti agenti
 * avete?" rispondeva a spanne, o si dichiarava un negozio. Qui trova il
 * conteggio reale, l'elenco dei pari con la sua funzione e il prezzo, così
 * può indirizzare l'utente al confronto senza inventare nulla.
 *
 * Volutamente solo nomi, ruolo e prezzo: il prompt dell'agente gira a ogni
 * messaggio, quindi qui il contenuto si tiene corto rispetto al catalogo
 * completo della chat generica.
 */
export function buildAgentCatalogContext(locale: Locale): string {
  const labels = LABELS[locale];
  const words = PROMPT_WORDS[locale];
  const entries = catalogEntries(locale);
  const available = entries.filter((e) => isAvailable(e.agent.slug));
  const count = `${entries.length} (${available.length} ${words.available})`;

  const lines = entries.map(
    (e) =>
      `- **${e.agent.name}** (${e.agent.slug}) · ${e.price} — ${e.agent.description}`,
  );

  return [
    labels.catalogTitle,
    `${count}.`,
    ...lines,
    labels.catalogRule,
  ].join("\n");
}