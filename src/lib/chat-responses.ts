/**
 * Shared local chat response engine.
 *
 * Used by both the hero widget (HeroSection) and the full chat page
 * (ChatInterface) as a deterministic fallback when no AI backend
 * (Gemini) is reachable.
 *
 * Kept framework-agnostic so it can be unit tested without React.
 * The platform defaults to Italian; callers pass their active locale
 * to resolve the right language.
 *
 * The texts mirror the REAL platform catalog (the 10 runtime agents in
 * `src/lib/agents/registry.ts`): 5 available in the default vertical
 * (Cosmo — Shopify Agent, Falco — Lead Capture, Cleo — Email Manager,
 * Zoe — Support Agent, Dante — Copywriter) and 5 coming soon
 * (Nova — SEO Content, Otto — Business Manager, Aria — Personal Assistant,
 * Luna — Calendar Booking, Midas — Finance Manager).
 */

export const CHAT_RESPONSES: Record<string, string> = {
  greeting:
    "Hi! I'm your AgentCloud AI. Today the platform offers **10 AI agents** — 5 available now (**Cosmo — Shopify Agent**, **Falco — Lead Capture**, **Cleo — Email Manager**, **Zoe — Support Agent**, **Dante — Copywriter**) and 5 coming soon (**Nova — SEO Content**, **Otto — Business Manager**, **Aria — Personal Assistant**, **Luna — Calendar Booking**, **Midas — Finance Manager**). What would you like to set up?",

  email:
    "For your emails and contacts, **Cleo — Email Manager** triages your inbox, drafts on-brand replies for your approval, and tracks every commitment and deadline. Want to activate it?",

  support:
    "**Zoe — Support Agent** answers every ticket 24/7 from your knowledge base and escalates only what needs a human. Want to configure it?",

  leads:
    "I can supercharge your lead capture with **Falco — Lead Capture**:\n\n• **Automatic Capture** — Collect contacts from forms and your site\n• **Enrichment** — Add context to prospects\n• **Notifications** — Alert sales with the right next steps\n\nReady to launch your lead capture agent?",

  finance:
    "**Cosmo — Shopify Agent** can check order status, sales, and payments for your store. Want to configure it?",

  social:
    "Today the platform focuses on **Shopify, lead capture, email, support and content** (Cosmo, Falco, Cleo, Zoe and Dante). Want to automate capturing leads from your channels instead?",

  campaigns:
    "**Dante — Copywriter** writes landing pages, ads, and email copy that converts, while **Cosmo — Shopify Agent** handles your store. Want to set one up?",

  data:
    "**Falco — Lead Capture** and **Cosmo — Shopify Agent** collect and structure lead and order data. Want to configure them?",

  scheduling:
    "**Luna — Calendar Booking** (coming soon) will find availability and book meetings automatically. For now you can set up **Falco — Lead Capture** or **Cosmo — Shopify Agent**. Want to start?",

  default:
    "Good question! AgentCloud currently offers **10 AI agents**:\n\n• **Available now** — Cosmo — Shopify Agent, Falco — Lead Capture, Cleo — Email Manager, Zoe — Support Agent, Dante — Copywriter\n• **Coming soon** — Nova — SEO Content, Otto — Business Manager, Aria — Personal Assistant, Luna — Calendar Booking, Midas — Finance Manager\n\nWhat area would you like to explore?",
};

