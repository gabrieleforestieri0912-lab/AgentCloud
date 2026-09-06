/**
 * Italian overlays for the agent catalog.
 *
 * The canonical agent content lives in `src/lib/agents.ts` (English). These
 * entries provide the Italian version of the fields shown in the UI, keyed by
 * the agent slug. `localizeAgent()` in `src/lib/agents.ts` overlays them when
 * the active locale is Italian; English uses the data as-is.
 */

export type AgentLocalization = {
  name: string;
  shortName: string;
  category: string;
  badge: string;
  description: string;
  longDescription: string;
  industry: string;
  tasks: string[];
  workflow: string[];
};

export const AGENT_LOCALIZATIONS_IT: Record<string, AgentLocalization> = {
  "email-manager": {
    name: "Email Manager",
    shortName: "Email Manager",
    category: "Business & Operations",
    badge: "Novità",
    description:
      "Metti in ordine la casella, non perdere mai un impegno importante e ricevi un riepilogo quotidiano.",
    longDescription:
      "L'agente Email Manager porta ordine nella tua casella e tiene sotto controllo ogni impegno. Smista i messaggi in arrivo, etichetta e archivia ciò che conta, scrive risposte chiare da approvare e sorveglia scadenze, riunioni e follow-up nascosti nelle conversazioni — trasformandoli in impegni tracciati con promemoria. Riepiloga la giornata in un breve digest, segnala ciò che richiede una decisione e segue ogni follow-up fino a conclusione. Collegato a Gmail, Google Calendar, Outlook e Slack, ti fa risparmiare ore di gestione email ogni settimana: rispondi a ciò che conta e nessun appuntamento importante ti sfugge.",
    industry: "Founder, dirigenti e professionisti",
    tasks: [
      "Smistamento casella",
      "Bozze di risposta",
      "Monitoraggio impegni",
      "Riepilogo email quotidiano",
    ],
    workflow: [
      "Analizza la casella",
      "Smista e archivia",
      "Traccia gli impegni",
      "Consegna il riepilogo",
    ],
  },
  "business-manager": {
    name: "Business Manager",
    shortName: "Business Manager",
    category: "Business & Operations",
    badge: "Consigliato",
    description:
      "Un COO in chat: report, pianificazione e supporto alle decisioni.",
    longDescription:
      "L'agente Business Manager funge da capo di gabinetto per imprenditori e founder. Legge i tuoi dati operativi, redige report dirigenziali, coordina il lavoro tra team e supporta pianificazione e decisioni. Collegato a Google Calendar, Gmail, Sheets e Slack, trasforma fogli sparsi e aggiornamenti di stato in un quadro chiaro del business — così i leader hanno numeri e narrativa per decidere più in fretta e far crescere l'azienda senza lasciare nulla per strada.",
    industry: "PMI e founder",
    tasks: [
      "Report dirigenziali",
      "Analisi dati operativi",
      "Coordinamento trasversale",
      "Raccomandazioni strategiche",
    ],
    workflow: [
      "Sincronizza Sheets+Calendar",
      "Analizza KPI",
      "Crea deck 10 slide",
      "Proponi 3 azioni",
    ],
  },
  "seo-agent": {
    name: "Agente Contenuti SEO",
    shortName: "Agente SEO",
    category: "Marketing & Sales",
    badge: "Novità",
    description:
      "Scrivi articoli strutturati e orientati alle keyword che si posizionano davvero.",
    longDescription:
      "L'agente contenuti SEO ricerca gli argomenti, analizza per cosa si posizionano i competitor e produce articoli completi e ottimizzati per le keyword. Pianifica l'architettura H1/H2, inserisce le keyword target in modo naturale e aggiunge automaticamente meta description e link interni. Collegato ad Ahrefs, Google Search Console, WordPress e Notion, aiuta il team contenuti a pubblicare di più, posizionarsi prima e convertire meglio — con ogni pezzo mirato a una reale intenzione di ricerca.",
    industry: "Team content marketing",
    tasks: [
      "Ricerca keyword",
      "Analisi competitor",
      "Scrittura articoli",
      "Ottimizzazione meta",
    ],
    workflow: [
      "Trova le keyword",
      "Studia i competitor",
      "Scrivi l'articolo",
      "Ottimizza i meta dati",
    ],
  },
  "personal-assistant": {
    name: "Assistente Personale AI",
    shortName: "Assistente Personale",
    category: "Business & Operations",
    badge: "Consigliato",
    description:
      "Pianifica la giornata, svuota la lista attività e recupera ore ogni settimana.",
    longDescription:
      "L'assistente personale organizza la tua giornata come farebbe un grande supporto. Pianifica il calendario, gestisce le liste di attività, riassume note e documenti, blocca tempo per il lavoro profondo e suggerisce in modo proattivo cosa affrontare per primo. Collegato a Google Calendar, Gmail, Notion e Slack, tiene sulla giusta rotta professionisti e solopreneur impegnati — aiutandoti a recuperare diverse ore a settimana togliendoti le piccole logiche operative della giornata.",
    industry: "Professionisti e solopreneur",
    tasks: [
      "Pianificazione giornata",
      "Gestione attività",
      "Ricerca e sintesi",
      "Bozze e documenti",
    ],
    workflow: [
      "Ascolta la richiesta",
      "Organizza i compiti",
      "Esegui con gli strumenti",
      "Proponi i prossimi passi",
    ],
  },
  "calendar-booking": {
    name: "Agente Prenotazioni",
    shortName: "Calendario",
    category: "Business & Operations",
    badge: "Popolare",
    description:
      "Trova gli orari liberi, prenota le riunioni e invia gli inviti in automatico.",
    longDescription:
      "L'agente Prenotazioni gestisce la pianificazione end-to-end. Cerca la disponibilità sui calendari dei partecipanti, propone gli slot migliori, prenota la riunione, conferma i presenti e allega il link video. Collegato a Google Calendar, Outlook, Zoom e Slack, elimina l'interminabile botta e risposta 'quando ti va?' — un vero risparmio di tempo per vendite consulenziali, servizi e qualsiasi team che vive di chiamate prenotate.",
    industry: "Team scheduling e riunioni",
    tasks: [
      "Cerca disponibilità",
      "Proposta slot",
      "Prenotazione eventi",
      "Link video automatici",
    ],
    workflow: [
      "Controlla la disponibilità",
      "Proponi gli slot",
      "Conferma i dettagli",
      "Prenota e conferma",
    ],
  },
  "lead-capture": {
    name: "Agente Lead Capture",
    shortName: "Lead Capture",
    category: "Marketing & Sales",
    badge: "Consigliato",
    description:
      "Cattura ogni lead, arricchiscilo e avvisa le vendite in pochi secondi.",
    longDescription:
      "L'agente Lead Capture non lascia mai scappare un prospect. Raccoglie i dettagli da form, chat e sito, arricchisce i contatti con dati firmografici e contestuali e avvisa il team vendite con un alert su Slack e il prossimo passo consigliato. Collegato a Slack, HubSpot, Salesforce e Zapier, trasforma le tue fonti di lead in una pipeline sempre attiva — così le vendite reagiscono subito e nessuna richiesta in entrata resta senza risposta.",
    industry: "Vendite e lead generation",
    tasks: [
      "Cattura lead",
      "Arricchimento contatti",
      "Notifica al team vendite",
      "Riepilogo lead",
    ],
    workflow: [
      "Identifica il lead",
      "Valida i dati",
      "Arricchisci il contatto",
      "Notifica le vendite",
    ],
  },
  "support-agent": {
    name: "Agente Supporto",
    shortName: "Support Agent",
    category: "Customer Service",
    badge: "Popolare",
    description:
      "Rispondi a ogni ticket 24/7 ed escalada solo ciò che richiede un umano.",
    longDescription:
      "L'agente Supporto risolve i problemi dei tuoi clienti 24 ore su 24. Addestrato sulla tua knowledge base, risponde ai ticket in pochi secondi, scrive risposte accurate, classifica ogni problema ed escalada al tuo team umano solo quando il caso richiede davvero una persona. Collegato a Zendesk, Intercom, Help Scout e Slack, riduce nettamente il tempo di prima risposta e il backlog dei ticket — permettendoti un supporto rapido e costante senza aumentare l'organico.",
    industry: "Team assistenza clienti",
    tasks: [
      "Risposte 24/7",
      "Classificazione ticket",
      "Bozze di risposta",
      "Escalation casi complessi",
    ],
    workflow: [
      "Leggi il ticket",
      "Cerca nella knowledge base",
      "Scrivi la risposta",
      "Escalada se necessario",
    ],
  },
  copywriter: {
    name: "Copywriter",
    shortName: "Copywriter",
    category: "Design & Content",
    badge: "Popolare",
    description:
      "Scrivi copy che convertono su landing, annunci ed email.",
    longDescription:
      "L'agente Copywriter scrive le parole che trasformano i visitatori in clienti. Produce copy adattato alla piattaforma per landing page, annunci, email e UI di prodotto — con più varianti pronte per i test A/B. Integrato con Webflow, WordPress, Mailchimp e Notion, elimina l'attesa del freelance e dei brief, dando al team marketing copy in linea col brand in pochi minuti e la varietà di varianti necessaria per ottimizzare davvero la conversione.",
    industry: "Team marketing e prodotto",
    tasks: [
      "Copy landing",
      "Copy annunci",
      "Copy email",
      "Microcopy UI",
    ],
    workflow: [
      "Analizza il brand",
      "Definisci il tono",
      "Scrivi le varianti",
      "Consegna per i test",
    ],
  },
  "finance-manager": {
    name: "Finance Manager",
    shortName: "Finance Manager",
    category: "E-commerce & Finance",
    badge: "Novità",
    description:
      "Tieni sotto controllo fatture, spese e cash flow — senza il caos dei fogli di calcolo.",
    longDescription:
      "L'agente Finance Manager tiene in ordine i numeri della tua azienda. Concilia entrate e uscite, prepara fatture chiare e messaggi di sollecito di pagamento da approvare, e trasforma i dati sparsi in un briefing del cash flow in linguaggio semplice: cosa è entrato, cosa è uscito, cosa è in scadenza e cosa prioritizzare. Segnala le anomalie invece di nasconderle, si collega a Stripe, QuickBooks, Google Sheets e Slack, e non inventa mai cifre — così founder e piccoli team hanno una panoramica finanziaria affidabile in pochi minuti invece del caos dei fogli di calcolo.",
    industry: "PMI e founder",
    tasks: [
      "Fatture e pagamenti",
      "Tracciamento spese",
      "Report cash flow",
      "Solleciti di pagamento",
    ],
    workflow: [
      "Concilia i dati",
      "Traccia le spese",
      "Prepara le fatture",
      "Riporta il cash flow",
    ],
  },
  "shopify-agent": {
    name: "Agente Shopify",
    shortName: "Agente Shopify",
    category: "E-commerce & Finance",
    badge: "Consigliato",
    description:
      "Cerca i prodotti, crea link al carrello e controlla gli ordini del tuo store.",
    longDescription:
      "L'agente Shopify gestisce il commerce conversazionale del tuo negozio. Cerca nel catalogo, costruisce link diretti al carrello per specifiche varianti, controlla lo stato degli ordini in modo sicuro con numero ordine ed email e segnala la disponibilità in pochi secondi. Collegato al tuo store Shopify, a Stripe, Slack ed email, dà allo shopper la risposta e il passo successivo all'istante — trasformando una domanda sui prodotti in un link d'acquisto a tutti gli effetti invece che in una conversazione senza sbocco.",
    industry: "Negozi Shopify",
    tasks: [
      "Ricerca prodotti",
      "Link carrello",
      "Stato ordini",
      "Sicurezza dati",
    ],
    workflow: [
      "Analizza best seller",
      "Crea 3 prodotti",
      "Configura sconto ESTATE20",
      "Genera link carrello",
    ],
  },
};

