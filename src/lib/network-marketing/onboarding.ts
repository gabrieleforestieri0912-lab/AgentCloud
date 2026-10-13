/**
 * Onboarding guidato del Network Marketing Agent (primo avvio, 6 domande).
 *
 * Le risposte finiscono in `nm_profiles` (una riga per account); i documenti
 * ufficiali caricati al punto 6 finiscono in `nm_knowledge_docs` (RAG).
 * Al termine, la presa visione delle regole di conformità è obbligatoria e
 * viene salvata con data e versione (`rules_accepted_version/at`).
 */

export type OnboardingQuestion = {
  id: string;
  /** Testo mostrato in chat. */
  label: string;
  type: "text" | "choice" | "multi" | "files";
  options?: string[];
  /** Colonna di `nm_profiles` dove finisce la risposta. */
  mapsTo: string;
};

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: "company-role",
    label: "Quale azienda o brand rappresenti e qual è il tuo ruolo?",
    type: "choice",
    options: ["incaricato", "team_leader"],
    mapsTo: "company_name, role",
  },
  {
    id: "products-target",
    label: "Quali sono i tuoi prodotti o servizi principali e chi è il tuo cliente ideale?",
    type: "text",
    mapsTo: "products",
  },
  {
    id: "goal-hours",
    label: "Qual è il tuo obiettivo del mese (clienti, nuovi incaricati, presentazioni) e quante ore a settimana puoi dedicarci?",
    type: "text",
    mapsTo: "monthly_goal",
  },
  {
    id: "channels",
    label: "Quali canali usi per contattare e seguire le persone?",
    type: "multi",
    options: ["Gmail", "WhatsApp", "Instagram", "Facebook", "TikTok", "Telefono"],
    mapsTo: "channels",
  },
  {
    id: "tone-language",
    label: "Che tono preferisci per i messaggi e in che lingua lavoriamo?",
    type: "choice",
    options: ["amichevole", "professionale", "diretto"],
    mapsTo: "tone, language",
  },
  {
    id: "official-docs",
    label:
      "Carica i documenti ufficiali se li hai (catalogo, listino, piano compensi, codice etico, regolamento): li uso come unica fonte per prezzi, compensi e claim.",
    type: "files",
    mapsTo: "nm_knowledge_docs",
  },
];

/** Prezzo proposto con alternativa da valutare (vedi README del prodotto). */
export const PRICING = {
  proposed: { monthly: "€14,99/mese", cents: 1499 },
  alternative: "€9,99 base + add-on team (da valutare)",
} as const;