export const CHAT_RESPONSES_IT: Record<string, string> = {
  greeting:
    "Ciao! Sono l'assistente AI di AgentCloud. Oggi la piattaforma offre **10 agenti AI** — 5 disponibili ora (**Cosmo — Agente Shopify**, **Falco — Lead Capture**, **Cleo — Email Manager**, **Zoe — Supporto**, **Dante — Copywriter**) e 5 in arrivo (**Nova — Contenuti SEO**, **Otto — Business Manager**, **Aria — Assistente Personale**, **Luna — Agente Prenotazioni**, **Midas — Finance Manager**). Cosa vuoi configurare?",

  email:
    "Per le tue email e i contatti, **Cleo — Email Manager** smista la casella, scrive bozze di risposta da approvare e traccia ogni impegno e scadenza. Vuoi attivarlo?",

  support:
    "**Zoe — Supporto** risponde a ogni ticket 24/7 usando la tua knowledge base e inoltra all'umano solo ciò che serve davvero. Vuoi configurarlo?",

  leads:
    "Posso potenziare la tua acquisizione lead con **Falco — Lead Capture**:\n\n• **Cattura automatica** — Raccoglie i contatti dai moduli e dal sito\n• **Arricchimento** — Aggiunge il contesto sui prospect\n• **Notifiche** — Avvisa le vendite con i passi successivi\n\nPronto a lanciare il tuo agente lead capture?",

  finance:
    "**Cosmo — Agente Shopify** può verificare ordini, vendite e pagamenti del tuo store. Vuoi configurarlo?",

  social:
    "Oggi la piattaforma si concentra su **Shopify, lead capture, email, supporto e contenuti** (Cosmo, Falco, Cleo, Zoe e Dante). Vuoi invece automatizzare l'acquisizione dei lead dai tuoi canali?",

  campaigns:
    "**Dante — Copywriter** scrive landing page, ads ed email che convertono, mentre **Cosmo — Agente Shopify** gestisce lo store. Vuoi configurarne uno?",

  data:
    "Gli agenti **Falco — Lead Capture** e **Cosmo — Agente Shopify** raccolgono e strutturano i dati di lead e ordini. Vuoi configurarli?",

  scheduling:
    "**Luna — Agente Prenotazioni** (in arrivo) troverà la disponibilità e prenoterà le riunioni in automatico. Per ora puoi configurare **Falco — Lead Capture** o **Cosmo — Agente Shopify**. Vuoi iniziare?",

  default:
    "Ottima domanda! AgentCloud offre oggi **10 agenti AI**:\n\n• **Disponibili ora** — Cosmo — Agente Shopify, Falco — Lead Capture, Cleo — Email Manager, Zoe — Supporto, Dante — Copywriter\n• **In arrivo** — Nova — Contenuti SEO, Otto — Business Manager, Aria — Assistente Personale, Luna — Agente Prenotazioni, Midas — Finance Manager\n\nQuale area vuoi esplorare?",
};

const PATTERNS: Array<[RegExp, string]> = [
  [/^(hi|hello|hey|ciao|buongiorno|buonasera|salve|hola)/i, "greeting"],
  [
    /\b(mail|email|inbox|draft|reply|casell\w*|posta|bozz\w*)\b/i,
    "email",
  ],
  [
    /\b(support|ticket|help desk|customer service|faq|assistenz\w*)\b/i,
    "support",
  ],
  [
    /\b(lead|prospect|customer acquisition|sales|vendit\w*)\b/i,
    "leads",
  ],
  [
    /\b(finance|invoice|bill|payment|revenue|expense|bookkeeping|fattur\w*|pagament\w*)\b/i,
    "finance",
  ],
  [
    /\b(social|instagram|linkedin|facebook|tweet|post|content|contenut\w*)\b/i,
    "social",
  ],
  [
    /\b(campaign|marketing|promo|advertise|launch|campagn\w*)\b/i,
    "campaigns",
  ],
  [
    /\b(data|analytics|report|analysis|extract|csv|export|dati|dato|analis\w*)\b/i,
    "data",
  ],
  [
    /\b(schedule|calendar|meeting|appointment|reminder|riunion\w*|appuntament\w*|calendari\w*)\b/i,
    "scheduling",
  ],
];

/**
 * Deterministically resolve a local response for a user message.
 * Used as a graceful fallback when no AI backend is available.
 *
 * `locale` selects the language of the response; it defaults to Italian,
 * matching the platform default.
 */
export function getLocalChatResponse(
  input: string,
  locale: "it" | "en" = "it",
): string {
  const lower = input.toLowerCase();
  const responses = locale === "en" ? CHAT_RESPONSES : CHAT_RESPONSES_IT;
  for (const [pattern, key] of PATTERNS) {
    if (pattern.test(lower)) return responses[key];
  }
  return responses.default;
}