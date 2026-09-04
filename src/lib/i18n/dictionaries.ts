/**
 * AgentCloud UI dictionaries.
 *
 * `it` is the source of truth for the shape; `en` must mirror it exactly
 * (`Dictionary = typeof it`). Client components read the active dictionary
 * via `useLanguage()`; server components use `getDictionary(await getLocale())`.
 *
 * The agent catalog content lives in `./agentCatalog.ts` (Italian overlays on
 * top of the English data in `src/lib/agents.ts`).
 */

const it = {
  common: {
    comingSoon: "Prossimamente",
    comingSoonShort: "Presto disponibile",
    installs: "installazioni",
    setup: "Setup",
    view: "Vedi",
    active: "Attivo",
    online: "Online",
    close: "Chiudi",
    copy: "Copia",
    copied: "Copiato!",
  },

  apiErrors: {
    unauthorized: "Non autorizzato",
    invalidJson: "Corpo JSON non valido",
    missingAgentOrMessages: "Manca agentId o messages",
    agentNotFound: "Agente non trovato",
    rateLimited: "Troppe richieste. Riprova tra un momento.",
    executionError:
      "Si è verificato un errore durante l'esecuzione dell'agente",
    notSubscribed:
      "Non hai un abbonamento attivo per questo agente. Abbonati per iniziare a usarlo.",
    subscriptionInactive:
      "Il tuo abbonamento per questo agente è {status}. Riattivalo per continuare a usarlo.",
    overageCapReached:
      "Hai raggiunto il tetto di sicurezza mensile di {cap} token ({multiplier}x l'allowance del tuo piano) per questo agente. Contattaci per aumentare il limite.",
    limitExceeded:
      "Hai esaurito l'allowance mensile di {limit} token per questo agente. Aggiorna il tuo piano per continuare.",
    invalidEmail: "Email non valida",
    invalidPlan: "Piano non valido",
    missingAgentOrPlan: "Manca agentId o planId+vertical",
    paymentLinkNotConfigured: "Payment link non configurato",
    failedToGeneratePaymentLink: "Impossibile generare il payment link",
    emailRequired: "L'email è obbligatoria",
    invalidEmailAddress: "Indirizzo email non valido",
    alreadyOnWaitlist: "Questa email è già in waitlist",
    failedToJoinWaitlist: "Iscrizione alla waitlist non riuscita",
    invalidAccessCode: "Codice di accesso non valido",
    allFieldsRequired: "Tutti i campi sono obbligatori",
    aiStreamError: "Errore durante la generazione della risposta",
    aiConnectionFailed:
      "Impossibile contattare il backend AI. Riprova più tardi.",
    internalServerError: "Errore interno del server",
  },

  navbar: {
    marketplace: "Marketplace",
    solutions: "Soluzioni",
    integrations: "Integrazioni",
    browseAllAgents: "Sfoglia tutti gli agenti",
    logOut: "Esci",
    signIn: "Accedi",
    requestDemo: "Richiedi demo",
    menu: "Menu",
    solutionsItems: [
      {
        title: "E-commerce & Shopify",
        text: "Trova prodotti, crea link al carrello e controlla gli ordini.",
      },
      {
        title: "Acquisizione lead",
        text: "Cattura i contatti dai moduli e dal sito in automatico.",
      },
      {
        title: "Assistenza prodotti e ordini",
        text: "Rispondi alle domande su prodotti e ordini 24/7.",
      },
      {
        title: "Qualificazione lead",
        text: "Arricchisci i contatti e notifica le vendite con il giusto contesto.",
      },
    ],
    integrationsItems: [
      "Gmail",
      "Google Calendar",
      "HubSpot",
      "Slack",
      "Shopify",
      "Stripe",
      "Notion",
      "Google Sheets",
    ],
    pricingItems: [
      {
        plan: "Starter",
        price: "€29/mese",
        text: "Un agente per il tuo workflow",
      },
      {
        plan: "Growth",
        price: "€39/mese",
        text: "Agente più integrazioni",
      },
      { plan: "Custom", price: "Su misura", text: "Sistemi multi-agente" },
    ],
  },

  footer: {
    tagline: "AgentCloud — La Piattaforma di Agenti AI",
    follow: "SEGUICI",
    company: "AZIENDA",
    about: "Chi siamo",
    faq: "FAQ",
    contact: "Contatti",
    phone: "+39 351 986 3021",
    email: "info@agentcloud.agency",
    rights: "© 2026 AgentCloud. Tutti i diritti riservati.",
    privacy: "Privacy",
    terms: "Termini",
    refunds: "Politica di Rimborso",
  },

  hero: {
    titleA: "Gestisci la tua attività",
    titleConnector: "con",
    titleB: "l'Esecuzione AI",
    subtitle:
      "Chiedi qualsiasi cosa. La nostra IA la pianifica, la esegue e la collega ai tuoi strumenti.",
    placeholderEmpty: "Dicci cosa vorresti automatizzare...",
    placeholderContinued: "Continua la conversazione...",
    sendMessage: "Invia messaggio",
    openFullChat: "Apri la chat completa",
    aiError:
      "Il servizio AI non è disponibile in questo momento. Riprova tra poco.",
    chips: [
      "E-commerce",
      "Shopify",
      "Vendite & lead",
      "Acquisizione lead",
      "Stato ordini",
    ],
    roles: [
      "Product Manager",
      "Sviluppatore",
      "Marketer",
      "Venditore",
      "Fondatore",
      "Designer",
      "Analista dati",
      "Customer Success",
      "Community Lead",
      "Finanza",
      "Operazioni",
      "Creator di corsi",
    ],
  },

  features: {
    badge: "Automazioni",
    titleA: "Una piattaforma,",
    titleB: "ogni attività automatizzata",
    subtitle:
      "AgentCloud si integra con gli strumenti che già usi — dalle suite di produttività ai CRM.",
    cta: "Attiva il tuo primo agente",
    items: [
      {
        quote: '"I clienti chiedono spesso dettagli sui prodotti"',
        title: "Assistente prodotti Shopify",
        description:
          "L'agente Shopify risponde alle domande su prodotti e ordini direttamente in chat, 24/7.",
        card: {
          variant: "chat",
          title: "Conversazione agente",
          userBubble: "Questo prodotto è disponibile in taglia 42?",
          agentBubble:
            "Cerco nel catalogo e ti preparo il link al carrello.",
          summaryTitle: "Riepilogo richiesta",
          rows: [
            { label: "Prodotti trovati", n: 4 },
            { label: "Link carrello generati", n: 3 },
            { label: "Disponibilità verificata", n: 4 },
          ],
        },
      },
      {
        quote: '"Voglio far comprare ai clienti in un clic"',
        title: "Link diretti al carrello",
        description:
          "Trova i prodotti nel catalogo e genera link diretti al carrello da condividere ovunque.",
        card: {
          variant: "campaigns",
          title: "Link carrello generati",
          rows: [
            { name: "Scarpe Running", channel: "Shopify", reach: "32 click" },
            { name: "Felpa Logo", channel: "Shopify", reach: "18 click" },
            { name: "Borraccia", channel: "Shopify", reach: "27 click" },
          ],
        },
      },
      {
        quote: '"I clienti vogliono sapere dove sono i loro ordini"',
        title: "Stato ordini in tempo reale",
        description:
          "Verifica lo stato degli ordini con numero ordine ed email e rispondi in pochi secondi.",
        card: {
          variant: "email",
          title: "Stato ordine",
          status: "Verificato",
          rows: [
            { label: "Ordine #1042", sub: "Spedito · consegna venerdì" },
            { label: "Ordine #1047", sub: "In preparazione" },
            { label: "Ordine #1049", sub: "Consegnato" },
          ],
        },
      },
      {
        quote: '"Perdo i contatti che arrivano dal sito"',
        title: "Acquisizione lead automatica",
        description:
          "L'agente lead capture raccoglie i dettagli dei prospect e li arricchisce con il contesto giusto.",
        card: {
          variant: "leads",
          title: "Pipeline lead",
          todayBadge: "+12 oggi",
          leads: [
            { initials: "SM", name: "Sara M.", time: "2 min fa", status: "Nuovo" },
            { initials: "JR", name: "Giacomo R.", time: "15 min fa", status: "Qualificato" },
            { initials: "LK", name: "Laura K.", time: "1 h fa", status: "Arricchito" },
          ],
          conversionLabel: "Tasso di acquisizione",
        },
      },
      {
        quote: '"Le vendite scoprono i lead in ritardo"',
        title: "Notifiche al team vendite",
        description:
          "Quando arriva un lead, il team vendite viene avvisato su Slack con tutti i dettagli.",
        card: {
          variant: "projects",
          title: "Notifiche vendite",
          rows: [
            { label: "Lead #231", sub: "Slack · 2 min fa" },
            { label: "Lead #230", sub: "Slack · 18 min fa" },
            { label: "Lead #229", sub: "Arricchito con LinkedIn" },
          ],
        },
      },
      {
        quote: '"Voglio solo lead che valgono"',
        title: "Qualificazione lead",
        description:
          "Arricchisci i contatti e valuta ogni lead per concentrarti su quelli davvero pronti a comprare.",
        card: {
          variant: "chat",
          title: "Analisi lead",
          userBubble: "Quali lead sono pronti ad acquistare oggi?",
          agentBubble:
            "Analizzo i lead e ti indico quelli con più alto potenziale.",
          summaryTitle: "Lead qualificati",
          rows: [
            { label: "Alto potenziale", n: 6 },
            { label: "Da nutrire", n: 9 },
            { label: "Da scartare", n: 3 },
          ],
        },
      },
    ],
  },

  integrations: {
    badge: "Integrazioni",
    titleA: "Funziona con gli strumenti",
    titleB: "che il tuo team usa già",
    subtitle:
      "AgentCloud si collega alle piattaforme su cui gira la tua azienda — dagli strumenti di produttività ai CRM, dalle app di comunicazione ai workflow di automazione.",
    cta: "Esplora le integrazioni AgentCloud",
    categories: {
      "E-commerce": "E-commerce",
      Payments: "Pagamenti",
      Messaging: "Messaggistica",
      "Social & Ads": "Social e Ads",
      Advertising: "Pubblicità",
      Analytics: "Analytics",
      Calendar: "Calendario",
      Meetings: "Riunioni",
      "Email Service": "Servizio email",
      "Email Marketing": "Email marketing",
      Scheduling: "Pianificazione",
      CRM: "CRM",
    },
  },

  marketplace: {
    badge: "AI Agent Store",
    titleA: "Scegli un agente.",
    titleB: "Attiva un workflow aziendale.",
    subtitle:
      "Un marketplace di agenti AI pronti al lancio che pianificano i compiti, eseguono i workflow e si collegano agli strumenti che il tuo team usa già.",
    quickSolutions: [
      {
        title: "Agente Shopify",
        description: "Cerca prodotti e crea link al carrello",
      },
      {
        title: "Stato ordini",
        description: "Controlla lo stato degli ordini in tempo reale",
      },
      {
        title: "Acquisizione lead",
        description: "Cattura i lead dal sito e avvisa le vendite",
      },
      {
        title: "Qualificazione lead",
        description: "Arricchisci e qualifica i contatti in automatico",
      },
    ],
    browseAll: "Sfoglia tutti gli agenti",
    customTitle: "Ti serve un agente su misura?",
    customText:
      "Raccontaci il tuo workflow. Progettiamo l'agente, colleghiamo i tuoi strumenti e consegniamo l'automazione.",
    buildCustom: "Crea su misura",
  },

  cta: {
    titleA: "Lancia il tuo primo",
    titleB: "workflow con agenti AI.",
    subtitle:
      "Scegli un agente, collega i tuoi strumenti e trasforma il lavoro ripetitivo in un sistema automatico.",
    browseMarketplace: "Sfoglia il marketplace",
    seeDashboard: "Vedi il dashboard",
  },

  faq: {
    badge: "FAQ",
    titleA: "Domande",
    titleB: "frequenti",
    stillQuestions: "Hai ancora domande?",
    contactSupport: "Contatta il supporto",
    items: [
      {
        q: "Cos'è AgentCloud?",
        a: "AgentCloud è una piattaforma di agenti AI pensata per aiutare le aziende ad automatizzare le operazioni, ridurre i costi e creare spazio per crescere. Offriamo agenti AI preconfigurati e personalizzabili che si integrano con gli strumenti che già usi.",
      },
      {
        q: "A chi è rivolto AgentCloud?",
        a: "AgentCloud è pensato per founder, team operations e PMI che vogliono sfruttare l'AI senza assumere sviluppatori o costruire soluzioni da zero.",
      },
      {
        q: "Che tipo di attività aziendali può automatizzare AgentCloud?",
        a: "AgentCloud può automatizzare l'e-commerce Shopify — ricerca prodotti, link al carrello e stato ordini — e l'acquisizione e qualificazione dei lead, con notifiche automatiche al team vendite.",
      },
      {
        q: "Sono soluzioni pronte all'uso o personalizzate?",
        a: "Entrambe. Hai accesso ad agenti preconfigurati che puoi attivare subito, più la possibilità di personalizzarli sui tuoi workflow specifici.",
      },
      {
        q: "Come faccio a sapere quale soluzione è giusta per la mia azienda?",
        a: "Prenota una demo gratuita con il nostro team. Analizziamo i tuoi processi e ti consigliamo gli agenti migliori per le tue esigenze.",
      },
      {
        q: "Quanto tempo richiede la configurazione?",
        a: "La maggior parte degli agenti può essere attivata in poche ore. Le configurazioni più complesse con più integrazioni possono richiedere 1–3 giorni lavorativi.",
      },
      {
        q: "Con quali strumenti si integra AgentCloud?",
        a: "AgentCloud si integra con Shopify, Stripe, Slack, Gmail, HubSpot, Salesforce, Zapier e WhatsApp, con molte altre integrazioni in arrivo.",
      },
      {
        q: "Servono competenze tecniche per usarlo?",
        a: "No. AgentCloud è progettato per essere accessibile a tutti: non servono competenze di programmazione per configurare e usare i nostri agenti.",
      },
    ],
  },

  dashboardSection: {
    badge: "Operazioni agente",
    title: "Gestisci ogni agente installato da un unico dashboard pulito.",
    subtitle:
      "Controlla stato, esecuzioni dei workflow, alert e salute delle integrazioni senza uscire dal marketplace.",
    openDashboard: "Apri il dashboard",
    sidebar: [
      "Panoramica",
      "Agenti",
      "Integrazioni",
      "Esecuzioni",
      "Fatturazione",
    ],
    stats: [
      ["5", "Agenti installati"],
      ["2.710", "Esecuzioni totali"],
      ["98,3%", "Successo medio"],
      ["412.306", "Token questo mese"],
    ],
    agentsHeading: "I tuoi agenti",
    recentActivity: "Attività recente",
    events: [
      [
        "2 min fa",
        "Agente Shopify ha applicato il codice sconto ESTATE20 e generato 3 link al carrello per la collezione estate.",
      ],
      [
        "18 min fa",
        "Agente Supporto ha risolto 4 ticket dalla knowledge base e ha inoltrato 1 rimborso al team umano.",
      ],
      [
        "1 ora fa",
        "Agente Lead Capture ha catturato 9 lead dal modulo contatti e ha avvisato le vendite su Slack.",
      ],
      [
        "3 ore fa",
        "Agente Copywriter ha consegnato 3 varianti di hero e 6 headline per la landing di lancio.",
      ],
      [
        "ieri",
        "Agente Email Manager ha smistato 214 email e fissato 5 promemoria sugli impegni della settimana.",
      ],
    ],
    agents: [
      ["Agente Shopify", "Attivo", "1.284 esecuzioni", "98,7%", "2 min fa"],
      ["Agente Supporto", "Attivo", "512 esecuzioni", "99,2%", "18 min fa"],
      [
        "Agente Lead Capture",
        "Attivo",
        "438 esecuzioni",
        "96,1%",
        "1 ora fa",
      ],
      ["Agente Copywriter", "Attivo", "287 esecuzioni", "97,5%", "3 ore fa"],
      [
        "Agente Email Manager",
        "Attivo",
        "189 esecuzioni",
        "98,9%",
        "ieri",
      ],
    ],
  },

  agentCard: {
    comingSoon: "Prossimamente",
    installs: "installazioni",
    setup: "Setup",
    view: "Vedi",
    buy: "Acquista",
  },

  agentPreview: {
    livePreview: "Anteprima live",
    demoMode: "Modalità demo",
    readyToSimulate: "Pronto a simulare {name} su un'attività aziendale reale.",
    runningWorkflow: "Esecuzione del workflow...",
    workflowCompleted: "Workflow completato",
    running: "Esecuzione...",
    runAgain: "Esegui di nuovo",
    runPreview: "Esegui anteprima",
  },

  chat: {
    newChat: "Nuova chat",
    home: "Home",
    chat: "Chat",
    tools: "Strumenti",
    agents: "Agenti",
    conversations: "Conversazioni",
    noConversations: "Ancora nessuna conversazione. Inizia una nuova chat!",
    thinking: "Sto pensando...",
    online: "Online",
    emptyTitle: "Cosa vorresti automatizzare?",
    emptySubtitle:
      "Chiedimi qualsiasi cosa sull'automazione della tua azienda. Posso aiutarti con email, supporto, lead e altro.",
    placeholder: "Scrivi al tuo agente AI...",
    sendMessage: "Invia messaggio",
    disclaimer:
      "L'AI di AgentCloud può produrre informazioni inaccurate. Verifica i dati critici.",
    closeSidebar: "Chiudi la sidebar",
    openSidebar: "Apri la sidebar",
    deleteConversation: "Elimina conversazione",
    newChatTitle: "Nuova chat",
  },

  agentChat: {
    notFoundTitle: "Agente non trovato",
    notFoundSubtitle: "Questo agente non esiste o è stato rimosso.",
    startTyping: "Inizia a scrivere per interagire con questo agente",
    attachFile: "Allega file",
    disclaimer: "L'AI di AgentCloud può produrre informazioni inaccurate",
    using: "Uso di",
    connectionError: "Errore di connessione. Riprova.",
    messagePlaceholder: "Messaggio {name}...",
  },

  publicChat: {
    poweredBy: "Alimentato da",
    askMe: "Chiedimi qualsiasi cosa — sono qui per aiutarti",
    attachFile: "Allega file",
    messagePlaceholder: "Chiedi a {name}...",
    backToChat: "AgentCloud",
    somethingWentWrong: "Qualcosa è andato storto. Riprova.",
    connectionError: "Errore di connessione. Riprova.",
  },

  agentsPage: {
    badge: "Agent marketplace",
    title: "Agenti AI per automatizzare i workflow aziendali.",
    subtitle:
      "Scegli tra agenti AI preconfigurati per marketing, operations, supporto, finanza e altro. Ogni agente può usare ricerca, caricamenti di file e azioni con strumenti per portare a termine il lavoro.",
    startChat: "Inizia una chat",
    requestDemo: "Richiedi una demo",
    availableNow: "Disponibili ora",
    comingSoon: "In arrivo",
    agentsCount: "{count} agenti",
  },

  agentDetail: {
    backToMarketplace: "Torna al marketplace",
    forIndustry: "Per {industry}",
    configureAgent: "Configura agente",
    tryPreview: "Prova la preview",
    rating: "Valutazione",
    installs: "Installazioni",
    setup: "Setup",
    ratedBy: "Valutato dai team che usano questo workflow ogni settimana",
    typicalLaunch: "Tempo di lancio tipico: {setupTime}",
    gdprNote: "Progettato per workflow aziendali GDPR-ready",
    setupPrice: "Prezzo di setup",
    whatAutomates: "Cosa automatizza questo agente",
    howItWorks: "Come funziona",
    howItWorksDesc:
      "{name} segue un flusso di lavoro strutturato per risultati costanti.",
    useCases: "Esempi di casi d'uso",
    useCasesDesc:
      "Scenari reali in cui {name} genera valore fin da subito.",
    integrationsTitle: "Integrazioni",
    integrationsDesc: "{name} si collega direttamente al tuo stack di strumenti.",
    faqTitle: "Domande frequenti",
    moreIn: "Altro in {category}",
    relatedDesc: "Altri agenti progettati per la stessa area di lavoro.",
    readyToDeploy: "Pronto a lanciare {name}?",
    readyToDeployDesc:
      "Configurazione in pochi minuti, senza codice. Inizia oggi ad automatizzare i workflow {category}.",
    configureAndDeploy: "Configura e attiva",
    askOurAi: "Chiedi alla nostra AI",
  },

  deploy: {
    steps: ["Configura", "Connetti strumenti", "Riepilogo"],
    backToAgent: "Torna all'agente",
    configureTitle: "Configura {name}",
    agentSettings: "Impostazioni agente",
    agentSettingsDesc: "Personalizza il comportamento di questo agente",
    businessName: "Nome attività",
    mainGoal: "Obiettivo principale",
    tone: "Tono",
    toneOptions: [
      "Professionale e conciso",
      "Amichevole e informale",
      "Formale e dettagliato",
      "Ironico e creativo",
    ],
    escalation: "Regola di escalation",
    escalationOptions: [
      "Chiedi prima delle azioni ad alto impatto",
      "Approva automaticamente tutte le azioni",
      "Approvazione manuale sempre richiesta",
      "Notificami ma procedi",
    ],
    connectTools: "Connetti strumenti",
    connectToolsDesc: "Collega i servizi che questo agente userà",
    recommended: "Consigliato",
    optional: "Opzionale",
    connect: "Connetti",
    deploymentSummary: "Riepilogo della distribuzione",
    reviewBefore: "Rivedi prima di richiedere",
    agent: "Agente",
    category: "Categoria",
    setupTime: "Tempo di setup",
    starter: "Starter",
    growth: "Growth",
    popular: "Popolare",
    requestDemo: "Richiedi demo",
    flowNote:
      "Questo flusso indirizza gli interessati a un modulo di richiesta demo.",
    deliveryOptions: "Opzioni di consegna",
    deliveryOptionsDesc: "Scegli come i tuoi clienti raggiungono questo agente",
    directLink: "Link diretto",
    directLinkDesc:
      "Condividi questo link ovunque — QR code, bio Instagram, scheda Google Business, firma email.",
    embedScript: "Script di embed",
    embedScriptDesc:
      "Incolla questo snippet prima di <code>&lt;/body&gt;</code> sul tuo sito.",
    copy: "Copia",
    copied: "Copiato!",
    toolsBase: "Strumenti base del verticale",
    leadCapture: "Lead capture",
    fullTools: "Strumenti completi del verticale",
    prioritySupport: "Supporto prioritario",
    consentPrefix: "Accetto i",
    consentTerms: "Termini di Servizio",
    consentConjunction: "e la",
    consentPrivacy: "Privacy Policy",
  },

  dashboard: {
    welcomeBack: "Bentornato, {name}",
    welcomeBackGeneric: "Bentornato",
    myAgents: "I miei agenti",
    tagline:
      "Controlla stato, esecuzioni recenti, workflow connessi e performance degli agenti da un unico posto.",
    installAgent: "Installa agente",
    installedAgents: "Agenti installati",
    noAgentsTitle: "Nessun agente installato",
    noAgentsSubtitle:
      "Sfoglia il marketplace e installa il tuo primo agente per iniziare ad automatizzare i tuoi workflow.",
    browseAgents: "Sfoglia gli agenti",
    dashboardUnavailable: "Dati del dashboard non disponibili",
    dashboardUnavailableDesc:
      "Imposta le variabili d'ambiente di Supabase per vedere qui agenti e utilizzo.",
    active: "Attivo",
    runs: "{count} esecuzioni",
    tokens: "{count} tok",
    lastRun: "{time} fa",
    monthlyUsage: "Utilizzo mensile",
    usageEmpty: "L'utilizzo apparirà qui una volta installato un agente.",
    usageEmptyDesc: "Connetti Supabase per monitorare utilizzo e limiti.",
    controlCenter: "Centro di controllo agente",
    controlCenterDesc:
      "I limiti sono sui token: ogni piano include un budget mensile (input + output) per agente installato. L'utilizzo oltre l'allowance viene addebitato automaticamente a {rate} per 1.000 token via Stripe, con un tetto di sicurezza a 2x l'allowance.",
    gettingStarted: "Per iniziare",
    gettingStartedSteps: [
      "Sfoglia il marketplace",
      "Installa il tuo primo agente",
      "Configura le integrazioni",
      "Visualizza il tuo dashboard",
    ],
    manageSubscription: "Gestisci abbonamento",
    billingError:
      "Non riusciamo ad aprire il portale di fatturazione. Assicurati di avere un abbonamento attivo e contattaci se il problema persiste.",
    cancelsAtPeriodEnd: "Si annulla a fine periodo",
    aboveAllowance: "Oltre l'allowance — fatturato a {rate}/1.000 token",
    overageAmount: " (+{count} in overage)",
    overageThisMonth: "(≈ €{amount} questo mese)",
    statInstalledAgents: "Agenti installati",
    statRunsThisMonth: "Esecuzioni questo mese",
    statTokensUsed: "Token usati",
    statActiveAgents: "Agenti attivi",
    justNow: "adesso",
    minutesAgo: "{n} min",
    hoursAgo: "{n} h",
    daysAgo: "{n} g",
  },

  auth: {
    login: {
      title: "Bentornato",
      hint: "Accedi con email e password o con Google",
      email: "Email",
      emailPlaceholder: "tu@azienda.com",
      password: "Password",
      passwordPlaceholder: "La tua password",
      submit: "Accedi",
      google: "Continua con Google",
      prompt: "Non hai ancora un account?",
      link: "Registrati",
      forgot: "Password dimenticata?",
      resetSent: "Ti abbiamo inviato un link per reimpostare la password.",
    },
    signup: {
      title: "Crea il tuo account",
      hint: "Registrati con email e password o con Google",
      name: "Nome (facoltativo)",
      namePlaceholder: "Mario Rossi",
      email: "Email",
      emailPlaceholder: "tu@azienda.com",
      password: "Password",
      passwordPlaceholder: "Minimo 8 caratteri",
      submit: "Crea account",
      google: "Continua con Google",
      prompt: "Hai già un account?",
      link: "Accedi",
      checkEmail: "Controlla la tua email per confermare la registrazione.",
    },
    errors: {
      invalidCredentials: "Email o password non corretti.",
      signupFailed: "Registrazione non riuscita. Riprova.",
      googleFailed: "Accesso con Google non riuscito.",
      network: "Errore di rete. Riprova.",
      authCallbackFailed:
        "Collegamento non valido o scaduto. Prova ad accedere di nuovo.",
    },
    resetPassword: {
      title: "Reimposta la password",
      hint: "Inserisci la nuova password per il tuo account.",
      newPassword: "Nuova password",
      newPasswordPlaceholder: "Minimo 8 caratteri",
      submit: "Aggiorna password",
      invalidLink: "Link non valido o scaduto. Richiedine uno nuovo dal login.",
      success: "Password aggiornata con successo. Ora puoi accedere.",
      updateFailed: "Impossibile aggiornare la password. Riprova.",
      backToLogin: "Torna al login",
    },
  },

  waitlist: {
    limitedAccess: "Accesso limitato",
    title: "Unisciti alla",
    titleAccent: "Waitlist",
    subtitle:
      "Sii tra i primi a provare l'automazione AI. Posti limitati disponibili.",
    takenSpots: "Posti occupati",
    successTitle: "Sei nella lista!",
    successText: "Ti avviseremo quando AgentCloud sarà pronto.",
    fullTitle: "Waitlist piena",
    fullText: "Tutti i posti sono occupati. Riprova più tardi!",
    emailButton: "Scrivici via email",
    emailModalTitle: "Scrivici un messaggio",
    emailModalPlaceholder: "Scrivi qui il tuo messaggio...",
    emailModalSend: "Invia email",
    emailModalCancel: "Annulla",
    placeholder: "Inserisci la tua email o il codice di accesso",
    joining: "Ti stai iscrivendo...",
    joinWaitlist: "Entra in waitlist",
    agreeNote:
      "Iscrivendoti accetti di ricevere aggiornamenti su AgentCloud.",
    alreadyOnList: "Questa email è già in waitlist",
    somethingWrong: "Qualcosa è andato storto",
    networkError: "Errore di rete. Riprova.",
  },

  demo: {
    badge: "Demo",
    titleA: "Scopri AgentCloud",
    titleB: "in azione.",
    subtitle:
      "Prenota una demo personalizzata. Ti mostriamo come gli agenti AI possono automatizzare i tuoi workflow di supporto, vendite, finanza e operations — senza codice.",
    benefits: [
      {
        title: "Automazione AI",
        text: "Agenti che gestiscono supporto, vendite, finanza e operations in autonomia.",
      },
      {
        title: "Sicurezza enterprise",
        text: "I tuoi dati sono crittografati, isolati e conformi agli standard di settore.",
      },
      {
        title: "Risultati misurabili",
        text: "Monitora esecuzioni, tassi di successo e ROI da un unico dashboard.",
      },
    ],
    whatToExpect: "Cosa aspettarti",
    expectations: [
      "Demo live di 30 minuti su misura per la tua azienda",
      "Presentazione di agenti preconfigurati e workflow personalizzati",
      "Q&A con il nostro team prodotto",
      "Nessun impegno — esplora al tuo ritmo",
    ],
    requestDemo: "Richiedi una demo",
    requestDemoHint:
      "Compila i tuoi dati e ti ricontatteremo entro 24 ore.",
    firstName: "Nome",
    lastName: "Cognome",
    email: "Email",
    firstNamePh: "Mario",
    lastNamePh: "Rossi",
    emailPh: "mario@azienda.com",
    requestButton: "Richiedi demo",
    scheduleNote: "Ti contatteremo per pianificare la demo personalizzata",
    successTitle: "Richiesta inviata!",
    successText:
      "Grazie, {name}. Abbiamo ricevuto la tua richiesta di demo e ti ricontatteremo entro 24 ore.",
    close: "Chiudi",
    failedRequest: "Invio della richiesta non riuscito",
    somethingWrong: "Qualcosa è andato storto",
    howToUse: {
      badge: "Come funziona",
      titleA: "Dal primo contatto",
      titleB: "al tuo agente attivo",
      subtitle:
        "Ti guidiamo passo dopo passo: nessuna competenza tecnica richiesta.",
      steps: [
        {
          title: "Richiedi la demo",
          text: "Compila il form in questa pagina: ti ricontattiamo entro 24 ore per capire le tue esigenze.",
        },
        {
          title: "Acquista il tuo piano",
          text: "Scegli l'agente e il piano più adatto. Pagamento sicuro tramite Stripe e attivazione immediata.",
        },
        {
          title: "Accedi al dashboard",
          text: "Dopo l'acquisto l'agente compare tra i tuoi agenti installati, pronto all'uso.",
        },
        {
          title: "Configura e collega gli strumenti",
          text: "Personalizza tono e obiettivi dell'agente e collega i tuoi strumenti: Gmail, Slack, Shopify, Stripe e altri.",
        },
        {
          title: "Usa e monitora",
          text: "Chatta con il tuo agente, segui le esecuzioni e controlla il consumo di token dal dashboard.",
        },
      ],
    },
  },

  contact: {
    badge: "Contatti",
    title: "Mettiti in contatto",
    subtitle:
      "Hai una domanda su AgentCloud, ti serve aiuto con la configurazione o vuoi esplorare una partnership? Ci piacerebbe sentirti.",
    emailUs: "Scrivici",
    scheduleCall: "Prenota una chiamata",
    bookDemo: "Prenota una demo",
    responseTime: "Tempi di risposta",
    reply24: "Rispondiamo entro 24 ore",
    weekdays: "Nei giorni feriali: in genere 2-4 ore",
    enterprise: "Enterprise: supporto dedicato",
    sendMessage: "Invia un messaggio",
    sendMessageHint: "Compila il modulo e ti ricontatteremo a breve.",
    name: "Nome",
    namePh: "Il tuo nome",
    email: "Email",
    emailPh: "tu@azienda.com",
    subject: "Oggetto",
    message: "Messaggio",
    messagePh: "Raccontaci di cosa hai bisogno...",
    sendButton: "Invia messaggio",
    successTitle: "Messaggio inviato!",
    successText:
      "Grazie, {name}. Abbiamo ricevuto il tuo messaggio e risponderemo entro 24 ore.",
    close: "Chiudi",
    reasons: [
      "Richiesta generale",
      "Vendite",
      "Supporto",
      "Partnership",
      "Altro",
    ],
    selected: "Selezionato: {subject}",
    somethingWrong: "Qualcosa è andato storto",
    failedSend: "Invio del messaggio non riuscito",
  },

  legal: {
    seeTerms: "Vedi i Termini di Servizio",
    seeRefunds: "Vedi la Politica di Rimborso",
    privacy: {
      backHome: "Torna alla home",
      title: "Informativa Privacy",
      lastUpdated: "Ultimo aggiornamento: agosto 2026",
      sections: [
        {
          heading: "1. Informazioni che raccogliamo",
          paragraphs: [
            "Quando crei un account su AgentCloud raccogliamo il tuo nome e la tua email. L'autenticazione è gestita da Supabase Auth: puoi registrarti con email e password oppure con il tuo account Google (in tal caso riceviamo nome ed email dal tuo profilo Google). Non memorizziamo le password in chiaro.",
            "Quando sottoscrivi un abbonamento, i pagamenti vengono processati da Stripe. Memorizziamo i dati di fatturazione: piano sottoscritto, importi, fatture, stato del pagamento e metodo di pagamento utilizzato. I numeri di carta non transitano mai sui nostri server.",
            "Raccogliamo i dati di utilizzo necessari a erogare il servizio e a calcolare i costi: contenuti delle chat con i tuoi agenti, strumenti utilizzati e consumo di token.",
            "Quando invii una richiesta demo, raccogliamo nome, cognome ed email per contattarti sui nostri servizi.",
          ],
        },
        {
          heading: "2. Come usiamo i tuoi dati",
          paragraphs: [
            "Usiamo i tuoi dati per fornire e migliorare i servizi AgentCloud, processare pagamenti e rimborsi tramite Stripe, applicare i limiti del tuo piano (consumo di token), inviarti email transazionali (benvenuto, fatturazione, supporto) e comunicare sul tuo account.",
            "Il contenuto delle chat viene inviato al fornitore AI (Anthropic Claude) esclusivamente per generare le risposte dell'agente. Non utilizziamo i contenuti delle chat per addestrare i nostri modelli.",
            "Non vendiamo mai i tuoi dati personali a terze parti.",
          ],
        },
        {
          heading: "3. Condivisione dei dati",
          paragraphs: [
            "Condividiamo i dati solo con i fornitori di servizi essenziali:",
            "Supabase — autenticazione e database; Stripe — pagamenti, fatturazione e rimborsi; Resend — consegna email transazionali; Google — accesso con account Google (OAuth); Anthropic — elaborazione delle conversazioni tramite Claude; Shopify e Google Calendar — solo se colleghi queste integrazioni ai tuoi agenti.",
          ],
        },
        {
          heading: "4. Conservazione dei dati",
          paragraphs: [
            "Conserviamo i tuoi dati finché il tuo account è attivo e per il tempo necessario a fornirti il servizio e a gestire fatturazione e supporto.",
            "I dati contabili e fiscali (fatture e transazioni) vengono conservati per il periodo previsto dalla legge applicabile, anche dopo la chiusura dell'account. Puoi richiedere la cancellazione del tuo account e dei dati associati in qualsiasi momento; i dati che la legge ci impone di conservare verranno mantenuti nel solo limite richiesto.",
          ],
        },
        {
          heading: "5. I tuoi diritti",
          paragraphs: [
            "Ai sensi del GDPR, hai il diritto di accedere, rettificare o cancellare i tuoi dati personali, di limitare o opporti al trattamento e di richiedere la portabilità dei dati. Per esercitare questi diritti, scrivici a privacy@agentcloud.io.",
            "Hai inoltre il diritto di proporre reclamo all'autorità di controllo competente (in Italia, il Garante per la protezione dei dati personali).",
          ],
        },
        {
          heading: "6. Contatti",
          paragraphs: ["Per richieste relative alla privacy: privacy@agentcloud.io"],
        },
      ],
    },
    terms: {
      backHome: "Torna alla home",
      title: "Termini di Servizio",
      lastUpdated: "Ultimo aggiornamento: agosto 2026",
      sections: [
        {
          heading: "1. Accettazione dei Termini",
          paragraphs: [
            "Accedendo o utilizzando AgentCloud (\"il Servizio\"), accetti di essere vincolato da questi Termini di Servizio. Se non sei d'accordo, non utilizzare il Servizio.",
          ],
        },
        {
          heading: "2. Descrizione del Servizio",
          paragraphs: [
            "AgentCloud offre servizi di distribuzione e gestione di agenti AI. Forniamo accesso in abbonamento ad agenti AI preconfigurati che automatizzano i workflow aziendali.",
          ],
        },
        {
          heading: "3. Registrazione dell'account",
          paragraphs: [
            "Devi fornire un indirizzo email valido per creare un account. Sei responsabile della riservatezza dell'accesso al tuo account. L'autenticazione è gestita da Supabase Auth: puoi registrarti con email e password oppure con il tuo account Google.",
          ],
        },
        {
          heading: "4. Abbonamenti e fatturazione",
          paragraphs: [
            "Ogni agente è venduto come abbonamento mensile separato, al prezzo indicato nella pagina dell'agente. Tutti i prezzi sono in EUR e IVA esclusa; l'IVA viene applicata ove richiesta dalla legge. Il canone viene addebitato in anticipo ogni mese tramite Stripe e l'abbonamento si rinnova automaticamente finché non viene annullato.",
            "Puoi annullare l'abbonamento in qualsiasi momento dalla dashboard o dal portale di fatturazione. La cancellazione ha effetto alla fine del periodo di fatturazione corrente: continuerai ad accedere all'agente fino a quella data e non verrai più addebitato.",
            "Ogni piano include un'allowance mensile di token. Il consumo oltre l'allowance viene addebitato a consumo al costo di €0,30 per 1.000 token aggiuntivi, fino a un tetto di sicurezza pari a 2 volte l'allowance del piano, oltre il quale le esecuzioni vengono sospese.",
            "Se un pagamento viene rifiutato o non va a buon fine, potremmo riprovare l'addebito sulla carta in archivio. In caso di mancato pagamento ci riserviamo il diritto di sospendere l'accesso all'agente e di terminare l'abbonamento, previa comunicazione.",
            "I prezzi e le condizioni dei piani possono cambiare nel tempo; le variazioni verranno comunicate in anticipo e si applicheranno a partire dal rinnovo successivo.",
          ],
        },
        {
          heading: "5. Rimborsi e diritto di recesso",
          paragraphs: [
            "AgentCloud fornisce servizi digitali: ai sensi della normativa europea sui diritti dei consumatori hai diritto di recesso entro 14 giorni dall'acquisto, ma tale diritto decade non appena il servizio inizia con il tuo consenso. Sottoscrivendo un abbonamento acconsenti all'avvio immediato del servizio: di conseguenza, gli abbonamenti già attivati non sono rimborsabili.",
            "I rimborsi vengono riconosciuti nei seguenti casi: addebiti errati o duplicati; prolungata indisponibilità del servizio imputabile ad AgentCloud (in tal caso il rimborso è proporzionale al periodo non usufruito).",
            "Le allowance di token non utilizzate non vengono riportate al mese successivo né rimborsate; i consumi a eccedenza già addebitati non sono rimborsabili.",
            "I rimborsi spettanti vengono erogati tramite il metodo di pagamento originale entro un termine ragionevole dall'accoglimento della richiesta. Per richiedere un rimborso scrivi a legal@agentcloud.io indicando l'email dell'account e l'importo contestato.",
          ],
        },
        {
          heading: "6. Uso consentito",
          paragraphs: [
            "Accetti di non: utilizzare il Servizio per scopi illegali; tentare di aggirare l'autenticazione o i controlli di accesso; effettuare reverse engineering, decompilazione o estrazione del codice sorgente dei nostri agenti; utilizzare il Servizio per generare spam, molestie o contenuti dannosi.",
          ],
        },
        {
          heading: "7. Limitazione di responsabilità",
          paragraphs: [
            "AgentCloud è fornito \"così com'è\" senza garanzie di alcun tipo. Non siamo responsabili di eventuali danni derivanti dall'uso degli agenti AI, inclusi a titolo esemplificativo perdita di dati, interruzione dell'attività o decisioni automatiche errate.",
          ],
        },
        {
          heading: "8. Modifiche ai Termini",
          paragraphs: [
            "Possiamo aggiornare questi termini in qualsiasi momento. L'uso continuato del Servizio dopo le modifiche costituisce accettazione dei nuovi termini.",
          ],
        },
        {
          heading: "9. Contatti",
          paragraphs: [
            "Per domande su questi termini, fatturazione o rimborsi: legal@agentcloud.io",
          ],
        },
      ],
    },
    refunds: {
      backHome: "Torna alla home",
      title: "Politica di Rimborso",
      lastUpdated: "Ultimo aggiornamento: agosto 2026",
      sections: [
        {
          heading: "1. Servizi digitali e diritto di recesso",
          paragraphs: [
            "AgentCloud fornisce servizi digitali. Ai sensi della normativa europea sui diritti dei consumatori hai diritto di recesso entro 14 giorni dall'acquisto, ma tale diritto decade non appena il servizio inizia con il tuo consenso.",
            "Sottoscrivendo un abbonamento acconsenti all'avvio immediato del servizio: di conseguenza, gli abbonamenti già attivati non sono rimborsabili.",
          ],
        },
        {
          heading: "2. Casi in cui spetta il rimborso",
          paragraphs: [
            "I rimborsi vengono riconosciuti nei seguenti casi:",
            "Addebiti errati o duplicati: l'importo contestato viene rimborsato integralmente.",
            "Prolungata indisponibilità del servizio imputabile ad AgentCloud: il rimborso è proporzionale al periodo non usufruito.",
          ],
        },
        {
          heading: "3. Casi in cui il rimborso non spetta",
          paragraphs: [
            "Le allowance di token non utilizzate non vengono riportate al mese successivo né rimborsate.",
            "I consumi a eccedenza (metered overage) già addebitati non sono rimborsabili.",
            "Gli abbonamenti attivati e utilizzati non sono rimborsabili, salvo i casi di cui sopra.",
          ],
        },
        {
          heading: "4. Come richiedere un rimborso",
          paragraphs: [
            "Per richiedere un rimborso scrivi a legal@agentcloud.io indicando l'email dell'account, l'agente/abbonamento interessato e l'importo contestato.",
            "Le richieste vengono valutate entro 5 giorni lavorativi dalla ricezione.",
          ],
        },
        {
          heading: "5. Tempi e modalità di erogazione",
          paragraphs: [
            "I rimborsi spettanti vengono erogati tramite il metodo di pagamento originale entro un termine ragionevole dall'accoglimento della richiesta (in genere 5-10 giorni lavorativi, secondo i tempi del circuito di pagamento).",
          ],
        },
        {
          heading: "6. Contatti",
          paragraphs: ["Per domande su fatturazione o rimborsi: legal@agentcloud.io"],
        },
      ],
    },
  },

  notifications: {
    title: "Notifiche",
    empty: "Nessuna notifica al momento",
    expiring: "L'abbonamento di {agent} scade tra {days} giorni",
    expiringOn: "Scade il {date}",
    cancelling: "L'abbonamento di {agent} è in cancellazione",
    cancellingOn: "Termina il {date}",
    manage: "Gestisci abbonamento",
    agentActions: {
      file_created: "{agent} ha creato il file {filename}",
      product_created:
        "{agent} ha pubblicato il prodotto \"{title}\" a €{price}",
      discount_created:
        "{agent} ha creato il codice sconto {code} ({value})",
      collection_updated:
        "{agent} ha aggiornato la collezione \"{collection}\" ({action} {count} prodotti)",
      inventory_updated:
        "{agent} ha aggiornato l'inventario di \"{product}\": {previous} → {new} unità",
      event_booked: "{agent} ha prenotato \"{title}\" ({start})",
      lead_submitted: "{agent} ha registrato un nuovo lead: {lead}",
      lead_notified: "{agent} ha avvisato il team vendite di un nuovo lead",
    },
    actions: {
      add: "aggiunti",
      remove: "rimossi",
    },
    markAllRead: "Segna tutte come lette",
    justNow: "adesso",
    minutesAgo: "{n} min",
    hoursAgo: "{n} h",
    daysAgo: "{n} g",
    email: {
      expiringSubject: "Il tuo abbonamento AgentCloud scade a breve",
      cancellingSubject: "Il tuo abbonamento AgentCloud è in cancellazione",
      expiringHeading: "Il tuo abbonamento sta per scadere",
      expiringBody:
        "Ciao {name}, il tuo abbonamento AgentCloud per {agent} scadrà il {date} (tra {days} giorni). Per continuare a usare i tuoi agenti, rinnova l'abbonamento dalla pagina di gestione.",
      cancellingHeading: "Il tuo abbonamento è in cancellazione",
      cancellingBody:
        "Ciao {name}, il tuo abbonamento AgentCloud per {agent} terminerà il {date}. Se vuoi continuare a usarlo, riattivalo dalla pagina di gestione.",
      cta: "Gestisci abbonamento",
    },
  },

  about: {
    backHome: "Torna alla home",
    badge: "Il nostro team",
    titleA: "Chi siamo:",
    titleB: "il team dietro AgentCloud",
    subtitle:
      "Siamo un team di giovani intraprendenti che ha deciso di aiutare le persone a risparmiare tempo su lavoro e studio grazie agli agenti cloud.",
    missionTitle: "La nostra missione",
    missionText:
      "Vogliamo rendere l'intelligenza artificiale utile nella vita reale: agenti cloud che ti affiancano nel lavoro e ti supportano nello studio, così puoi concentrarti su ciò che conta davvero.",
    teamIntro:
      "Dietro AgentCloud c'è un piccolo team unito dalla voglia di costruire strumenti semplici e davvero utili. Ognuno di noi contribuisce con le proprie competenze per portare gli agenti cloud a chiunque ne abbia bisogno.",
    members: [
      {
        name: "Il tuo nome",
        role: "Co-fondatore & CEO",
        bio: "Visione di prodotto e strategia.",
      },
      {
        name: "Il tuo nome",
        role: "Co-fondatore & CTO",
        bio: "Tecnologia e sviluppo degli agenti cloud.",
      },
      {
        name: "Il tuo nome",
        role: "Co-fondatore & COO",
        bio: "Operazioni, supporto e crescita.",
      },
    ],
    valuesTitle: "Cosa ci guida",
    values: [
      {
        title: "Semplicità",
        text: "Crediamo che l'AI debba essere per tutti, senza codice né complessità.",
      },
      {
        title: "Utilità reale",
        text: "Ogni agente cloud nasce per risolvere un problema concreto di lavoro o studio.",
      },
      {
        title: "Crescita delle persone",
        text: "Aiutiamo chi studia e chi lavora a fare di più, con meno fatica.",
      },
    ],
    ctaTitle: "Costruiamo il futuro del lavoro e dello studio, insieme.",
    ctaText:
      "Scopri i nostri agenti cloud o parlane direttamente con il team: siamo qui per aiutarti.",
    ctaDemo: "Prenota una demo",
    ctaContact: "Contattaci",
  },
};

