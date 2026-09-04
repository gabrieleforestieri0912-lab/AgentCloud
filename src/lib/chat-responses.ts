/**
 * Shared local chat response engine.
 *
 * Used by both the hero widget (HeroSection) and the full chat page
 * (ChatInterface) as a deterministic fallback when no AI backend
 * (Claude) is reachable.
 *
 * Kept framework-agnostic so it can be unit tested without React.
 * The platform defaults to Italian; callers pass their active locale
 * to resolve the right language.
 *
 * The texts mirror the REAL platform catalog (the 10 runtime agents in
 * `src/lib/agents/registry.ts`): 5 available in the default vertical
 * (Shopify Agent, Lead Capture, Email Manager, Support Agent, Copywriter)
 * and 5 coming soon (SEO Content, Business Manager, Personal Assistant,
 * Calendar Booking, Finance Manager).
 */

export const CHAT_RESPONSES: Record<string, string> = {
  greeting:
    "Hi! I'm your AgentCloud AI. Today the platform offers **10 AI agents** — 5 available now (**Shopify Agent**, **Lead Capture**, **Email Manager**, **Support Agent**, **Copywriter**) and 5 coming soon (**SEO Content**, **Business Manager**, **Personal Assistant**, **Calendar Booking**, **Finance Manager**). What would you like to set up?",

  email:
    "For your emails and contacts, the **Email Manager** agent triages your inbox, drafts on-brand replies for your approval, and tracks every commitment and deadline. Want to activate it?",

  support:
    "The **Support Agent** answers every ticket 24/7 from your knowledge base and escalates only what needs a human. Want to configure it?",

  leads:
    "I can supercharge your lead capture with the **Lead Capture** agent:\n\n• **Automatic Capture** — Collect contacts from forms and your site\n• **Enrichment** — Add context to prospects\n• **Notifications** — Alert sales with the right next steps\n\nReady to launch your lead capture agent?",

  finance:
    "The **Shopify Agent** can check order status, sales, and payments for your store. Want to configure it?",

  social:
    "Today the platform focuses on **Shopify, lead capture, email, support and content**. Want to automate capturing leads from your channels instead?",

  campaigns:
    "The **Copywriter** writes landing pages, ads, and email copy that converts, while the **Shopify Agent** handles your store. Want to set one up?",

  data:
    "The **Lead Capture** and **Shopify** agents collect and structure lead and order data. Want to configure them?",

  scheduling:
    "The **Calendar Booking** agent (coming soon) will find availability and book meetings automatically. For now you can set up **Lead Capture** or the **Shopify Agent**. Want to start?",

  default:
    "Good question! AgentCloud currently offers **10 AI agents**:\n\n• **Available now** — Shopify Agent, Lead Capture, Email Manager, Support Agent, Copywriter\n• **Coming soon** — SEO Content, Business Manager, Personal Assistant, Calendar Booking, Finance Manager\n\nWhat area would you like to explore?",
};

export const CHAT_RESPONSES_IT: Record<string, string> = {
  greeting:
    "Ciao! Sono l'assistente AI di AgentCloud. Oggi la piattaforma offre **10 agenti AI** — 5 disponibili ora (**Shopify Agent**, **Lead Capture**, **Email Manager**, **Support Agent**, **Copywriter**) e 5 in arrivo (**SEO Content**, **Business Manager**, **Personal Assistant**, **Calendar Booking**, **Finance Manager**). Cosa vuoi configurare?",

  email:
    "Per le tue email e i contatti, l'agente **Email Manager** smista la casella, scrive bozze di risposta da approvare e traccia ogni impegno e scadenza. Vuoi attivarlo?",

  support:
    "L'**Support Agent** risponde a ogni ticket 24/7 usando la tua knowledge base e inoltra all'umano solo ciò che serve davvero. Vuoi configurarlo?",

  leads:
    "Posso potenziare la tua acquisizione lead con l'agente **Lead Capture**:\n\n• **Cattura automatica** — Raccoglie i contatti dai moduli e dal sito\n• **Arricchimento** — Aggiunge il contesto sui prospect\n• **Notifiche** — Avvisa le vendite con i passi successivi\n\nPronto a lanciare il tuo agente lead capture?",

  finance:
    "L'**Shopify Agent** può verificare ordini, vendite e pagamenti del tuo store. Vuoi configurarlo?",

  social:
    "Oggi la piattaforma si concentra su **Shopify, lead capture, email, supporto e contenuti**. Vuoi invece automatizzare l'acquisizione dei lead dai tuoi canali?",

  campaigns:
    "Il **Copywriter** scrive landing page, ads ed email che convertono, mentre l'**Shopify Agent** gestisce lo store. Vuoi configurarne uno?",

  data:
    "Gli agenti **Lead Capture** e **Shopify** raccolgono e strutturano i dati di lead e ordini. Vuoi configurarli?",

  scheduling:
    "L'agente **Calendar Booking** (in arrivo) troverà la disponibilità e prenoterà le riunioni in automatico. Per ora puoi configurare **Lead Capture** o l'**Shopify Agent**. Vuoi iniziare?",

  default:
    "Ottima domanda! AgentCloud offre oggi **10 agenti AI**:\n\n• **Disponibili ora** — Shopify Agent, Lead Capture, Email Manager, Support Agent, Copywriter\n• **In arrivo** — SEO Content, Business Manager, Personal Assistant, Calendar Booking, Finance Manager\n\nQuale area vuoi esplorare?",
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