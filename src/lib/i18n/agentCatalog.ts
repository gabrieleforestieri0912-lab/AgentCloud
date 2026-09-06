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
      "Triage completato:\n• Inbox: 42 email → 6 cartelle (Urgenti 3, Newsletter 18, Da archiviare 21)\n• Flagged: 3 email richiedono risposta entro oggi (cliente Acme, fattura #1042, meeting team)\n• Promemoria creati: 5 impegni (Lun 10:00 call Acme, Mar 14:30 review, Mer scadenza fattura, Gio demo, Ven report)\n• Digest inviato: riepilogo mattutino con priorità e scadenze.",
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
      "Sincronizza Sheets+Calendar",
      "Analizza KPI",
      "Crea deck 10 slide",
      "Proponi 3 azioni",
    ],
    previewPrompt: "Prepara il report mensile con i KPI chiave e le raccomandazioni.",
    previewResult:
      "Board deck Q2 pronto (10 slide):\n• Revenue: €128k (+18% QoQ, +32% YoY) — driver: Shopify +18%, Lead +24%\n• Churn: 7% su SMB (vs 4% target) — causa: onboarding lento, fix: check-in a 7gg\n• Pipeline: 42 lead, 18 qualified, CR 23%\n• Rischio: stock esaurimento su bestseller (2/5 SKU <10gg)\n• 3 azioni: 1) Onboarding 7gg, 2) Riordino stock, 3) Upsell su high-fit\n• File: board-deck-Q2-2024.pdf + Sheets aggiornato.",
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
      "Articolo SEO pronto (1.520 parole):\n• H1: Local SEO per ristoranti italiani nel 2024\n• Keywords: 'ristorante vicino a me' (2.1k/mese), 'menu ristorante' (1.4k), 'prenotazione online' (890) + 2 secondarie\n• Meta: 'Scopri come posizionare il tuo ristorante su Google con 5 step...' (152 char)\n• Links: 3 interni (menu, prenotazioni, recensioni)\n• Fonte: Ahrefs + GSC, salvato su WordPress come bozza.",
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
      "Settimana pianificata:\n• 5 task prioritizzati (1. Call Acme P0, 2. Report Q3 P1...)\n• 2 meeting spostati (standup Ven → Lun, 1:1 con Anna annullato)\n• Blocco deep-work: Mer 09:00-11:00\n• Email riepilogo pronta: 'Questa settimana: 5 priorità, 2 rinvii, 1 blocco focus' — da approvare.",
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
      "Disponibilità verificata:\n• Mar 10:00, Mar 15:30, Mer 11:00 (Europe/Rome)\n• Prenotato: Mar 15:30-16:00 'Intro Call — Marco & Anna' con Zoom https://zoom.us/j/123\n• Inviti inviati a marco@acme.it, anna@agentcloud.agency + promemoria 15 min\n• Google Calendar aggiornato, Slack notificato #sales.",
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
      "✅ Lead catturato:\n• Mario Rossi — mario@acme.it — Acme SRL (+39 02 1234) — Interesse: demo Shopify\n• Enrich: CEO, 12 dipendenti, Milano, LinkedIn linkedin.com/in/mariorossi\n• Score: Alto (fit perfetto, intent chiaro)\n• Slack #sales notificato con riepilogo + link HubSpot\n• Follow-up automatico programmato per domani 10:00.",
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
      "Ticket gestiti:\n• #1042 'Accesso portale non funziona' → Risposta inviata: procedura reset password con link + video guida (KB: onboarding.pdf)\n• #1043 'Fattura doppia' → Escalation al team billing con riepilogo cliente + priorità alta\n• #1044 'Info spedizione' → Risposta inviata: tracking #TRK123, consegna ven 12/12, link stato ordine\n• 15 ticket risolti, 2 in attesa umana, tempo medio 42s.",
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
      "✍️ Copy pronto (ricerca su 3 competitor + web_search):\n• Variante A (Benefit): 'Raddoppia le vendite senza assumere — agenti AI che lavorano 24/7'\n• Variante B (Social proof): 'Già 2.3k team usano AgentCloud per convertire di più'\n• Variante C (Urgency): 'Lancia oggi, vendi domani — setup in giornata'\n• CTA: 'Attiva ora →', 'Prova gratis', 'Vedi demo'\n• Salvato in copy-landing-pricing-2024-12-06.md con scoring 9/8/7 e vincitore consigliato A.",
    example:
      "Le mie varianti hanno migliorato la conversione del 19% nel test.",
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
    previewPrompt:
      "Riepiloga il cash flow di questo mese e segnala le fatture non pagate.",
    previewResult:
      "Cash flow riconciliato (30gg):\n• Entrate: €24.320 (Stripe) — Uscite: €18.410 — Netto: +€5.910\n• 42 transazioni verificate, 2 anomalie flaggate (doppio addebito Stripe #4821)\n• Fatture insoluti: 6 (3 >30gg: Acme €1.200, Beta €890, Gamma €450) — solleciti pronti\n• Priorità settimana prossima: 1) Sollecita Acme, 2) Rinegozia fornitore X, 3) Prepara forecast Q4\n• Report salvato: cashflow-2024-12-06.pdf",
    example:
      "Ogni settimana riconcilio oltre 100 transazioni e preparo il report del cash flow prima delle 9:00.",
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
    previewPrompt: "Trova le scarpe da running in taglia 42 e crea il link al carrello.",
    previewResult:
      "Store aggiornato — Ricerca 'scarpe running 42':\n• Nike Air Zoom Pegasus 42 — €129,90 — ID: gid://shopify/ProductVariant/445901234 — Cart: /cart/445901234:1 — Disponibile\n• Adidas Ultraboost 42 — €149,90 — Cart: /cart/445901235:1 — Disponibile\n• Asics Gel Kayano 42 — €119,90 — Cart: /cart/445901236:1 — 3 rimasti\n• Link carrello generato per Nike (scelta top) e verificata disponibilità in tempo reale.",
    example:
      "Ho gestito 500 richieste di prodotto con link diretti al checkout.",
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
