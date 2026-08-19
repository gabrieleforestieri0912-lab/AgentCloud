/**
 * Shared local chat response engine.
 *
 * Used by both the hero widget (HeroSection) and the full chat page
 * (ChatInterface) as a deterministic fallback when no AI backend
 * (Ollama / Anthropic) is reachable.
 *
 * Kept framework-agnostic so it can be unit tested without React.
 * The platform defaults to Italian; callers pass their active locale
 * to resolve the right language.
 */

export const CHAT_RESPONSES: Record<string, string> = {
  greeting:
    "Hi! I'm your AgentCloud AI. Today I help you with Shopify e-commerce and lead capture. What would you like to set up?",

  email:
    "To handle the emails and contacts coming from your site, the **Lead Capture** agent collects prospects and notifies sales. Want to activate it?",

  support:
    "To answer customer questions about products and orders, the **Shopify Agent** searches the catalog, builds cart links, and checks order status. Want to configure it?",

  leads:
    "I can supercharge your lead capture:\n\n• **Automatic Capture** — Collect contacts from forms and your site\n• **Enrichment** — Add context to prospects\n• **Notifications** — Alert sales with the right next steps\n\nReady to launch your lead capture agent?",

  finance:
    "Right now the platform focuses on **Shopify and lead capture**. If you need payment data, the **Shopify Agent** can check order status. Want to configure it?",

  social:
    "Today the platform is focused on **Shopify and lead capture**. Want to automate capturing leads from your channels instead?",

  campaigns:
    "Right now AgentCloud offers the **Shopify Agent and Lead Capture**. Want to set up lead capture or the e-commerce assistant?",

  data: "To analyze lead or order data, the **Lead Capture** and **Shopify** agents collect and structure the information. Want to configure them?",

  scheduling:
    "Today the platform offers the **Shopify Agent and Lead Capture**. Do you need something for e-commerce or for leads?",

  default:
    "Great question! Today AgentCloud helps you with:\n\n• **Shopify E-commerce** — Search products, build cart links, and check orders\n• **Lead Capture** — Collect and enrich contacts\n\nWhat area would you like to explore?",
};

export const CHAT_RESPONSES_IT: Record<string, string> = {
  greeting:
    "Ciao! Sono l'assistente AI di AgentCloud. Oggi ti aiuto con l'e-commerce Shopify e l'acquisizione lead. Cosa vuoi configurare?",

  email:
    "Per gestire le email e i contatti che arrivano dal sito, l'agente **Lead Capture** raccoglie i prospect e avvisa le vendite. Vuoi attivarlo?",

  support:
    "Per rispondere alle domande dei clienti su prodotti e ordini c'è l'**Agente Shopify**: cerca nel catalogo, crea link al carrello e verifica lo stato degli ordini. Vuoi configurarlo?",

  leads:
    "Posso potenziare la tua acquisizione lead:\n\n• **Cattura automatica** — Raccoglie i contatti dai moduli e dal sito\n• **Arricchimento** — Aggiunge il contesto sui prospect\n• **Notifiche** — Avvisa le vendite con i passi successivi\n\nPronto a lanciare il tuo agente lead capture?",

  finance:
    "Per ora la piattaforma è focalizzata su **Shopify e acquisizione lead**. Se ti servono dati sui pagamenti, l'**Agente Shopify** può verificare lo stato degli ordini. Vuoi configurarlo?",

  social:
    "Oggi la piattaforma si concentra su **Shopify e lead capture**. Vuoi invece automatizzare l'acquisizione dei lead dai tuoi canali?",

  campaigns:
    "Per ora la piattaforma offre **Agente Shopify e Lead Capture**. Vuoi configurare l'acquisizione lead o l'assistente e-commerce?",

  data: "Per analizzare i dati dei lead o degli ordini, l'**Agente Lead Capture** e l'**Agente Shopify** raccolgono e strutturano le informazioni. Vuoi configurarli?",

  scheduling:
    "Oggi la piattaforma offre **Agente Shopify e Lead Capture**. Ti serve qualcosa per l'e-commerce o per i lead?",

  default:
    "Ottima domanda! Oggi AgentCloud ti aiuta con:\n\n• **E-commerce Shopify** — Cerca prodotti, crea link al carrello e controlla gli ordini\n• **Acquisizione lead** — Cattura e arricchisci i contatti\n\nQuale area vuoi esplorare?",
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
