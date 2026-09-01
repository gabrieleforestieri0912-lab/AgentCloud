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
    description:
      "Smista la casella, pianifica tra fusi orari e non dimentichi mai un follow-up.",
    longDescription:
      "L'assistente esecutivo diventa il tuo braccio destro AI. Dà priorità alla casella così le email urgenti non seppelliscono ciò che conta, scrive risposte in linea col tuo stile da approvare, pianifica riunioni tra fusi orari, prepara ogni giorno un briefing con decisioni e azioni e segue ogni follow-up fino a completarlo. Si collega a Gmail, Google Calendar, Outlook e Notion: risparmi 5–10 ore a settimana di coordinamento e ti concentri sulle decisioni invece che sulla logistica.",
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
  "project-manager": {
    name: "Project Manager",
    shortName: "Project Manager",
    category: "Business & Operations",
    badge: "Popolare",
    description:
      "Trasforma gli obiettivi in traguardi, responsabili e blocchi — con follow-up automatici.",
    longDescription:
      "L'agente Project Manager trasforma un obiettivo generico in un piano a tappe realistico: divide il lavoro in compiti, assegna i responsabili in base al carico, fissa le scadenze, traccia i blocchi e avvisa la persona giusta quando qualcosa rischia di slittare. Si integra con Notion, Asana, Slack e Linear per mantenere il team allineato e le consegne puntuali, così ogni lancio parte con ruoli chiari invece di una corsa finale all'ultimo minuto.",
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
    description:
      "Entra in ogni call, trascrivila e non perdere mai più un'azione.",
    longDescription:
      "L'assistente riunioni partecipa alle tue call così nessuno deve prendere appunti. Trascrive la conversazione in tempo reale, estrae decisioni e proprietari e invia a ogni partecipante un riepilogo strutturato con azioni, responsabili e scadenze. Integrato con Google Meet, Zoom, Slack e HubSpot, mantiene un registro decisionale ricercabile che rende tutti responsabili — niente più 'mi mandi gli appunti di quella riunione?'.",
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
    description:
      "Registra ogni chiamata e email e mantieni la pipeline in movimento.",
    longDescription:
      "L'assistente CRM mantiene pulito il tuo CRM senza inserimenti manuali. Registra automaticamente chiamate ed email, arricchisce i contatti con dati firmografici e di intento, segnala le trattative ferme prima che muoiano e indica a ogni commerciale il passo esatto successivo per avanzare. Collegato a HubSpot, Salesforce, Gmail e Apollo, dà al team vendite una pipeline che può davvero aspettare la chiusura — così le previsioni sono accurate e il fatturato non si perde in follow-up dimenticati.",
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
    description:
      "Monitora la salute degli account e salva i clienti prima che se ne vadano.",
    longDescription:
      "L'agente Customer Success mantiene sano ogni account. Monitora l'utilizzo del prodotto in tempo reale, attiva percorsi di onboarding personalizzati, esegue i check-in NPS, calcola lo score di salute e avvisa il team al primo segnale di rischio churn — con il pattern di utilizzo esatto e una strategia di salvataggio suggerita. Integrato con Intercom, HubSpot, Stripe e Mixpanel, trasforma l'azione reattiva in una retention prevedibile che protegge i ricavi ricorrenti.",
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
  "marketing-strategist": {
    name: "Marketing Strategist",
    shortName: "Marketing Strategist",
    category: "Marketing & Sales",
    badge: "Popolare",
    description:
      "Trasforma un obiettivo di business in piano canali, calendario e budget.",
    longDescription:
      "L'agente Marketing Strategist trasforma un obiettivo aziendale in un piano marketing eseguibile: sceglie i canali giusti, alloca il budget, costruisce il calendario editoriale e rivede ogni settimana le performance rispetto ai KPI. Collegato a Notion, Google Ads, Meta Ads e Mailchimp, dà al team una roadmap chiara e un ciclo di feedback — così le campagne partono in orario, entro budget e migliorano di continuo invece di essere improvvisate di mese in mese.",
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
    description:
      "Ricerca le keyword, analizza i contenuti e scala nelle classifiche di Google.",
    longDescription:
      "Lo specialista SEO gestisce l'intero processo di ottimizzazione on-page. Ricerca le opportunità di posizionamento, analizza le pagine esistenti, studia i competitor e produce articoli completamente ottimizzati con struttura heading corretta, meta dati e link interni. Integrato con WordPress, Webflow, Ahrefs e Google Search Console, trasforma un vago 'ci serve più traffico' in una lista prioritaria di pagine da sistemare e keyword da targetizzare — così la crescita organica diventa sistematica, non sporadica.",
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
  "google-ads-expert": {
    name: "Esperto Google Ads",
    shortName: "Google Ads Expert",
    category: "Marketing & Sales",
    badge: "Popolare",
    description:
      "Costruisci, ristruttura e ottimizza le campagne Google Ads a scopo di profitto.",
    longDescription:
      "L'esperto Google Ads gestisce il tuo account come un senior specialist PPC. Progetta struttura di campagne e gruppi di annunci, scrive copy responsive, sceglie le keyword target e le negative, monitora il quality score e consiglia spostamenti di budget dove la spesa converte davvero. Collegato a Google Ads, Google Analytics, Looker e Slack, taglia la spesa sprecata e migliora il ROI — trasformando un account caotico in un canale di acquisizione prevedibile.",
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
    description:
      "Pianifica, scrivi e programma contenuti nativi su tutti i tuoi canali.",
    longDescription:
      "L'agente Social Media Manager gestisce il tuo calendario contenuti su Instagram, TikTok, LinkedIn e X. Pianifica la settimana, scrive copy adattato allo stile e al pubblico di ogni piattaforma, ricerca gli hashtag e programma i post nelle fasce orarie di picco. Integrato con Buffer e i tuoi account brand, trasforma la pubblicazione in un sistema multicanale costante — così il brand è sempre presente senza che tu e il team passiate ore ogni giorno a creare e pubblicare.",
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
    description:
      "Scrivi sequenze cold personalizzate che prenotano riunioni, non ottenendo silenzi.",
    longDescription:
      "L'agente Cold Email Writer costruisce sequenze di outbound che ottengono risposte. Ricerca ogni prospect, personalizza oggetto e apertura attorno all'azienda e al ruolo reali, struttura i follow-up in più passaggi con la cadenza giusta e adatta il tono alla tua buyer persona. Collegato ad Apollo, LinkedIn, HubSpot e Instantly, trasforma una massiva generica in un costruttore di pipeline mirato — con un tasso di risposta più alto e più riunioni qualificate per il team vendite.",
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
    description:
      "Valuta i lead inbound su fit e intento e prenota riunioni per i tuoi commerciali.",
    longDescription:
      "L'agente Qualificazione Lead decide quali lead in entrata meritano il tempo dei tuoi commerciali. Arricchisce ogni lead, li valuta su fit e intento di acquisto, fa le domande di qualifica tramite chat e prenota automaticamente le riunioni per quelli ad alto potenziale. Integrato con HubSpot, Salesforce, Calendly e Slack, evita che il team insegua chi non comprerà mai — concentrandoli sul piccolo gruppo di lead più probabili a diventare clienti.",
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
  "complaint-manager": {
    name: "Gestore Reclami",
    shortName: "Complaint Manager",
    category: "Customer Service",
    badge: "Novità",
    description:
      "Rileva il sentiment negativo fin da subito e riconquista i clienti insoddisfatti.",
    longDescription:
      "L'agente Gestore Reclami trasforma i clienti arrabbiati in clienti mantenuti. Rileva il sentiment negativo su tutti i tuoi canali di supporto, dà priorità ai casi urgenti o ad alto valore, scrive risposte empatiche e in linea col brand e attiva il piano di retention giusto in base al valore del cliente. Collegato a Zendesk, Intercom, HubSpot e Stripe, ti aiuta a recuperare ricavi che altrimenti uscirebbero dalla porta — rispondendo con tono e offerta giusti, e in fretta.",
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
    description:
      "Crea app, costruisci feature e rilascia in giorni, non settimane.",
    longDescription:
      "Lo sviluppatore full stack accelera la tua build. Avvia progetti Next.js, React e Node, genera componenti, costruisce API CRUD e scrive i test — portando una feature dall'idea al codice rilasciato. Integrato con GitHub, Vercel, Supabase e Postgres, amplifica i piccoli team gestendo il boilerplate e le parti noiose, così i tuoi sviluppatori si concentrano sulla logica di prodotto e rilasci le feature in giorni invece che in sprint interi.",
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
    description:
      "Collega i tuoi strumenti con API e webhook sicuri e ben documentati.",
    longDescription:
      "L'esperto Integrazioni API costruisce i connettori che tengono insieme il tuo stack. Progetta le integrazioni, gestisce l'autenticazione OAuth, configura i webhook, aggiunge retry e gestione errori e documenta ogni cosa. Con Postman, GitHub, Zapier e Make.com, consegna connettori affidabili e pronti per la produzione — così le tue app condividono i dati senza problemi e il team non deve leggere tre documentazioni per far parlare due sistemi.",
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
    description:
      "Rilascia più in fretta con CI/CD, Docker, osservabilità e deploy affidabili.",
    longDescription:
      "L'ingegnere DevOps configura la base ingegneristica dietro rilasci veloci e affidabili. Provisiona l'infrastruttura cloud, scrive le pipeline GitHub Actions, containerizza le app con Docker e aggiunge monitoraggio e alerting. Collegato a GitHub, Docker, AWS e Datadog, trasforma i deploy manuali e pieni di errori in una pipeline automatica — così il team rilascia più spesso con fiducia e nota i problemi prima dei tuoi utenti.",
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
    description:
      "Cattura i bug prima degli utenti con la copertura dei test automatici.",
    longDescription:
      "L'agente QA tester protegge i tuoi rilasci. Genera i piani di test, scrive test automatici (unit, integration ed e2e), riproduce i bug dai report e fa triage dei problemi prima che arrivino in produzione. Integrato con GitHub, Playwright, Jira e Linear, dà al team engineering una rete di sicurezza — così le regressioni vengono individuate da sole, i rilasci partono con fiducia e gli sviluppatori lavorano sulle feature invece che sui test manuali.",
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
    description:
      "Rendi gli output del tuo LLM più economici, rapidi e affidabili.",
    longDescription:
      "L'agente Prompt Engineer ottimizza i prompt dietro le tue funzionalità AI. Riscrive prompt e istruzioni di sistema per renderli più affidabili, economici e deterministici, e imposta suite di valutazione per misurare i miglioramenti nel tempo. Con OpenAI, Anthropic, LangSmith e Notion, trasforma gli esperimenti AI approssimativi in un comportamento pronto per la produzione — tagliando i costi dei token, riducendo gli output errati e dando al team prodotto fiducia in ogni chiamata LLM.",
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
    description:
      "Trasforma un'idea di workflow in un'automazione che gira da sola.",
    longDescription:
      "L'AI Automation Builder trasforma una descrizione approssimativa di workflow in un'automazione pronta per la produzione. Progetta il flusso, sceglie gli strumenti giusti e gestisce le parti difficili — casi di errore, retry e logging. Con Zapier, Make.com, n8n e Slack, consegna automazioni su cui il team può davvero contare: da un alert Stripe-to-Slack a un flusso completo di onboarding clienti che gira end-to-end senza bisogno di qualcuno che lo sorvegli.",
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
    description:
      "Interroga i tuoi dati e ottieni risposte in linguaggio semplice, non in SQL.",
    longDescription:
      "L'agente Data Analyst trasforma i dati grezzi in decisioni. Interroga il tuo warehouse, costruisce modelli SQL, crea dashboard e scrive riepiloghi executive in linguaggio semplice su cosa sta accadendo nel business. Collegato a BigQuery, Snowflake, Metabase e Slack, risponde in minuti a domande come 'perché le vendite sono calate la scorsa settimana?' — mettendo l'analisi nelle mani di tutti senza costruire un team dati o aspettare giorni una richiesta BI.",
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
  "blog-writer": {
    name: "Blog Writer",
    shortName: "Blog Writer",
    category: "Design & Content",
    badge: "Consigliato",
    description:
      "Ricerca e scrivi articoli long-form che si posizionano e si leggono bene.",
    longDescription:
      "L'agente Blog Writer produce articoli long-form end-to-end. Ricerca il tema, delinea il pezzo, scrive con fonti citate e aggiunge meta dati SEO e snippet social. Collegato a WordPress, Webflow, Ahrefs e Notion, permette a un piccolo team contenuti di pubblicare con costanza — trasformando un calendario editoriale da aspirazione a produzione regolare di articoli pronti per il ranking che il tuo pubblico vuole davvero leggere.",
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
    description:
      "Trasforma i brief di prodotto in mockup curati e spec pronte per lo sviluppo.",
    longDescription:
      "L'agente UI Designer porta un brief di prodotto dal concept alla consegna. Produce mockup curati, definisce un sistema di design token, scrive le specifiche dei componenti con tutti i loro stati e prepara note di consegna chiare per l'engineering. Integrato con Figma, Notion, Linear e GitHub, accelera la consegna delle feature — riducendo il divario design-sviluppo così il team rilascia interfacce migliori più in fretta, senza aspettare un dipartimento design sempre occupato.",
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
    description:
      "Recupera i carrelli abbandonati e trasforma le schede prodotto in vendite.",
    longDescription:
      "L'esperto E-commerce ottimizza lo store per i ricavi. Controlla il negozio, scrive descrizioni prodotto migliori, recupera i carrelli abbandonati con follow-up personalizzati, risponde alle domande sui prodotti e fa emergere le opportunità di upsell. Collegato a Shopify, WooCommerce, Klaviyo e Stripe, attacca le più grandi perdite di ricavo nell'e-commerce — così più visitatori convertono, più carrelli vengono recuperati e lo scontrino medio cresce.",
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
