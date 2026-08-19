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
  "executive-assistant": {
    name: "Assistente Esecutivo",
    shortName: "Assistente Esecutivo",
    category: "Business & Operations",
    badge: "Popolare",
    description: "Il tuo braccio destro AI per calendario, email, riunioni e follow-up.",
    longDescription:
      "Un assistente esecutivo che smista la casella, pianifica riunioni tra fusi orari, scrive risposte, prepara briefing quotidiani e tiene in ordine le tue azioni.",
    industry: "Founder e dirigenti",
    tasks: [
      "Smistamento casella",
      "Pianificazione calendario",
      "Briefing quotidiani",
      "Monitoraggio azioni",
    ],
    workflow: [
      "Analizza la casella",
      "Prioritizza i messaggi",
      "Scrivi le risposte",
      "Pianifica le riunioni",
    ],
    previewPrompt: "Organizza la mia giornata e prepara i briefing per le riunioni di oggi.",
    previewResult:
      "Ho pianificato 3 riunioni, preparato 2 briefing e smistato 14 email: 6 prioritarie.",
    example:
      "Ho gestito 45 email, pianificato 8 riunioni e preparato 5 briefing prima delle 9:00.",
  },
  "project-manager": {
    name: "Project Manager",
    shortName: "Project Manager",
    category: "Business & Operations",
    badge: "Popolare",
    description: "Trasforma gli obiettivi in traguardi e tiene il team allineato.",
    longDescription:
      "Un agente project manager che trasforma gli obiettivi in traguardi, assegna i responsabili, traccia i blocchi e avvisa le persone giuste quando qualcosa rischia di slittare.",
    industry: "Team operations e delivery",
    tasks: [
      "Pianificazione traguardi",
      "Assegnazione compiti",
      "Gestione blocchi",
      "Report di avanzamento",
    ],
    workflow: [
      "Analizza gli obiettivi",
      "Suddividi in traguardi",
      "Assegna i responsabili",
      "Traccia e avvisa",
    ],
    previewPrompt: "Pianifica il lancio del nuovo prodotto in traguardi settimanali.",
    previewResult:
      "6 traguardi creati con responsabili assegnati e 2 rischi segnalati al team.",
    example:
      "Ho gestito 12 progetti in parallelo, mantenendo il 94% delle scadenze rispettate.",
  },
  "meeting-assistant": {
    name: "Assistente Riunioni",
    shortName: "Assistente Riunioni",
    category: "Business & Operations",
    badge: "Novità",
    description: "Partecipa alle call, trascrive e invia il riepilogo a tutti.",
    longDescription:
      "Un assistente riunioni che partecipa alle tue call, trascrive la conversazione, estrae decisioni e azioni e invia un riepilogo strutturato a ogni partecipante.",
    industry: "Team customer-facing e interni",
    tasks: [
      "Trascrizione live",
      "Estrazione decisioni",
      "Piano di azioni",
      "Invio riepilogo",
    ],
    workflow: [
      "Entra nella riunione",
      "Trascrivi la conversazione",
      "Estrai decisioni e azioni",
      "Invia il riepilogo",
    ],
    previewPrompt: "Trascrivi la riunione di oggi ed estrai le azioni assegnate.",
    previewResult:
      "Riepilogo inviato: 4 decisioni, 7 azioni assegnate, 2 follow-up programmati.",
    example:
      "Ho trascritto 18 riunioni questo mese e inviato riepiloghi con un'accuratezza del 99%.",
  },
  "crm-assistant": {
    name: "Assistente CRM",
    shortName: "Assistente CRM",
    category: "Business & Operations",
    badge: "Consigliato",
    description: "Registra le attività, arricchisce i contatti e aggiorna le trattative.",
    longDescription:
      "Un assistente CRM che registra automaticamente chiamate ed email, arricchisce i contatti, segnala le trattative ferme e dice ai tuoi commerciali cosa fare dopo per chiudere più ricavi.",
    industry: "Team vendite e account",
    tasks: [
      "Registrazione automatica",
      "Arricchimento contatti",
      "Allerta trattative ferme",
      "Passi successivi suggeriti",
    ],
    workflow: [
      "Analizza le interazioni",
      "Arricchisci i contatti",
      "Valuta lo stato delle trattative",
      "Suggerisci la prossima azione",
    ],
    previewPrompt: "Aggiorna il CRM con la chiamata di oggi con Sara e proponi il prossimo passo.",
    previewResult:
      "Trattativa aggiornata, 3 contatti arricchiti e 2 trattative ferme segnalate.",
    example:
      "Ho registrato 120 interazioni e arricchito 85 contatti in una settimana.",
  },
  "customer-success": {
    name: "Customer Success Manager",
    shortName: "Customer Success",
    category: "Business & Operations",
    badge: "Popolare",
    description: "Monitora l'utilizzo e interviene prima che un account vada perso.",
    longDescription:
      "Un agente customer success che monitora l'utilizzo del prodotto, attiva i percorsi di onboarding, esegue i check-in NPS e allerta il team quando un account rischia di andarsene.",
    industry: "B2B SaaS e servizi",
    tasks: [
      "Flussi di onboarding",
      "Check-in NPS",
      "Allerta rischio churn",
      "Salute account",
    ],
    workflow: [
      "Monitora l'utilizzo",
      "Identifica i segnali di rischio",
      "Attiva le sequenze giuste",
      "Allerta il team",
    ],
    previewPrompt: "Analizza lo stato di salute degli account e segnala quelli a rischio.",
    previewResult:
      "2 account a rischio individuati, 5 sequenze di onboarding attivate automaticamente.",
    example:
      "Ho ridotto il churn del 18% nel trimestre grazie alle allerte precoci.",
  },
  "business-manager": {
    name: "Business Manager",
    shortName: "Business Manager",
    category: "Business & Operations",
    badge: "Consigliato",
    description: "Legge i tuoi dati operativi e produce report dirigenziali.",
    longDescription:
      "Un agente business manager che legge i tuoi dati operativi, redige report dirigenziali, coordina il lavoro tra funzioni e ti aiuta a prendere decisioni più veloci e migliori.",
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
  "marketing-strategist": {
    name: "Marketing Strategist",
    shortName: "Marketing Strategist",
    category: "Marketing & Sales",
    badge: "Popolare",
    description: "Trasforma gli obiettivi in piani di canale e calendari editoriali.",
    longDescription:
      "Un agente marketing strategist che trasforma gli obiettivi di business in piani di canale, calendari editoriali, allocazioni di budget e revisioni settimanali delle performance.",
    industry: "Growth marketer",
    tasks: [
      "Pianificazione campagne",
      "Calendario editoriale",
      "Allocazione budget",
      "Revisione performance",
    ],
    workflow: [
      "Analizza gli obiettivi",
      "Definisci i canali",
      "Pianifica i contenuti",
      "Misura e ottimizza",
    ],
    previewPrompt: "Crea un piano marketing trimestrale per il lancio del nuovo prodotto.",
    previewResult:
      "Piano pronto: 4 canali, 12 campagne e budget allocato per ogni iniziativa.",
    example:
      "Ho pianificato campagne su 6 canali aumentando il ROI del 34% in un trimestre.",
  },
  "seo-specialist": {
    name: "SEO Specialist",
    shortName: "SEO Specialist",
    category: "Marketing & Sales",
    badge: "Consigliato",
    description: "Ricerca keyword, analizza i competitor e ottimizza i contenuti.",
    longDescription:
      "Uno specialista SEO che esegue la ricerca delle keyword, controlla i contenuti esistenti, analizza i competitor e produce articoli con struttura corretta, meta dati e link interni.",
    industry: "Team contenuti",
    tasks: [
      "Ricerca keyword",
      "Audit contenuti",
      "Analisi competitor",
      "Ottimizzazione on-page",
    ],
    workflow: [
      "Ricerca le keyword",
      "Analizza i competitor",
      "Struttura il contenuto",
      "Ottimizza on-page",
    ],
    previewPrompt: "Audit della pagina prodotti e proposta di keyword per migliorare il ranking.",
    previewResult:
      "24 keyword individuate, 5 pagine da ottimizzare e meta tag riscritti.",
    example:
      "Ho portato 3 keyword in top 10 e aumentato il traffico organico del 41%.",
  },
  "seo-agent": {
    name: "Agente Contenuti SEO",
    shortName: "Agente SEO",
    category: "Marketing & Sales",
    badge: "Novità",
    description: "Scrive contenuti SEO con ricerca keyword e analisi dei competitor.",
    longDescription:
      "Un agente contenuti SEO che analizza le opportunità di keyword, ispeziona i competitor, scrive articoli strutturati e aggiunge i meta dati perché i tuoi contenuti indicizzino e convertano.",
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
    description: "Gestisce liste di attività, riunioni, note e ricerche.",
    longDescription:
      "Un assistente personale che gestisce le liste di attività, pianifica le riunioni, riassume le note e rende la tua giornata più efficiente con suggerimenti proattivi.",
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
  "google-ads-expert": {
    name: "Esperto Google Ads",
    shortName: "Google Ads Expert",
    category: "Marketing & Sales",
    badge: "Popolare",
    description: "Progetta campagne, scrive gli annunci e ottimizza il budget.",
    longDescription:
      "Un esperto Google Ads che progetta la struttura delle campagne, scrive gli annunci responsive, sceglie keyword e negative e consiglia spostamenti di budget in base alle performance.",
    industry: "Team performance marketing",
    tasks: [
      "Struttura campagne",
      "Scrittura annunci",
      "Ricerca keyword",
      "Ottimizzazione budget",
    ],
    workflow: [
      "Analizza l'account",
      "Progetta le campagne",
      "Scrivi gli annunci",
      "Ottimizza il budget",
    ],
    previewPrompt: "Progetta una campagna Google Ads per lead B2B con budget di 2.000€.",
    previewResult:
      "3 gruppi di annunci, 12 varianti di testo e piano di keyword con negative.",
    example:
      "Ho ridotto il costo per lead del 27% riorganizzando le campagne.",
  },
  "social-media-manager": {
    name: "Social Media Manager",
    shortName: "Social Media Manager",
    category: "Marketing & Sales",
    badge: "Consigliato",
    description: "Costruisce il calendario e programma i post al momento giusto.",
    longDescription:
      "Un social media manager che costruisce un calendario di contenuti multicanale, scrive copy adatti a ogni piattaforma, suggerisce gli hashtag e programma i post nei momenti migliori.",
    industry: "Brand e creator",
    tasks: [
      "Calendario contenuti",
      "Copy per piattaforma",
      "Suggerimento hashtag",
      "Pianificazione post",
    ],
    workflow: [
      "Definisci la strategia",
      "Crea i contenuti",
      "Adatta alle piattaforme",
      "Programma la pubblicazione",
    ],
    previewPrompt: "Crea un mese di contenuti social per il lancio del prodotto.",
    previewResult:
      "20 post pianificati su 4 piattaforme con copy e hashtag per ciascuno.",
    example:
      "Ho gestito 6 account e fatto crescere il pubblico del 23% in due mesi.",
  },
  "cold-email-writer": {
    name: "Cold Email Writer",
    shortName: "Cold Email Writer",
    category: "Marketing & Sales",
    badge: "Novità",
    description: "Ricerca i prospect, personalizza gli oggetti e costruisce i follow-up.",
    longDescription:
      "Un redattore di cold email che ricerca ogni prospect, personalizza oggetto e apertura, costruisce sequenze di follow-up in più passaggi e adatta il tono alla tua buyer persona.",
    industry: "Team vendite B2B",
    tasks: [
      "Ricerca prospect",
      "Personalizzazione oggetto",
      "Sequenze follow-up",
      "Adattamento tono",
    ],
    workflow: [
      "Ricerca il prospect",
      "Personalizza il messaggio",
      "Costruisci la sequenza",
      "Adatta il tono",
    ],
    previewPrompt: "Scrivi una cold email per un CFO con oggetto personalizzato.",
    previewResult:
      "Email pronta con oggetto personalizzato e sequenza di 4 follow-up.",
    example:
      "Ho scritto sequenze con tasso di risposta del 31% in media.",
  },
  "lead-qualification": {
    name: "Agente Qualificazione Lead",
    shortName: "Qualificazione Lead",
    category: "Marketing & Sales",
    badge: "Consigliato",
    description: "Arricchisce i lead, li valuta e prenota riunioni per le vendite.",
    longDescription:
      "Un agente di qualificazione lead che arricchisce i lead in entrata, li valuta su fit e intento, fa le domande di qualifica e prenota le riunioni per il tuo team vendite.",
    industry: "Team vendite inbound",
    tasks: [
      "Arricchimento lead",
      "Scoring fit/intento",
      "Domande di qualifica",
      "Prenotazione riunioni",
    ],
    workflow: [
      "Arricchisci il lead",
      "Valuta fit e intento",
      "Qualifica con le domande",
      "Prenota la riunione",
    ],
    previewPrompt: "Qualifica questo nuovo lead e proponi una riunione se è idoneo.",
    previewResult:
      "Lead qualificato con score 82/100: riunione prenotata per domani.",
    example:
      "Ho qualificato 90 lead al mese e aumentato il tasso di conversione del 25%.",
  },
  "calendar-booking": {
    name: "Agente Prenotazioni",
    shortName: "Calendario",
    category: "Business & Operations",
    badge: "Popolare",
    description: "Cerca la disponibilità e prenota riunioni sul calendario.",
    longDescription:
      "Un agente di prenotazione che cerca la disponibilità, propone gli slot migliori e pianifica gli eventi con partecipanti e link video.",
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
    description: "Cattura i lead, arricchisce i contatti e avvisa le vendite.",
    longDescription:
      "Un agente lead capture che raccoglie i dettagli dei prospect, arricchisce i contatti e avvisa il team vendite con il giusto contesto.",
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
    description: "Risponde ai ticket in secondi e passa i casi complessi agli umani.",
    longDescription:
      "Un agente supporto addestrato sulla tua knowledge base che risponde ai ticket in pochi secondi, scrive le risposte, classifica i problemi ed escalada i casi complessi al tuo team umano.",
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
  "complaint-manager": {
    name: "Gestore Reclami",
    shortName: "Complaint Manager",
    category: "Customer Service",
    badge: "Novità",
    description: "Rileva il sentiment, prioritizza e attiva la retention giusta.",
    longDescription:
      "Un gestore reclami che rileva il sentiment negativo, dà priorità ai casi urgenti, scrive risposte empatiche e attiva il piano di retention corretto in base al valore del cliente.",
    industry: "Supporto e customer success",
    tasks: [
      "Rilevamento sentiment",
      "Priorità casi urgenti",
      "Risposte empatiche",
      "Piani di retention",
    ],
    workflow: [
      "Analizza il sentiment",
      "Prioritizza i casi",
      "Scrivi la risposta",
      "Attiva la retention",
    ],
    previewPrompt: "Gestisci questo reclamo urgente di un cliente di alto valore.",
    previewResult:
      "Reclamo prioritizzato, risposta empatica inviata e piano di retention attivato.",
    example:
      "Ho recuperato il 64% dei clienti a rischio con interventi tempestivi.",
  },
  "fullstack-developer": {
    name: "Sviluppatore Full Stack",
    shortName: "Full Stack Dev",
    category: "Development",
    badge: "Popolare",
    description: "Crea app, componenti, API e test — in giorni, non settimane.",
    longDescription:
      "Uno sviluppatore full stack che avvia progetti Next.js, React e Node, genera componenti, costruisce API CRUD e scrive i test, così il tuo team rilascia in giorni, non settimane.",
    industry: "Team engineering",
    tasks: [
      "Scaffolding app",
      "Generazione componenti",
      "API CRUD",
      "Suite di test",
    ],
    workflow: [
      "Analizza il requisito",
      "Scaffolda il progetto",
      "Costruisci le feature",
      "Scrivi i test",
    ],
    previewPrompt: "Crea un modulo CRUD per la gestione clienti in Next.js.",
    previewResult:
      "Modulo completo: API, UI e 12 test passati in un'unica sessione.",
    example:
      "Ho consegnato 4 progetti completi in un mese con test inclusi.",
  },
  "api-integration": {
    name: "Esperto Integrazioni API",
    shortName: "API Integration",
    category: "Development",
    badge: "Consigliato",
    description: "Progetta connettori, gestisce OAuth e documenta tutto.",
    longDescription:
      "Un esperto di integrazioni API che progetta e costruisce connettori, gestisce i flussi OAuth, configura i webhook, scrive retry e gestione errori e tiene tutto documentato.",
    industry: "Team engineering e ops",
    tasks: [
      "Progettazione connettori",
      "Flussi OAuth",
      "Configurazione webhook",
      "Documentazione",
    ],
    workflow: [
      "Studia l'API",
      "Progetta il connettore",
      "Implementa retry ed errori",
      "Documenta l'integrazione",
    ],
    previewPrompt: "Integra il servizio di pagamento con webhook e retry.",
    previewResult:
      "Connettore completo con OAuth, webhook verificato e documentazione pronta.",
    example:
      "Ho costruito 7 integrazioni in un trimestre con il 100% di test verdi.",
  },
  "devops-engineer": {
    name: "Ingegnere DevOps",
    shortName: "DevOps Engineer",
    category: "Development",
    badge: "Popolare",
    description: "Provisiona infrastruttura, CI/CD e monitoraggio.",
    longDescription:
      "Un ingegnere DevOps che provisiona l'infrastruttura, scrive pipeline GitHub Actions, containerizza le app con Docker e aggiunge monitoraggio e alerting.",
    industry: "Team platform e SRE",
    tasks: [
      "Pipeline CI/CD",
      "Containerizzazione Docker",
      "Infrastruttura cloud",
      "Monitoraggio e alert",
    ],
    workflow: [
      "Analizza l'infrastruttura",
      "Scrivi la pipeline",
      "Containerizza l'app",
      "Aggiungi il monitoring",
    ],
    previewPrompt: "Imposta una pipeline CI/CD con Docker per l'app web.",
    previewResult:
      "Pipeline CI/CD configurata, immagine Docker ottimizzata e alert attivi.",
    example:
      "Ho ridotto il tempo di deploy da 45 minuti a 6 minuti.",
  },
  "qa-tester": {
    name: "QA Tester",
    shortName: "QA Tester",
    category: "Development",
    badge: "Consigliato",
    description: "Genera piani di test e scrive test automatici prima del rilascio.",
    longDescription:
      "Un QA tester che genera piani di test, scrive test automatici (unit, integration, e2e), riproduce i bug dai report e fa triage dei problemi prima che vadano in produzione.",
    industry: "Team engineering",
    tasks: [
      "Piani di test",
      "Test automatici",
      "Riproduzione bug",
      "Triage problemi",
    ],
    workflow: [
      "Analizza la feature",
      "Scrivi il piano di test",
      "Implementa i test",
      "Riporta i risultati",
    ],
    previewPrompt: "Scrivi i test e2e per il flusso di checkout.",
    previewResult:
      "8 test e2e scritti e passati, con 2 bug trovati e documentati.",
    example:
      "Ho coperto il 90% delle feature critiche con test automatici.",
  },
  "prompt-engineer": {
    name: "Prompt Engineer",
    shortName: "Prompt Engineer",
    category: "AI & Data",
    badge: "Novità",
    description: "Rende i tuoi prompt più affidabili, economici e deterministici.",
    longDescription:
      "Un prompt engineer che riscrive i tuoi prompt per renderli più affidabili, economici e deterministici, con suite di valutazione per misurare i miglioramenti nel tempo.",
    industry: "Team AI e prodotto",
    tasks: [
      "Riscrittura prompt",
      "Ottimizzazione costi",
      "Suite di valutazione",
      "Riduzione allucinazioni",
    ],
    workflow: [
      "Analizza il prompt",
      "Identifica i problemi",
      "Riscrivi e ottimizza",
      "Misura con le eval",
    ],
    previewPrompt: "Ottimizza questo prompt per ridurre i costi e gli errori.",
    previewResult:
      "Prompt riscritto: -38% di costi e +15% di accuratezza nelle eval.",
    example:
      "Ho ottimizzato 30 prompt riducendo i costi del 40% mantenendo la qualità.",
  },
  "ai-automation": {
    name: "AI Automation Builder",
    shortName: "AI Automation",
    category: "AI & Data",
    badge: "Popolare",
    description: "Trasforma una descrizione in un'automazione pronta per la produzione.",
    longDescription:
      "Un builder di automazioni AI che trasforma la descrizione di un workflow in un'automazione pronta per la produzione, sceglie gli strumenti giusti e gestisce errori, retry e logging.",
    industry: "Ops e AI builder",
    tasks: [
      "Progettazione workflow",
      "Scelta strumenti",
      "Gestione errori",
      "Logging e retry",
    ],
    workflow: [
      "Analizza il workflow",
      "Progetta l'automazione",
      "Collega gli strumenti",
      "Gestisci errori e retry",
    ],
    previewPrompt: "Automatizza il processo di onboarding dei nuovi clienti.",
    previewResult:
      "Automazione pronta con 5 passaggi, gestione errori e log completi.",
    example:
      "Ho costruito 8 automazioni che hanno risparmiato 40 ore a settimana.",
  },
  "data-analyst": {
    name: "Data Analyst",
    shortName: "Data Analyst",
    category: "AI & Data",
    badge: "Consigliato",
    description: "Interroga il warehouse, crea dashboard e report esecutivi.",
    longDescription:
      "Un data analyst che interroga il tuo warehouse, costruisce modelli SQL, crea dashboard e scrive riepiloghi executive su ciò che sta accadendo nel business.",
    industry: "Team dati e ops",
    tasks: [
      "Query SQL",
      "Modelli dati",
      "Dashboard",
      "Riepiloghi executive",
    ],
    workflow: [
      "Identifica la domanda",
      "Interroga i dati",
      "Costruisci le metriche",
      "Scrivi il riepilogo",
    ],
    previewPrompt: "Analizza le vendite del trimestre e prepara un riepilogo executive.",
    previewResult:
      "Riepilogo pronto: 14 KPI analizzati con trend e 3 insight chiave.",
    example:
      "Ho automatizzato 6 report mensili risparmiando 12 ore di lavoro manuale.",
  },
  copywriter: {
    name: "Copywriter",
    shortName: "Copywriter",
    category: "Design & Content",
    badge: "Popolare",
    description: "Copy per landing, ads, email e UI con varianti per gli A/B test.",
    longDescription:
      "Un copywriter che produce copy adatti alla piattaforma per landing page, annunci, email e UI di prodotto, con più varianti per i test A/B.",
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
  "blog-writer": {
    name: "Blog Writer",
    shortName: "Blog Writer",
    category: "Design & Content",
    badge: "Consigliato",
    description: "Ricerca, delinea e scrive articoli long-form con fonti.",
    longDescription:
      "Un blog writer che ricerca il tema, delinea l'articolo, scrive contenuti long-form con fonti e produce meta dati SEO e snippet social.",
    industry: "Team contenuti e solopreneur",
    tasks: [
      "Ricerca del tema",
      "Struttura articolo",
      "Scrittura long-form",
      "SEO e snippet",
    ],
    workflow: [
      "Ricerca il tema",
      "Delinea l'articolo",
      "Scrivi con le fonti",
      "Aggiungi i meta dati",
    ],
    previewPrompt: "Scrivi un articolo long-form sul futuro dell'automazione AI.",
    previewResult:
      "Articolo da 2.000 parole con 8 fonti e meta dati SEO completi.",
    example:
      "Ho pubblicato 20 articoli che hanno raddoppiato il traffico organico.",
  },
  "ui-designer": {
    name: "UI Designer",
    shortName: "UI Designer",
    category: "Design & Content",
    badge: "Novità",
    description: "Genera mockup, design token e specifiche per l'engineering.",
    longDescription:
      "Un UI designer che produce mockup, suggerisce design token, costruisce specifiche dei componenti e scrive note di consegna per l'engineering.",
    industry: "Team prodotto",
    tasks: [
      "Mockup",
      "Design token",
      "Specifiche componenti",
      "Note di consegna",
    ],
    workflow: [
      "Analizza i requisiti",
      "Disegna i mockup",
      "Definisci i token",
      "Scrivi le specifiche",
    ],
    previewPrompt: "Progetta la UI del nuovo dashboard con i design token.",
    previewResult:
      "3 mockup consegnati con 18 design token e specifiche per 6 componenti.",
    example:
      "Ho consegnato il sistema di design che ha accelerato lo sviluppo del 30%.",
  },
  "ecommerce-expert": {
    name: "Esperto E-commerce",
    shortName: "E-commerce Expert",
    category: "E-commerce & Finance",
    badge: "Popolare",
    description: "Audit dello store, descrizioni prodotto e recupero carrelli abbandonati.",
    longDescription:
      "Un esperto e-commerce che controlla il tuo store, scrive descrizioni prodotto, recupera i carrelli abbandonati, gestisce le domande sui prodotti e fa emergere le opportunità di upsell.",
    industry: "Venditori Shopify, WooCommerce e Amazon",
    tasks: [
      "Descrizioni prodotto",
      "Recupero carrelli",
      "Gestione domande",
      "Opportunità upsell",
    ],
    workflow: [
      "Analizza lo store",
      "Scrivi le descrizioni",
      "Recupera i carrelli",
      "Proponi gli upsell",
    ],
    previewPrompt: "Scrivi la descrizione del nuovo prodotto e il piano di upsell.",
    previewResult:
      "Descrizione ottimizzata per SEO e 3 opportunità di upsell individuate.",
    example:
      "Ho recuperato il 12% dei carrelli abbandonati con email automatiche.",
  },
  "shopify-agent": {
    name: "Agente Shopify",
    shortName: "Agente Shopify",
    category: "E-commerce & Finance",
    badge: "Consigliato",
    description: "Cerca prodotti, crea link al carrello e controlla gli ordini.",
    longDescription:
      "Un agente Shopify che cerca i prodotti, costruisce link diretti al carrello e controlla lo stato degli ordini in modo sicuro con numero ordine ed email.",
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