import type { Locale } from "./constants";

/**
 * Italian overlay for a catalog agent, or null when not localized.
 * For now only `it` has overrides; other locales fall back to English.
 */
export function getAgentLocalization(
  slug: string,
  locale: Locale,
): AgentLocalization | null {
  if (locale !== "it") return null;
  return AGENT_LOCALIZATIONS_IT[slug] ?? null;
}

/**
 * Italian display values for the agent `setupTime` field. The canonical
 * catalog stores these in English ("Same day", "1 day", "2 days"); this map
 * translates them so the marketplace, detail, and deploy pages stay in the
 * active language. Unknown values pass through unchanged.
 */
export const SETUP_TIME_IT: Record<string, string> = {
  "Same day": "In giornata",
  "1 day": "1 giorno",
  "2 days": "2 giorni",
};

/** Translate a canonical setup time to the active locale (idempotent). */
export function localizeSetupTime(
  value: string,
  locale: Locale,
): string {
  if (locale !== "it") return value;
  return SETUP_TIME_IT[value] ?? value;
}

/** Localized display name for runtime/registry agents (name + description). */
export function getLocalizedAgentInfo(
  slug: string,
  locale: Locale,
  fallback: { name: string; description: string },
): { name: string; description: string } {
  const localized = getAgentLocalization(slug, locale);
  if (!localized) return fallback;
  return { name: localized.name, description: localized.description };
}
