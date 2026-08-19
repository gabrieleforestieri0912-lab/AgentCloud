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
    allFieldsRequired: "Tutti i campi sono obbligatori",
    ollamaStreamError: "Errore durante la generazione della risposta",
    ollamaConnectionFailed:
      "Impossibile connettersi a Ollama. Verifica che sia in esecuzione su localhost:11434",
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
    rights: "© 2026 AgentCloud. Tutti i diritti riservati.",
    privacy: "Privacy",
    terms: "Termini",
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
    sidebar: ["Panoramica", "Agenti", "Integrazioni", "Esecuzioni"],
    stats: [
      ["2", "Agenti installati"],
      ["1.722", "Esecuzioni totali"],
      ["97,4%", "Successo medio"],
    ],
    recentActivity: "Attività recente",
    events: [
      "Lead qualificato catturato dalla pagina prezzi.",
      "Creato un link al carrello per un prodotto richiesto.",
      "Verificato lo stato di un ordine in meno di 30 secondi.",
    ],
    agents: [
      ["Agente Shopify", "Attivo", "1.284 esecuzioni", "98,7%"],
      ["Agente Lead Capture", "Attivo", "438 esecuzioni", "96,1%"],
    ],
  },

  agentCard: {
    comingSoon: "Prossimamente",
    installs: "installazioni",
    setup: "Setup",
    view: "Vedi",
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
    remainingSpots: "Posti rimanenti",
    successTitle: "Sei nella lista!",
    successText: "Ti avviseremo quando AgentCloud sarà pronto.",
    fullTitle: "Waitlist piena",
    fullText: "Tutti i posti sono occupati. Riprova più tardi!",
    placeholder: "Inserisci la tua email",
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
    privacy: {
      backHome: "Torna alla home",
      title: "Informativa Privacy",
      lastUpdated: "Ultimo aggiornamento: luglio 2026",
      sections: [
        {
          heading: "1. Informazioni che raccogliamo",
          paragraphs: [
            "Quando ti registri su AgentCloud raccogliamo il tuo nome e la tua email. Usiamo Clerk per l'autenticazione, che gestisce la tua email per l'accesso con magic link. Non memorizziamo password.",
            "Quando invii una richiesta demo, raccogliamo nome, cognome ed email per contattarti sui nostri servizi.",
          ],
        },
        {
          heading: "2. Come usiamo i tuoi dati",
          paragraphs: [
            "Usiamo i tuoi dati per fornire e migliorare i servizi AgentCloud, processare le transazioni tramite Stripe, inviarti email transazionali (benvenuto, fatturazione, supporto) e comunicare sul tuo account.",
            "Non vendiamo mai i tuoi dati personali a terze parti.",
          ],
        },
        {
          heading: "3. Condivisione dei dati",
          paragraphs: [
            "Condividiamo i dati solo con i fornitori di servizi essenziali:",
            "Clerk — autenticazione e gestione utenti; Stripe — elaborazione pagamenti; Supabase — hosting database; Resend — consegna email transazionali.",
          ],
        },
        {
          heading: "4. Conservazione dei dati",
          paragraphs: [
            "Conserviamo i tuoi dati finché il tuo account è attivo. Puoi richiedere la cancellazione del tuo account e dei dati associati in qualsiasi momento contattandoci.",
          ],
        },
        {
          heading: "5. I tuoi diritti",
          paragraphs: [
            "Ai sensi del GDPR, hai il diritto di accedere, rettificare o cancellare i tuoi dati personali. Puoi anche limitare o opporti al trattamento e richiedere la portabilità dei dati. Per esercitare questi diritti, scrivici a privacy@agentcloud.io.",
          ],
        },
        {
          heading: "6. Contatti",
          paragraphs: [
            "Per richieste relative alla privacy: privacy@agentcloud.io",
          ],
        },
      ],
    },
    terms: {
      backHome: "Torna alla home",
      title: "Termini di Servizio",
      lastUpdated: "Ultimo aggiornamento: luglio 2026",
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
            "Devi fornire un indirizzo email valido per creare un account. Sei responsabile della riservatezza dell'accesso al tuo account. L'autenticazione è gestita tramite Clerk con verifica email tramite magic link.",
          ],
        },
        {
          heading: "4. Abbonamenti e fatturazione",
          paragraphs: [
            "I costi di abbonamento vengono addebitati mensilmente tramite Stripe. Tutti i prezzi sono in EUR e IVA esclusa. Puoi annullare l'abbonamento in qualsiasi momento; la cancellazione ha effetto alla fine del periodo di fatturazione corrente.",
          ],
        },
        {
          heading: "5. Uso consentito",
          paragraphs: [
            "Accetti di non: utilizzare il Servizio per scopi illegali; tentare di aggirare l'autenticazione o i controlli di accesso; effettuare reverse engineering, decompilazione o estrazione del codice sorgente dei nostri agenti; utilizzare il Servizio per generare spam, molestie o contenuti dannosi.",
          ],
        },
        {
          heading: "6. Limitazione di responsabilità",
          paragraphs: [
            "AgentCloud è fornito \"così com'è\" senza garanzie di alcun tipo. Non siamo responsabili di eventuali danni derivanti dall'uso degli agenti AI, inclusi a titolo esemplificativo perdita di dati, interruzione dell'attività o decisioni automatiche errate.",
          ],
        },
        {
          heading: "7. Modifiche ai Termini",
          paragraphs: [
            "Possiamo aggiornare questi termini in qualsiasi momento. L'uso continuato del Servizio dopo le modifiche costituisce accettazione dei nuovi termini.",
          ],
        },
        {
          heading: "8. Contatti",
          paragraphs: ["Per domande su questi termini: legal@agentcloud.io"],
        },
      ],
    },
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
    allFieldsRequired: "All fields are required",
    ollamaStreamError: "Error while streaming the response",
    ollamaConnectionFailed:
      "Failed to connect to Ollama. Make sure it's running on localhost:11434",
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
    rights: "© 2026 AgentCloud. All rights reserved.",
    privacy: "Privacy",
    terms: "Terms",
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
    sidebar: ["Overview", "Agents", "Integrations", "Runs"],
    stats: [
      ["2", "Installed agents"],
      ["1,722", "Total runs"],
      ["97.4%", "Avg success"],
    ],
    recentActivity: "Recent activity",
    events: [
      "Captured a qualified lead from the pricing page.",
      "Built a cart link for a requested product.",
      "Checked an order status in under 30 seconds.",
    ],
    agents: [
      ["Shopify Agent", "Active", "1,284 runs", "98.7%"],
      ["Lead Capture Agent", "Active", "438 runs", "96.1%"],
    ],
  },

  agentCard: {
    comingSoon: "Coming soon",
    installs: "installs",
    setup: "Setup",
    view: "View",
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
    remainingSpots: "Remaining Spots",
    successTitle: "You're on the list!",
    successText: "We'll notify you when AgentCloud is ready.",
    fullTitle: "Waitlist is Full",
    fullText: "All spots have been taken. Check back later!",
    placeholder: "Enter your email",
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
    privacy: {
      backHome: "Back to home",
      title: "Privacy Policy",
      lastUpdated: "Last updated: July 2026",
      sections: [
        {
          heading: "1. Information We Collect",
          paragraphs: [
            "When you sign up for AgentCloud, we collect your name and email address. We use Clerk for authentication, which processes your email for magic link login. We do not store passwords.",
            "When you submit a demo request, we collect your name, surname, and email to contact you about our services.",
          ],
        },
        {
          heading: "2. How We Use Your Data",
          paragraphs: [
            "We use your data to provide and improve AgentCloud services, process transactions via Stripe, send you transactional emails (welcome, billing, support), and communicate about your account.",
            "We never sell your personal data to third parties.",
          ],
        },
        {
          heading: "3. Data Sharing",
          paragraphs: [
            "We share data only with essential service providers:",
            "Clerk — authentication and user management; Stripe — payment processing; Supabase — database hosting; Resend — transactional email delivery.",
          ],
        },
        {
          heading: "4. Data Retention",
          paragraphs: [
            "We retain your data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us.",
          ],
        },
        {
          heading: "5. Your Rights",
          paragraphs: [
            "Under GDPR, you have the right to access, rectify, or erase your personal data. You may also restrict or object to processing, and request data portability. To exercise these rights, contact us at privacy@agentcloud.io.",
          ],
        },
        {
          heading: "6. Contact",
          paragraphs: [
            "For privacy-related inquiries: privacy@agentcloud.io",
          ],
        },
      ],
    },
    terms: {
      backHome: "Back to home",
      title: "Terms of Service",
      lastUpdated: "Last updated: July 2026",
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
            "You must provide a valid email address to create an account. You are responsible for maintaining the confidentiality of your account access. Authentication is handled via Clerk using magic link email verification.",
          ],
        },
        {
          heading: "4. Subscriptions and Billing",
          paragraphs: [
            "Subscription fees are billed monthly via Stripe. All prices are in EUR and exclusive of applicable taxes. You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period.",
          ],
        },
        {
          heading: "5. Acceptable Use",
          paragraphs: [
            "You agree not to: use the Service for any illegal purpose; attempt to bypass authentication or access controls; reverse-engineer, decompile, or extract the source code of our agents; use the Service to generate spam, harassment, or harmful content.",
          ],
        },
        {
          heading: "6. Limitation of Liability",
          paragraphs: [
            "AgentCloud is provided \u201cas is\u201d without warranty of any kind. We are not liable for any damages arising from the use of AI agents, including but not limited to data loss, business interruption, or incorrect automated decisions.",
          ],
        },
        {
          heading: "7. Changes to Terms",
          paragraphs: [
            "We may update these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.",
          ],
        },
        {
          heading: "8. Contact",
          paragraphs: ["For questions about these terms: legal@agentcloud.io"],
        },
      ],
    },
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
