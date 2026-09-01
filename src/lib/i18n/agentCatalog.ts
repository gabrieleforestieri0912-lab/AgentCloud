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
  previewPrompt: string;
  previewResult: string;
  example: string;
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
    previewPrompt:
      "Metti in ordine la mia casella e ricordami gli impegni della settimana.",
    previewResult:
      "Ho smistato 42 email in 6 cartelle, segnalato 3 che richiedono la tua risposta e impostato promemoria per 5 impegni della settimana.",
    example:
      "Gestisco 50 email al giorno e riduco i tempi di gestione della casella del 70%.",
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
      "Raccogli i dati",
      "Analizza i KPI",
      "Prepara il report",
      "Proponi le raccomandazioni",
    ],
    previewPrompt: "Prepara il report mensile con i KPI chiave e le raccomandazioni.",
    previewResult:
      "Report pronto: 12 KPI analizzati, 3 raccomandazioni prioritarie e 2 rischi segnalati.",
    example:
      "Ho prodotto 12 report dirigenziali nell'ultimo anno con analisi dei KPI.",
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
    previewPrompt: "Scrivi un articolo SEO sulla gestione dei lead per PMI.",
    previewResult:
      "Articolo da 1.200 parole con 8 keyword, meta description e suggerimenti di link interni.",
    example:
      "Ho scritto 15 articoli SEO che hanno portato +5.000 visitatori organici al mese.",
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
    previewPrompt: "Organizza la mia settimana e prepara i punti chiave delle riunioni.",
    previewResult:
      "Settimana organizzata: 11 attività pianificate e 3 briefing preparati.",
    example:
      "Ho gestito 60 attività e risparmiato 8 ore a settimana al founder.",
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
    previewPrompt: "Trova un orario per una riunione di 30 minuti con il team domani.",
    previewResult:
      "3 slot proposti, riunione prenotata per domani alle 10:00 con link video.",
    example:
      "Ho gestito 200 prenotazioni al mese senza doppie prenotazioni.",
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
    previewPrompt: "Cattura questo lead dal modulo e avvisa il team vendite.",
    previewResult:
      "Lead catturato, contatto arricchito e notifica inviata al canale vendite.",
    example:
      "Ho catturato 340 lead il mese scorso con il 96% di dati validi.",
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
    previewPrompt: "Rispondi a questo ticket sull'accesso al portale.",
    previewResult:
      "Risposta pronta con la procedura di reset, ticket classificato come Accesso.",
    example:
      "Ho risolto l'82% dei ticket in autonomia, in media in 40 secondi.",
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
    previewPrompt: "Scrivi 3 varianti di headline per la landing del lancio.",
    previewResult:
      "3 headline + 3 sottotitoli consegnati, pronti per il test A/B.",
    example:
      "Le mie varianti hanno migliorato la conversione del 19% nel test.",
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
      "Identifica l'intento",
      "Cerca nel catalogo",
      "Costruisci il link",
      "Verifica lo stato",
    ],
    previewPrompt: "Trova le scarpe da running in taglia 42 e crea il link al carrello.",
    previewResult:
      "3 prodotti trovati, link al carrello generato e disponibilità verificata.",
    example:
      "Ho gestito 500 richieste di prodotto con link diretti al checkout.",
  },
};

/**
 * Italian overlay for a catalog agent, or null when not localized.
 */
export function getAgentLocalization(
  slug: string,
  locale: "it" | "en",
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
  locale: "it" | "en",
): string {
  if (locale !== "it") return value;
  return SETUP_TIME_IT[value] ?? value;
}

/** Localized display name for runtime/registry agents (name + description). */
export function getLocalizedAgentInfo(
  slug: string,
  locale: "it" | "en",
  fallback: { name: string; description: string },
): { name: string; description: string } {
  const localized = getAgentLocalization(slug, locale);
  if (!localized) return fallback;
  return { name: localized.name, description: localized.description };
}