export type Dictionary = typeof it;

export type FeatureItem = Dictionary["features"]["items"][number];

export const en: Dictionary = {
  common: {
    comingSoon: "Coming soon",
    comingSoonShort: "Coming soon",
    installs: "installs",
    setup: "Setup",
    view: "View",
    active: "Active",
    online: "Online",
    close: "Close",
    copy: "Copy",
    copied: "Copied!",
  },

  apiErrors: {
    unauthorized: "Unauthorized",
    invalidJson: "Invalid JSON body",
    missingAgentOrMessages: "Missing agentId or messages",
    agentNotFound: "Agent not found",
    rateLimited: "Too many requests. Please try again in a moment.",
    executionError: "An error occurred during agent execution",
    notSubscribed:
      "You don't have an active subscription for this agent. Subscribe to start using it.",
    subscriptionInactive:
      "Your subscription for this agent is {status}. Reactivate it to keep using it.",
    overageCapReached:
      "You've reached the monthly safety cap of {cap} tokens ({multiplier}x your plan allowance) for this agent. Contact us to raise your limit.",
    limitExceeded:
      "You've used your monthly allowance of {limit} tokens for this agent. Upgrade your plan to continue.",
    invalidEmail: "Invalid email",
    invalidPlan: "Invalid plan",
    missingAgentOrPlan: "Missing agentId or planId+vertical",
    paymentLinkNotConfigured: "Payment link not configured",
    failedToGeneratePaymentLink: "Failed to generate payment link",
    emailRequired: "Email is required",
    invalidEmailAddress: "Invalid email address",
    alreadyOnWaitlist: "This email is already on the waitlist",
    failedToJoinWaitlist: "Failed to join waitlist",
    invalidAccessCode: "Invalid access code",
    allFieldsRequired: "All fields are required",
    aiStreamError: "Error while streaming the response",
    aiConnectionFailed:
      "Could not reach the AI backend. Please try again later.",
    internalServerError: "Internal server error",
  },

  navbar: {
    marketplace: "Marketplace",
    solutions: "Solutions",
    integrations: "Integrations",
    browseAllAgents: "Browse all agents",
    logOut: "Log out",
    signIn: "Sign in",
    requestDemo: "Request demo",
    menu: "Menu",
    solutionsItems: [
      {
        title: "Shopify & E-commerce",
        text: "Find products, build cart links, and check order status.",
      },
      {
        title: "Lead Capture",
        text: "Capture contacts from forms and your site automatically.",
      },
      {
        title: "Product & Order Support",
        text: "Answer product and order questions 24/7.",
      },
      {
        title: "Lead Qualification",
        text: "Enrich contacts and notify sales with the right context.",
      },
    ],
    integrationsItems: [
      "Gmail",
      "Google Calendar",
      "HubSpot",
      "Slack",
      "Shopify",
      "Stripe",
      "Notion",
      "Google Sheets",
    ],
    pricingItems: [
      { plan: "Starter", price: "€29/mo", text: "One workflow agent" },
      { plan: "Growth", price: "€39/mo", text: "Agent plus integrations" },
      { plan: "Custom", price: "Custom", text: "Multi-agent systems" },
    ],
  },

  footer: {
    tagline: "AgentCloud — The AI Agent Platform",
    follow: "FOLLOW",
    company: "COMPANY",
    about: "About",
    faq: "FAQ",
    contact: "Contact",
    phone: "+39 351 986 3021",
    email: "info@agentcloud.agency",
    rights: "© 2026 AgentCloud. All rights reserved.",
    privacy: "Privacy",
    terms: "Terms",
    refunds: "Refund Policy",
  },

  hero: {
    titleA: "Run Your Business",
    titleConnector: "with",
    titleB: "AI Execution",
    subtitle:
      "Ask for anything. Our AI will plan it, execute it, and connect it to your tools.",
    placeholderEmpty: "Tell us what you'd like to automate...",
    placeholderContinued: "Continue the conversation...",
    sendMessage: "Send message",
    openFullChat: "Open full chat",
    aiError:
      "The AI service is unavailable right now. Please try again shortly.",
    chips: [
      "E-commerce",
      "Shopify",
      "Sales & Leads",
      "Lead capture",
      "Order status",
    ],
    roles: [
      "Product Manager",
      "Developer",
      "Marketer",
      "Sales Rep",
      "Solo Founder",
      "Designer",
      "Data Analyst",
      "Customer Success",
      "Community Lead",
      "Finance Ops",
      "Operations",
      "Course Creator",
    ],
  },

  features: {
    badge: "Automations",
    titleA: "One platform,",
    titleB: "every task automated",
    subtitle:
      "AgentCloud integrates with the tools you already use — from productivity suites to CRMs.",
    cta: "Deploy Your First Agent",
    items: [
      {
        quote: '"Customers often ask about product details"',
        title: "Shopify Product Assistant",
        description:
          "The Shopify agent answers product and order questions directly in chat, 24/7.",
        card: {
          variant: "chat",
          title: "Agent conversation",
          userBubble: "Is this product available in size 42?",
          agentBubble: "I'll search the catalog and build you a cart link.",
          summaryTitle: "Request summary",
          rows: [
            { label: "Products found", n: 4 },
            { label: "Cart links built", n: 3 },
            { label: "Availability checked", n: 4 },
          ],
        },
      },
      {
        quote: '"I want customers to buy in one click"',
        title: "Direct Cart Links",
        description:
          "Find products in the catalog and generate direct cart links you can share anywhere.",
        card: {
          variant: "campaigns",
          title: "Cart links generated",
          rows: [
            { name: "Running Shoes", channel: "Shopify", reach: "32 clicks" },
            { name: "Logo Hoodie", channel: "Shopify", reach: "18 clicks" },
            { name: "Water Bottle", channel: "Shopify", reach: "27 clicks" },
          ],
        },
      },
      {
        quote: '"Customers want to know where their orders are"',
        title: "Real-time Order Status",
        description:
          "Check order status with order number and email, and answer in seconds.",
        card: {
          variant: "email",
          title: "Order status",
          status: "Verified",
          rows: [
            { label: "Order #1042", sub: "Shipped · delivery Friday" },
            { label: "Order #1047", sub: "Preparing" },
            { label: "Order #1049", sub: "Delivered" },
          ],
        },
      },
      {
        quote: '"I\'m losing the contacts that come from my site"',
        title: "Automatic Lead Capture",
        description:
          "The lead capture agent collects prospect details and enriches them with the right context.",
        card: {
          variant: "leads",
          title: "Lead pipeline",
          todayBadge: "+12 today",
          leads: [
            { initials: "SM", name: "Sara M.", time: "2m ago", status: "New" },
            { initials: "JR", name: "Giacomo R.", time: "15m ago", status: "Qualified" },
            { initials: "LK", name: "Laura K.", time: "1h ago", status: "Enriched" },
          ],
          conversionLabel: "Capture rate",
        },
      },
      {
        quote: '"Sales find out about leads too late"',
        title: "Sales Notifications",
        description:
          "When a lead arrives, the sales team is notified on Slack with all the details.",
        card: {
          variant: "projects",
          title: "Sales notifications",
          rows: [
            { label: "Lead #231", sub: "Slack · 2m ago" },
            { label: "Lead #230", sub: "Slack · 18m ago" },
            { label: "Lead #229", sub: "Enriched with LinkedIn" },
          ],
        },
      },
      {
        quote: '"I only want leads that matter"',
        title: "Lead Qualification",
        description:
          "Enrich contacts and score each lead so you focus only on those ready to buy.",
        card: {
          variant: "chat",
          title: "Lead analysis",
          userBubble: "Which leads are ready to buy today?",
          agentBubble: "I'll analyze the leads and flag the highest potential.",
          summaryTitle: "Qualified leads",
          rows: [
            { label: "High potential", n: 6 },
            { label: "Nurture", n: 9 },
            { label: "Discard", n: 3 },
          ],
        },
      },
    ],
  },

  integrations: {
    badge: "Integrations",
    titleA: "Works with the tools",
    titleB: "your team already uses",
    subtitle:
      "AgentCloud connects with the platforms your business runs on — from productivity tools to CRMs, communication apps to automation workflows.",
    cta: "Explore AgentCloud Integrations",
    categories: {
      "E-commerce": "E-commerce",
      Payments: "Payments",
      Messaging: "Messaging",
      "Social & Ads": "Social & Ads",
      Advertising: "Advertising",
      Analytics: "Analytics",
      Calendar: "Calendar",
      Meetings: "Meetings",
      "Email Service": "Email Service",
      "Email Marketing": "Email Marketing",
      Scheduling: "Scheduling",
      CRM: "CRM",
    },
  },

  marketplace: {
    badge: "AI Agent Store",
    titleA: "Pick an agent.",
    titleB: "Deploy a business workflow.",
    subtitle:
      "A marketplace of ready-to-launch AI agents that plan tasks, execute workflows, and connect to the tools your team already uses.",
    quickSolutions: [
      {
        title: "Shopify Agent",
        description: "Search products and build cart links",
      },
      {
        title: "Order Status",
        description: "Check order status in real time",
      },
      {
        title: "Lead Capture",
        description: "Capture leads from your site and notify sales",
      },
      {
        title: "Lead Qualification",
        description: "Enrich and qualify contacts automatically",
      },
    ],
    browseAll: "Browse all agents",
    customTitle: "Need a custom agent?",
    customText:
      "Tell us the workflow. We design the agent, connect your tools, and ship the automation.",
    buildCustom: "Build custom",
  },

  cta: {
    titleA: "Launch your first",
    titleB: "AI agent workflow.",
    subtitle:
      "Pick an agent, connect your tools, and turn repetitive business work into an automated system.",
    browseMarketplace: "Browse marketplace",
    seeDashboard: "See dashboard",
  },

  faq: {
    badge: "FAQ",
    titleA: "Frequently asked",
    titleB: "questions",
    stillQuestions: "Still have questions?",
    contactSupport: "Contact support",
    items: [
      {
        q: "What is AgentCloud?",
        a: "AgentCloud is an AI agent platform designed to help businesses automate operations, reduce overhead, and create room for growth. We offer pre-built and customizable AI agents that integrate with the tools you already use.",
      },
      {
        q: "Who is AgentCloud for?",
        a: "AgentCloud is built for founders, operations teams, and SMBs who want to leverage AI without hiring developers or building solutions from scratch.",
      },
      {
        q: "What kind of business tasks can AgentCloud automate?",
        a: "AgentCloud can automate Shopify e-commerce — product search, cart links, and order status — plus lead capture and qualification, with automatic sales notifications.",
      },
      {
        q: "Are these ready-to-use or custom solutions?",
        a: "Both. You get access to pre-configured agents you can activate immediately, plus the ability to customize them to your specific workflows.",
      },
      {
        q: "How do I know which solution is right for my business?",
        a: "Book a free demo with our team. We'll analyze your processes and recommend the best agents for your needs.",
      },
      {
        q: "How long does setup take?",
        a: "Most agents can be activated within hours. More complex configurations with multiple integrations may take 1–3 business days.",
      },
      {
        q: "What tools does AgentCloud integrate with?",
        a: "AgentCloud integrates with Shopify, Stripe, Slack, Gmail, HubSpot, Salesforce, Zapier, and WhatsApp, with many more integrations on the way.",
      },
      {
        q: "Do I need technical skills to use it?",
        a: "No. AgentCloud is designed to be accessible to everyone. No coding or technical expertise is required to set up and use our agents.",
      },
    ],
  },

  dashboardSection: {
    badge: "Agent operations",
    title: "Manage every installed agent from one clean dashboard.",
    subtitle:
      "Track status, workflow runs, alerts, and integration health without leaving the marketplace.",
    openDashboard: "Open dashboard",
    sidebar: ["Overview", "Agents", "Integrations", "Runs", "Billing"],
    stats: [
      ["5", "Installed agents"],
      ["2,710", "Total runs"],
      ["98.3%", "Avg success"],
      ["412,306", "Tokens this month"],
    ],
    agentsHeading: "Your agents",
    recentActivity: "Recent activity",
    events: [
      [
        "2 min ago",
        "Shopify Agent applied the ESTATE20 discount code and generated 3 cart links for the summer collection.",
      ],
      [
        "18 min ago",
        "Support Agent resolved 4 tickets from the knowledge base and escalated 1 refund to the human team.",
      ],
      [
        "1 hour ago",
        "Lead Capture Agent captured 9 leads from the contact form and alerted sales on Slack.",
      ],
      [
        "3 hours ago",
        "Copywriter delivered 3 hero variants and 6 headlines for the launch landing page.",
      ],
      [
        "yesterday",
        "Email Manager triaged 214 emails and set 5 reminders for this week's commitments.",
      ],
    ],
    agents: [
      ["Shopify Agent", "Active", "1,284 runs", "98.7%", "2 min ago"],
      ["Support Agent", "Active", "512 runs", "99.2%", "18 min ago"],
      [
        "Lead Capture Agent",
        "Active",
        "438 runs",
        "96.1%",
        "1 hour ago",
      ],
      ["Copywriter", "Active", "287 runs", "97.5%", "3 hours ago"],
      ["Email Manager", "Active", "189 runs", "98.9%", "yesterday"],
    ],
  },

  agentCard: {
    comingSoon: "Coming soon",
    installs: "installs",
    setup: "Setup",
    view: "View",
    buy: "Buy",
  },

  agentPreview: {
    livePreview: "Live preview",
    demoMode: "Demo mode",
    readyToSimulate: "Ready to simulate {name} on a real business task.",
    runningWorkflow: "Running workflow...",
    workflowCompleted: "Workflow completed",
    running: "Running...",
    runAgain: "Run again",
    runPreview: "Run preview",
  },

  chat: {
    newChat: "New Chat",
    home: "Home",
    chat: "Chat",
    tools: "Tools",
    agents: "Agents",
    conversations: "Conversations",
    noConversations: "No conversations yet. Start a new chat!",
    thinking: "Thinking...",
    online: "Online",
    emptyTitle: "What would you like to automate?",
    emptySubtitle:
      "Ask me anything about automating your business. I can help with emails, support, leads, and more.",
    placeholder: "Message your AI Agent...",
    sendMessage: "Send message",
    disclaimer:
      "AgentCloud AI may produce inaccurate information. Verify critical data.",
    closeSidebar: "Close sidebar",
    openSidebar: "Open sidebar",
    deleteConversation: "Delete conversation",
    newChatTitle: "New Chat",
  },

  agentChat: {
    notFoundTitle: "Agent not found",
    notFoundSubtitle: "This agent does not exist or has been removed.",
    startTyping: "Start typing to interact with this agent",
    attachFile: "Attach file",
    disclaimer: "AgentCloud AI may produce inaccurate information",
    using: "Using",
    connectionError: "Connection error. Please try again.",
    messagePlaceholder: "Message {name}...",
  },

  publicChat: {
    poweredBy: "Powered by",
    askMe: "Ask me anything — I'm here to help",
    attachFile: "Attach file",
    messagePlaceholder: "Ask {name}...",
    backToChat: "AgentCloud",
    somethingWentWrong: "Something went wrong. Please try again.",
    connectionError: "Connection error. Please try again.",
  },

  agentsPage: {
    badge: "Agent marketplace",
    title: "AI agents built to automate business workflows.",
    subtitle:
      "Choose from pre-configured AI agents for marketing, operations, support, finance and more. Each agent can use research, file uploads and tool actions to get work done.",
    startChat: "Start a chat",
    requestDemo: "Request a demo",
    availableNow: "Available now",
    comingSoon: "Coming soon",
    agentsCount: "{count} agents",
  },

  agentDetail: {
    backToMarketplace: "Back to marketplace",
    forIndustry: "For {industry}",
    configureAgent: "Configure agent",
    tryPreview: "Try preview",
    rating: "Rating",
    installs: "Installs",
    setup: "Setup",
    ratedBy: "Rated by teams using this workflow weekly",
    typicalLaunch: "Typical launch time: {setupTime}",
    gdprNote: "Built for GDPR-aware business workflows",
    setupPrice: "Setup price",
    whatAutomates: "What this agent automates",
    howItWorks: "How it works",
    howItWorksDesc:
      "{name} follows a structured workflow to deliver results every time.",
    useCases: "Use case examples",
    useCasesDesc: "Real scenarios where {name} delivers value out of the box.",
    integrationsTitle: "Integrations",
    integrationsDesc: "{name} connects directly with your existing tool stack.",
    faqTitle: "Frequently asked questions",
    moreIn: "More in {category}",
    relatedDesc: "Other agents designed for the same workflow area.",
    readyToDeploy: "Ready to deploy {name}?",
    readyToDeployDesc:
      "Set up in minutes, no code required. Start automating your {category} workflows today.",
    configureAndDeploy: "Configure and deploy",
    askOurAi: "Ask our AI",
  },

  deploy: {
    steps: ["Configure", "Connect tools", "Review"],
    backToAgent: "Back to agent",
    configureTitle: "Configure {name}",
    agentSettings: "Agent settings",
    agentSettingsDesc: "Customize how this agent behaves",
    businessName: "Business name",
    mainGoal: "Main goal",
    tone: "Tone",
    toneOptions: [
      "Professional and concise",
      "Friendly and casual",
      "Formal and detailed",
      "Humorous and creative",
    ],
    escalation: "Escalation rule",
    escalationOptions: [
      "Ask before high-impact actions",
      "Auto-approve all actions",
      "Manual approval always required",
      "Notify me but proceed",
    ],
    connectTools: "Connect tools",
    connectToolsDesc: "Link the services this agent will use",
    recommended: "Recommended",
    optional: "Optional",
    connect: "Connect",
    deploymentSummary: "Deployment summary",
    reviewBefore: "Review before requesting",
    agent: "Agent",
    category: "Category",
    setupTime: "Setup time",
    starter: "Starter",
    growth: "Growth",
    popular: "Popular",
    requestDemo: "Request demo",
    flowNote:
      "This flow now routes interested buyers to a live demo request form.",
    deliveryOptions: "Delivery options",
    deliveryOptionsDesc: "Choose how your customers reach this agent",
    directLink: "Direct link",
    directLinkDesc:
      "Share this link anywhere — QR code, Instagram bio, Google Business Profile, email signature.",
    embedScript: "Embed script",
    embedScriptDesc:
      "Paste this snippet just before <code>&lt;/body&gt;</code> on your website.",
    copy: "Copy",
    copied: "Copied!",
    toolsBase: "Vertical tool base",
    leadCapture: "Lead capture",
    fullTools: "Full vertical tools",
    prioritySupport: "Priority support",
    consentPrefix: "I accept the",
    consentTerms: "Terms of Service",
    consentConjunction: "and the",
    consentPrivacy: "Privacy Policy",
  },

  dashboard: {
    welcomeBack: "Welcome back, {name}",
    welcomeBackGeneric: "Welcome back",
    myAgents: "My Agents",
    tagline:
      "Track status, recent runs, connected workflows, and agent performance from one place.",
    installAgent: "Install agent",
    installedAgents: "Installed agents",
    noAgentsTitle: "No agents installed yet",
    noAgentsSubtitle:
      "Browse the marketplace and install your first agent to start automating your workflows.",
    browseAgents: "Browse agents",
    dashboardUnavailable: "Dashboard data unavailable",
    dashboardUnavailableDesc:
      "Set the Supabase environment variables to see your installed agents and usage here.",
    active: "Active",
    runs: "{count} runs",
    tokens: "{count} tok",
    lastRun: "{time} ago",
    monthlyUsage: "Monthly usage",
    usageEmpty: "Usage will appear here once you install an agent.",
    usageEmptyDesc: "Connect Supabase to track usage and limits.",
    controlCenter: "Agent control center",
    controlCenterDesc:
      "Limits are enforced on tokens: each plan sets a monthly token budget (input + output) per installed agent. Usage above the allowance is billed automatically at {rate} per 1.000 tokens via Stripe, with a safety cap at 2x the allowance.",
    gettingStarted: "Getting started",
    gettingStartedSteps: [
      "Browse marketplace",
      "Install your first agent",
      "Configure integrations",
      "View your dashboard",
    ],
    manageSubscription: "Manage subscription",
    billingError:
      "We couldn't open the billing portal. Make sure you have an active subscription, and contact us if the problem persists.",
    cancelsAtPeriodEnd: "Cancels at period end",
    aboveAllowance: "Above allowance — billed at {rate}/1.000 tokens",
    overageAmount: " (+{count} in overage)",
    overageThisMonth: "(≈ €{amount} this month)",
    statInstalledAgents: "Installed agents",
    statRunsThisMonth: "Runs this month",
    statTokensUsed: "Tokens used",
    statActiveAgents: "Active agents",
    justNow: "just now",
    minutesAgo: "{n} min",
    hoursAgo: "{n} h",
    daysAgo: "{n} d",
  },

  auth: {
    login: {
      title: "Welcome back",
      hint: "Sign in with email and password or with Google",
      email: "Email",
      emailPlaceholder: "you@company.com",
      password: "Password",
      passwordPlaceholder: "Your password",
      submit: "Sign in",
      google: "Continue with Google",
      prompt: "Don't have an account yet?",
      link: "Sign up",
      forgot: "Forgot password?",
      resetSent: "We sent you a link to reset your password.",
    },
    signup: {
      title: "Create your account",
      hint: "Sign up with email and password or with Google",
      name: "Name (optional)",
      namePlaceholder: "John Doe",
      email: "Email",
      emailPlaceholder: "you@company.com",
      password: "Password",
      passwordPlaceholder: "At least 8 characters",
      submit: "Create account",
      google: "Continue with Google",
      prompt: "Already have an account?",
      link: "Sign in",
      checkEmail: "Check your email to confirm your registration.",
    },
    errors: {
      invalidCredentials: "Invalid email or password.",
      signupFailed: "Sign up failed. Please try again.",
      googleFailed: "Google sign-in failed.",
      network: "Network error. Please try again.",
      authCallbackFailed: "Invalid or expired link. Please sign in again.",
    },
    resetPassword: {
      title: "Reset your password",
      hint: "Enter a new password for your account.",
      newPassword: "New password",
      newPasswordPlaceholder: "At least 8 characters",
      submit: "Update password",
      invalidLink: "Invalid or expired link. Request a new one from the sign-in page.",
      success: "Password updated successfully. You can now sign in.",
      updateFailed: "Could not update the password. Please try again.",
      backToLogin: "Back to sign in",
    },
  },

  waitlist: {
    limitedAccess: "Limited access",
    title: "Join the",
    titleAccent: "Waitlist",
    subtitle:
      "Be among the first to experience AI-powered automation. Limited spots available.",
    takenSpots: "Spots Taken",
    successTitle: "You're on the list!",
    successText: "We'll notify you when AgentCloud is ready.",
    fullTitle: "Waitlist is Full",
    fullText: "All spots have been taken. Check back later!",
    emailButton: "Email us",
    emailModalTitle: "Send us a message",
    emailModalPlaceholder: "Write your message here...",
    emailModalSend: "Send email",
    emailModalCancel: "Cancel",
    placeholder: "Enter your email or access code",
    joining: "Joining...",
    joinWaitlist: "Join Waitlist",
    agreeNote:
      "By joining, you agree to receive updates about AgentCloud.",
    alreadyOnList: "This email is already on the waitlist",
    somethingWrong: "Something went wrong",
    networkError: "Network error. Please try again.",
  },

  demo: {
    badge: "Demo",
    titleA: "See AgentCloud",
    titleB: "in action.",
    subtitle:
      "Book a personalized walkthrough. We'll show you how AI agents can automate your support, sales, finance, and operational workflows — no code required.",
    benefits: [
      {
        title: "AI-powered automation",
        text: "Deploy agents that handle support, sales, finance, and operations autonomously.",
      },
      {
        title: "Enterprise-grade security",
        text: "Your data is encrypted, isolated, and compliant with industry standards.",
      },
      {
        title: "Measurable results",
        text: "Track runs, success rates, and ROI from a single dashboard.",
      },
    ],
    whatToExpect: "What to expect",
    expectations: [
      "30-minute live demo tailored to your business",
      "Walkthrough of pre-built agents and custom workflows",
      "Q&A with our product team",
      "No commitment — explore at your pace",
    ],
    requestDemo: "Request a demo",
    requestDemoHint:
      "Fill in your details and we'll get back to you within 24 hours.",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    firstNamePh: "John",
    lastNamePh: "Doe",
    emailPh: "john@company.com",
    requestButton: "Request demo",
    scheduleNote: "We'll reach out to schedule a personalized demo",
    successTitle: "Request sent!",
    successText:
      "Thanks, {name}. We've received your demo request and will reach out within 24 hours.",
    close: "Close",
    failedRequest: "Failed to send request",
    somethingWrong: "Something went wrong",
    howToUse: {
      badge: "How it works",
      titleA: "From first contact",
      titleB: "to your active agent",
      subtitle:
        "We guide you step by step — no technical skills required.",
      steps: [
        {
          title: "Request the demo",
          text: "Fill in the form on this page: we'll get back to you within 24 hours to understand your needs.",
        },
        {
          title: "Buy your plan",
          text: "Choose the agent and plan that fit best. Secure payment via Stripe with instant activation.",
        },
        {
          title: "Access the dashboard",
          text: "After checkout the agent appears among your installed agents, ready to use.",
        },
        {
          title: "Configure and connect tools",
          text: "Customize the agent's tone and goals, then connect your tools: Gmail, Slack, Shopify, Stripe and more.",
        },
        {
          title: "Use and monitor",
          text: "Chat with your agent, follow its runs and track token usage from the dashboard.",
        },
      ],
    },
  },

  contact: {
    badge: "Contact",
    title: "Get in touch",
    subtitle:
      "Have a question about AgentCloud, need help with setup, or want to explore a partnership? We'd love to hear from you.",
    emailUs: "Email us",
    scheduleCall: "Schedule a call",
    bookDemo: "Book a demo",
    responseTime: "Response time",
    reply24: "We reply within 24 hours",
    weekdays: "Weekdays: typically 2-4 hours",
    enterprise: "Enterprise: dedicated support",
    sendMessage: "Send a message",
    sendMessageHint: "Fill in the form and we'll get back to you shortly.",
    name: "Name",
    namePh: "Your name",
    email: "Email",
    emailPh: "you@company.com",
    subject: "Subject",
    message: "Message",
    messagePh: "Tell us what you need...",
    sendButton: "Send message",
    successTitle: "Message sent!",
    successText:
      "Thanks, {name}. We've received your message and will reply within 24 hours.",
    close: "Close",
    reasons: ["General inquiry", "Sales", "Support", "Partnership", "Other"],
    selected: "Selected: {subject}",
    somethingWrong: "Something went wrong",
    failedSend: "Failed to send message",
  },

  legal: {
    seeTerms: "See the Terms of Service",
    seeRefunds: "See the Refund Policy",
    privacy: {
      backHome: "Back to home",
      title: "Privacy Policy",
      lastUpdated: "Last updated: August 2026",
      sections: [
        {
          heading: "1. Information We Collect",
          paragraphs: [
            "When you create an AgentCloud account, we collect your name and email address. Authentication is handled by Supabase Auth: you can sign up with email and password, or with your Google account (in which case we receive your name and email from your Google profile). We do not store passwords in plain text.",
            "When you subscribe, payments are processed by Stripe. We store billing data: subscribed plan, amounts, invoices, payment status, and the payment method used. Card numbers never pass through our servers.",
            "We collect the usage data needed to provide the service and calculate costs: chat content with your agents, tools used, and token consumption.",
            "When you submit a demo request, we collect your name, surname, and email to contact you about our services.",
          ],
        },
        {
          heading: "2. How We Use Your Data",
          paragraphs: [
            "We use your data to provide and improve AgentCloud services, process payments and refunds via Stripe, enforce your plan limits (token usage), send you transactional emails (welcome, billing, support), and communicate about your account.",
            "Chat content is sent to the AI provider (Anthropic Claude) solely to generate the agent's responses. We do not use chat content to train our models.",
            "We never sell your personal data to third parties.",
          ],
        },
        {
          heading: "3. Data Sharing",
          paragraphs: [
            "We share data only with essential service providers:",
            "Supabase — authentication and database; Stripe — payments, billing, and refunds; Resend — transactional email delivery; Google — Google account sign-in (OAuth); Anthropic — conversation processing via Claude; Shopify and Google Calendar — only if you connect these integrations to your agents.",
          ],
        },
        {
          heading: "4. Data Retention",
          paragraphs: [
            "We retain your data for as long as your account is active and for as long as needed to provide the service and manage billing and support.",
            "Accounting and tax records (invoices and transactions) are retained for the period required by applicable law, even after account closure. You may request deletion of your account and associated data at any time; data we are legally required to keep will be retained only to the extent required.",
          ],
        },
        {
          heading: "5. Your Rights",
          paragraphs: [
            "Under GDPR, you have the right to access, rectify, or erase your personal data, to restrict or object to processing, and to request data portability. To exercise these rights, contact us at privacy@agentcloud.io.",
            "You also have the right to lodge a complaint with the competent supervisory authority.",
          ],
        },
        {
          heading: "6. Contact",
          paragraphs: ["For privacy-related inquiries: privacy@agentcloud.io"],
        },
      ],
    },
    terms: {
      backHome: "Back to home",
      title: "Terms of Service",
      lastUpdated: "Last updated: August 2026",
      sections: [
        {
          heading: "1. Acceptance of Terms",
          paragraphs: [
            "By accessing or using AgentCloud (\u201cthe Service\u201d), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.",
          ],
        },
        {
          heading: "2. Description of Service",
          paragraphs: [
            "AgentCloud provides AI agent deployment and management services. We offer subscription-based access to pre-built AI agents that automate business workflows.",
          ],
        },
        {
          heading: "3. Account Registration",
          paragraphs: [
            "You must provide a valid email address to create an account. You are responsible for maintaining the confidentiality of your account access. Authentication is handled by Supabase Auth: you can sign up with email and password, or with your Google account.",
          ],
        },
        {
          heading: "4. Subscriptions and Billing",
          paragraphs: [
            "Each agent is sold as a separate monthly subscription at the price shown on the agent page. All prices are in EUR and exclusive of applicable taxes; VAT is applied where required by law. Fees are billed in advance each month via Stripe and subscriptions renew automatically until cancelled.",
            "You may cancel your subscription at any time from the dashboard or billing portal. Cancellation takes effect at the end of the current billing period: you keep access to the agent until that date and are not charged again.",
            "Each plan includes a monthly token allowance. Usage beyond the allowance is billed on a metered basis at €0.30 per 1,000 extra tokens, up to a safety cap of 2x the plan allowance, beyond which executions are suspended.",
            "If a payment is declined or fails, we may retry the charge on the card on file. In case of non-payment we reserve the right to suspend access to the agent and terminate the subscription, with prior notice.",
            "Prices and plan terms may change over time; changes will be communicated in advance and apply from the next renewal.",
          ],
        },
        {
          heading: "5. Refunds and Withdrawal Right",
          paragraphs: [
            "AgentCloud provides digital services: under EU consumer law you have a withdrawal right within 14 days of purchase, but it lapses as soon as the service begins with your consent. By subscribing you consent to the immediate start of the service: accordingly, activated subscriptions are non-refundable.",
            "Refunds are granted in the following cases: incorrect or duplicate charges; prolonged service unavailability attributable to AgentCloud (in which case the refund is prorated for the unused period).",
            "Unused token allowances do not carry over to the next month and are not refunded; metered overage charges already billed are non-refundable.",
            "Due refunds are issued via the original payment method within a reasonable time after approval. To request a refund, write to legal@agentcloud.io with the account email and the disputed amount.",
          ],
        },
        {
          heading: "6. Acceptable Use",
          paragraphs: [
            "You agree not to: use the Service for any illegal purpose; attempt to bypass authentication or access controls; reverse-engineer, decompile, or extract the source code of our agents; use the Service to generate spam, harassment, or harmful content.",
          ],
        },
        {
          heading: "7. Limitation of Liability",
          paragraphs: [
            "AgentCloud is provided \u201cas is\u201d without warranty of any kind. We are not liable for any damages arising from the use of AI agents, including but not limited to data loss, business interruption, or incorrect automated decisions.",
          ],
        },
        {
          heading: "8. Changes to Terms",
          paragraphs: [
            "We may update these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.",
          ],
        },
        {
          heading: "9. Contact",
          paragraphs: [
            "For questions about these terms, billing, or refunds: legal@agentcloud.io",
          ],
        },
      ],
    },
    refunds: {
      backHome: "Back to home",
      title: "Refund Policy",
      lastUpdated: "Last updated: August 2026",
      sections: [
        {
          heading: "1. Digital Services and Withdrawal Right",
          paragraphs: [
            "AgentCloud provides digital services. Under EU consumer law you have a withdrawal right within 14 days of purchase, but it lapses as soon as the service begins with your consent.",
            "By subscribing you consent to the immediate start of the service: accordingly, activated subscriptions are non-refundable.",
          ],
        },
        {
          heading: "2. Cases Where a Refund Is Due",
          paragraphs: [
            "Refunds are granted in the following cases:",
            "Incorrect or duplicate charges: the disputed amount is refunded in full.",
            "Prolonged service unavailability attributable to AgentCloud: the refund is prorated for the unused period.",
          ],
        },
        {
          heading: "3. Cases Where a Refund Is Not Due",
          paragraphs: [
            "Unused token allowances do not carry over to the next month and are not refunded.",
            "Metered overage charges already billed are non-refundable.",
            "Activated and used subscriptions are non-refundable, except for the cases above.",
          ],
        },
        {
          heading: "4. How to Request a Refund",
          paragraphs: [
            "To request a refund, write to legal@agentcloud.io with the account email, the agent/subscription concerned, and the disputed amount.",
            "Requests are reviewed within 5 business days of receipt.",
          ],
        },
        {
          heading: "5. Timing and Method of Payment",
          paragraphs: [
            "Due refunds are issued via the original payment method within a reasonable time after approval (typically 5-10 business days, depending on the payment network).",
          ],
        },
        {
          heading: "6. Contact",
          paragraphs: ["For billing or refund questions: legal@agentcloud.io"],
        },
      ],
    },
  },

  notifications: {
    title: "Notifications",
    empty: "No notifications right now",
    expiring: "{agent} subscription expires in {days} days",
    expiringOn: "Expires on {date}",
    cancelling: "{agent} subscription is being cancelled",
    cancellingOn: "Ends on {date}",
    manage: "Manage subscription",
    agentActions: {
      file_created: "{agent} created the file {filename}",
      product_created:
        "{agent} published the product \"{title}\" at €{price}",
      discount_created:
        "{agent} created the discount code {code} ({value})",
      collection_updated:
        "{agent} updated the collection \"{collection}\" ({action} {count} products)",
      inventory_updated:
        "{agent} updated inventory for \"{product}\": {previous} → {new} units",
      event_booked: "{agent} booked \"{title}\" ({start})",
      lead_submitted: "{agent} captured a new lead: {lead}",
      lead_notified:
        "{agent} alerted the sales team about a new lead",
    },
    actions: {
      add: "added",
      remove: "removed",
    },
    markAllRead: "Mark all as read",
    justNow: "just now",
    minutesAgo: "{n} min",
    hoursAgo: "{n} h",
    daysAgo: "{n} d",
    email: {
      expiringSubject: "Your AgentCloud subscription expires soon",
      cancellingSubject: "Your AgentCloud subscription is being cancelled",
      expiringHeading: "Your subscription is about to expire",
      expiringBody:
        "Hi {name}, your AgentCloud subscription for {agent} will expire on {date} (in {days} days). To keep using your agents, renew your subscription from the billing page.",
      cancellingHeading: "Your subscription is being cancelled",
      cancellingBody:
        "Hi {name}, your AgentCloud subscription for {agent} will end on {date}. If you want to keep using it, reactivate it from the billing page.",
      cta: "Manage subscription",
    },
  },

  about: {
    backHome: "Back to home",
    badge: "Our team",
    titleA: "About:",
    titleB: "the team behind AgentCloud",
    subtitle:
      "We are a team of enterprising young people who decided to help others save time on work and study through cloud agents.",
    missionTitle: "Our mission",
    missionText:
      "We want to make artificial intelligence useful in real life: cloud agents that support you at work and assist you in your studies, so you can focus on what truly matters.",
    teamIntro:
      "Behind AgentCloud is a small team united by the desire to build simple, genuinely useful tools. Each of us contributes our skills to bring cloud agents to anyone who needs them.",
    members: [
      {
        name: "Your name",
        role: "Co-founder & CEO",
        bio: "Product vision and strategy.",
      },
      {
        name: "Your name",
        role: "Co-founder & CTO",
        bio: "Technology and cloud agent development.",
      },
      {
        name: "Your name",
        role: "Co-founder & COO",
        bio: "Operations, support and growth.",
      },
    ],
    valuesTitle: "What guides us",
    values: [
      {
        title: "Simplicity",
        text: "We believe AI should be for everyone — no code, no complexity.",
      },
      {
        title: "Real usefulness",
        text: "Every cloud agent is built to solve a concrete work or study problem.",
      },
      {
        title: "People's growth",
        text: "We help students and workers do more, with less effort.",
      },
    ],
    ctaTitle: "Let's build the future of work and study, together.",
    ctaText:
      "Explore our cloud agents or talk to the team directly — we're here to help.",
    ctaDemo: "Book a demo",
    ctaContact: "Contact us",
  },
};

export function getDictionary(locale: "it" | "en"): Dictionary {
  return locale === "en" ? en : it;
}

/** Small interpolation helper for "{token}" placeholders. */
export function t(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
