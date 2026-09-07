import type { Locale } from "./constants";

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
    setup: "Setup",
    view: "Vedi",
    active: "Attivo",
    online: "Online",
    close: "Chiudi",
    copy: "Copia",
    copied: "Copiato!",
    aiUnavailable:
      "Il servizio AI non è disponibile in questo momento. Riprova tra poco.",
    contactSupport: "Contattaci via email",
    connectSuccess: "Collegamento riuscito.",
    connectFailed:
      "Collegamento non riuscito ({reason}). Riprova o contattaci.",
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
        price: "€9,99/mese",
        text: "Un agente per il tuo workflow",
      },
      {
        plan: "Growth",
        price: "€14,99/mese",
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
    resetChat: "Azzera conversazione (salva nella chat)",
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
        title: "Assistente prodotti Shopify",
        description:
          "L'agente Shopify risponde alle domande su prodotti e ordini direttamente in chat, 24/7.",
      },
      {
        title: "Link diretti al carrello",
        description:
          "Trova i prodotti nel catalogo e genera link diretti al carrello da condividere ovunque.",
      },
      {
        title: "Stato ordini in tempo reale",
        description:
          "Verifica lo stato degli ordini con numero ordine ed email e rispondi in pochi secondi.",
      },
      {
        title: "Acquisizione lead automatica",
        description:
          "L'agente lead capture raccoglie i dettagli dei prospect e li arricchisce con il contesto giusto.",
      },
      {
        title: "Notifiche al team vendite",
        description:
          "Quando arriva un lead, il team vendite viene avvisato su Slack con tutti i dettagli.",
      },
      {
        title: "Qualificazione lead",
        description:
          "Arricchisci i contatti e valuta ogni lead per concentrarti su quelli davvero pronti a comprare.",
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
    chartTitle: "Esecuzioni negli ultimi 7 giorni",
    chartRuns: "Esecuzioni",
    chartWeek: "Questa settimana",
    sidebar: [
      "Panoramica",
      "Agenti",
      "Integrazioni",
      "Esecuzioni",
      "Fatturazione",
    ],
    stats: [] as [string, string][],
    agentsHeading: "I tuoi agenti",
    recentActivity: "Attività recente",
    events: [] as [string, string][],
    agents: [] as [string, string, string, string, string][],
  },

  agentCard: {
    comingSoon: "Prossimamente",
    setup: "Setup",
    view: "Vedi",
    buy: "Acquista",
  },

  chat: {
    newChat: "Nuova chat",
    assistantName: "Assistente personale",
    googleConnectTitle: "Collega il tuo account Google",
    googleConnectDesc:
      "Collega Gmail e Google Calendar così l'agente lavora sui tuoi dati reali.",
    googleConnectAction: "Collega account Google",
    googleConnectedLine: "Account Google collegato: {email}",
    googleReadOnlyHint:
      "Accesso completo a Gmail e Google Calendar: invio, eliminazione email e gestione eventi con promemoria (consenso OAuth sicuro).",
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
    attachAria: "Allega file o immagini",
    dropHint: "Rilascia qui per allegare file o immagini",
    removeAttachment: "Rimuovi {name}",
    fileTooLarge: "«{name}» è troppo grande (max {max})",
    tooManyFiles: "Puoi allegare al massimo {n} file",
    unsupportedFile: "Impossibile leggere «{name}»",
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
    setup: "Setup",
    typicalLaunch: "Tempo di lancio tipico: {setupTime}",
    gdprNote: "Progettato per workflow aziendali GDPR-ready.",
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
    connected: "Collegato",
    manage: "Gestisci",
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
    gettingStartedIntro:
      "Ogni piano include un budget mensile di token per agente installato (input + output). Il consumo oltre l'allowance viene addebitato automaticamente a {rate} per 1.000 token via Stripe, con un tetto di sicurezza a 2x l'allowance.",
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
    googleConnectDesc:
      "Collega il tuo account Google (Gmail e Calendario) per dare agli agenti accesso completo: lettura, invio ed eliminazione email, creazione/eliminazione eventi e promemoria.",
    googleConnectButton: "Collega account Google",
    googleConnectedBadge: "Connesso",
    googleConnectedMsg: "Account Google collegato con successo.",
    googleConnectFailed: "Collegamento non riuscito ({reason}).",
    googleConnectedEmail: "Account collegato",
    googleConnectedAt: "Connesso il",
    googleScopes: "Scope attivi",
    googleDisconnect: "Scollega",
    googleDisconnectConfirm:
      "Scollegare l'account Google? Gli agenti perderanno l'accesso a Gmail e Calendario.",
    googleDisconnecting: "Scollegamento...",
    googleDisconnectedMsg: "Account Google scollegato.",
    googleDisconnectFailed: "Impossibile scollegare l'account. Riprova.",
    googleNotConnected: "Nessun account Google collegato.",
    googleNotConfigured:
      "Integrazione Google non configurata: aggiungi GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nelle variabili d'ambiente.",
    scopeGmailReadonly: "Gmail (lettura e scrittura)",
    scopeCalendarReadonly: "Calendario (lettura e scrittura)",
    scopeOther: "Altri permessi",
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
      needSigninToConnect:
        "Per collegare {app} devi prima accedere con il tuo account.",
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
    badge: "Su misura",
    titleA: "Costruiamo",
    titleB: "il tuo agente ideale.",
    subtitle:
      "Descrivi il tuo workflow: colleghiamo i tuoi strumenti e consegniamo un agente AI personalizzato — senza codice, pronto all'uso in pochi giorni.",
    benefits: [
      {
        title: "Progettazione su misura",
        text: "Analizziamo il tuo processo e progettiamo un agente che parla la lingua della tua azienda.",
      },
      {
        title: "Integrazioni reali",
        text: "Colleghiamo Gmail, Slack, Shopify, Stripe, Sheets e altri strumenti che usi ogni giorno.",
      },
      {
        title: "Consegna rapida",
        text: "Ricevi l'agente configurato, testato e pronto al dashboard in 3-7 giorni lavorativi.",
      },
    ],
    whatToExpect: "Cosa ottieni",
    expectations: [
      "Analisi del workflow e mappatura delle automazioni possibili",
      "Proposta tecnica con integrazioni, tempistiche e costi chiari",
      "Agente personalizzato consegnato e attivato sul tuo account",
      "Supporto all'avvio e ottimizzazione dopo la consegna",
    ],
    requestDemo: "Richiedi agente personalizzato",
    requestDemoHint:
      "Raccontaci l'idea: ti rispondiamo entro 24 ore con proposta e preventivo.",
    firstName: "Nome",
    lastName: "Cognome",
    email: "Email",
    company: "Azienda",
    idea: "L'agente che immagini",
    integrationsLabel: "Strumenti da collegare",
    budgetLabel: "Budget indicativo",
    firstNamePh: "Mario",
    lastNamePh: "Rossi",
    emailPh: "mario@azienda.com",
    companyPh: "La tua azienda",
    ideaPh: "Es. un agente che legge le email, crea preventivi e li invia automaticamente...",
    integrationsPh: "Es. Gmail, Shopify, Slack...",
    budgetPh: "Es. €500-1500",
    requestButton: "Invia richiesta",
    scheduleNote: "Nessun impegno — ricevi proposta e preventivo senza vincoli",
    successTitle: "Richiesta inviata!",
    successText:
      "Grazie, {name}. Abbiamo ricevuto la tua richiesta per un agente personalizzato e ti ricontatteremo entro 24 ore.",
    close: "Chiudi",
    failedRequest: "Invio della richiesta non riuscito",
    somethingWrong: "Qualcosa è andato storto",
    howToUse: {
      badge: "Come funziona",
      titleA: "Dall'idea",
      titleB: "all'agente attivo",
      subtitle:
        "Un percorso guidato, senza tecnicismi, dal tuo bisogno al tuo agente su misura.",
      steps: [
        {
          title: "Racconta l'idea",
          text: "Compila il form con workflow, strumenti e obiettivo: ti ricontattiamo entro 24 ore per approfondire.",
        },
        {
          title: "Proposta e preventivo",
          text: "Ricevi una proposta chiara con integrazioni, tempistiche (3-7 giorni) e costi, senza sorprese.",
        },
        {
          title: "Costruiamo l'agente",
          text: "Progettiamo e testiamo il tuo agente personalizzato, collegando i tuoi strumenti in modo sicuro.",
        },
        {
          title: "Consegna sul dashboard",
          text: "L'agente appare tra i tuoi agenti attivi, pronto all'uso con le tue credenziali.",
        },
        {
          title: "Avvio e ottimizzazione",
          text: "Ti affianchiamo all'avvio e ottimizziamo tono, trigger e workflow sui primi utilizzi reali.",
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
      invoice_created: "{agent} ha creato la fattura {invoice}",
      payment_reminder_sent: "{agent} ha inviato un sollecito a {email}",
      post_scheduled: "{agent} ha pianificato un post {platform} ({when})",
      cv_analyzed: "{agent} ha analizzato il CV {filename}",
      email_sent: "{agent} ha inviato un'email a {to} ({subject})",
      email_trashed: "{agent} ha cestinato un'email ({message_id})",
      calendar_event_deleted: "{agent} ha eliminato l'evento {event_id}",
      calendar_reminder_set: "{agent} ha impostato un promemoria per {event_id} ({minutes} min)",
      quote_generated: "{agent} ha generato un preventivo per {client_email}",
      quote_sent: "{agent} ha inviato un preventivo a {client_email}",
      review_replied: "{agent} ha risposto a una recensione ({review_id})",
      store_created: "{agent} ha creato lo store \"{shop_name}\""
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

export const en: Dictionary = {
  common: {
    comingSoon: "Coming soon",
    comingSoonShort: "Coming soon",
    setup: "Setup",
    view: "View",
    active: "Active",
    online: "Online",
    close: "Close",
    copy: "Copy",
    copied: "Copied!",
    aiUnavailable:
      "The AI service is unavailable right now. Please try again shortly.",
    contactSupport: "Contact us by email",
    connectSuccess: "Connection successful.",
    connectFailed: "Connection failed ({reason}). Please try again or contact us.",
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
      { plan: "Starter", price: "€9.99/mo", text: "One workflow agent" },
      { plan: "Growth", price: "€14.99/mo", text: "Agent plus integrations" },
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
    resetChat: "Reset conversation (save to chat)",
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
        title: "Shopify Product Assistant",
        description:
          "The Shopify agent answers product and order questions directly in chat, 24/7.",
      },
      {
        title: "Direct Cart Links",
        description:
          "Find products in the catalog and generate direct cart links you can share anywhere.",
      },
      {
        title: "Real-time Order Status",
        description:
          "Check order status with order number and email, and answer in seconds.",
      },
      {
        title: "Automatic Lead Capture",
        description:
          "The lead capture agent collects prospect details and enriches them with the right context.",
      },
      {
        title: "Sales Notifications",
        description:
          "When a lead arrives, the sales team is notified on Slack with all the details.",
      },
      {
        title: "Lead Qualification",
        description:
          "Enrich contacts and score each lead so you focus only on those ready to buy.",
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
    chartTitle: "Runs in the last 7 days",
    chartRuns: "Runs",
    chartWeek: "This week",
    sidebar: ["Overview", "Agents", "Integrations", "Runs", "Billing"],
    stats: [] as [string, string][],
    agentsHeading: "Your agents",
    recentActivity: "Recent activity",
    events: [] as [string, string][],
    agents: [] as [string, string, string, string, string][],
  },

  agentCard: {
    comingSoon: "Coming soon",
    setup: "Setup",
    view: "View",
    buy: "Buy",
  },

  chat: {
    newChat: "New Chat",
    assistantName: "Personal assistant",
    googleConnectTitle: "Connect your Google account",
    googleConnectDesc:
      "Connect Gmail and Google Calendar so the agent can work on your real data.",
    googleConnectAction: "Connect Google account",
    googleConnectedLine: "Google account connected: {email}",
    googleReadOnlyHint:
      "Full access to Gmail and Google Calendar: send, delete emails and manage events with reminders (secure OAuth consent).",
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
    attachAria: "Attach files or images",
    dropHint: "Drop files or images here to attach them",
    removeAttachment: "Remove {name}",
    fileTooLarge: "“{name}” is too large (max {max})",
    tooManyFiles: "You can attach at most {n} files",
    unsupportedFile: "Could not read “{name}”",
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
    setup: "Setup",
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
    connected: "Connected",
    manage: "Manage",
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
    gettingStartedIntro:
      "Each plan includes a monthly token budget per installed agent (input + output). Usage over the allowance is billed automatically at {rate} per 1.000 tokens via Stripe, with a safety cap at 2x the allowance.",
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
    googleConnectDesc:
      "Conecta tu cuenta de Google (Gmail y Calendario) para dar a los agentes acceso completo: lectura, envío/eliminación de emails y gestión de eventos con recordatorios.",
    googleConnectButton: "Connect Google account",
    googleConnectedBadge: "Connected",
    googleConnectedMsg: "Google account connected successfully.",
    googleConnectFailed: "Connection failed ({reason}).",
    googleConnectedEmail: "Connected account",
    googleConnectedAt: "Connected on",
    googleScopes: "Active scopes",
    googleDisconnect: "Disconnect",
    googleDisconnectConfirm:
      "Disconnect your Google account? Agents will lose access to Gmail and Calendar.",
    googleDisconnecting: "Disconnecting...",
    googleDisconnectedMsg: "Google account disconnected.",
    googleDisconnectFailed: "Could not disconnect the account. Please try again.",
    googleNotConnected: "No Google account connected.",
    googleNotConfigured:
      "Google integration not configured: add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the environment variables.",
    scopeGmailReadonly: "Gmail (read & write)",
    scopeCalendarReadonly: "Calendar (read & write)",
    scopeOther: "Other permissions",
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
      needSigninToConnect:
        "To connect {app}, sign in with your account first.",
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
    badge: "Custom",
    titleA: "Let's build",
    titleB: "your ideal agent.",
    subtitle:
      "Describe your workflow: we connect your tools and deliver a custom AI agent — no code, ready to use in a few days.",
    benefits: [
      {
        title: "Tailored design",
        text: "We analyze your process and design an agent that speaks your business language.",
      },
      {
        title: "Real integrations",
        text: "We connect Gmail, Slack, Shopify, Stripe, Sheets and the tools you use every day.",
      },
      {
        title: "Fast delivery",
        text: "Get your agent configured, tested and live in your dashboard in 3-7 business days.",
      },
    ],
    whatToExpect: "What you get",
    expectations: [
      "Workflow analysis and automation mapping",
      "Technical proposal with integrations, timeline and clear pricing",
      "Custom agent delivered and activated on your account",
      "Launch support and post-delivery optimization",
    ],
    requestDemo: "Request custom agent",
    requestDemoHint:
      "Tell us your idea: we reply within 24 hours with proposal and quote.",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    company: "Company",
    idea: "Your envisioned agent",
    integrationsLabel: "Tools to connect",
    budgetLabel: "Indicative budget",
    firstNamePh: "John",
    lastNamePh: "Doe",
    emailPh: "john@company.com",
    companyPh: "Your company",
    ideaPh: "E.g. an agent that reads emails, creates quotes and sends them automatically...",
    integrationsPh: "E.g. Gmail, Shopify, Slack...",
    budgetPh: "E.g. €500-1500",
    requestButton: "Send request",
    scheduleNote: "No commitment — get proposal and quote with no strings attached",
    successTitle: "Request sent!",
    successText:
      "Thanks, {name}. We received your custom agent request and will get back to you within 24 hours.",
    close: "Close",
    failedRequest: "Failed to send request",
    somethingWrong: "Something went wrong",
    howToUse: {
      badge: "How it works",
      titleA: "From idea",
      titleB: "to live agent",
      subtitle:
        "A guided path, no technical jargon, from your need to your bespoke agent.",
      steps: [
        {
          title: "Share your idea",
          text: "Fill the form with workflow, tools and goal: we get back within 24 hours to dig deeper.",
        },
        {
          title: "Proposal & quote",
          text: "Get a clear proposal with integrations, timeline (3-7 days) and pricing, no surprises.",
        },
        {
          title: "We build the agent",
          text: "We design and test your custom agent, connecting your tools securely.",
        },
        {
          title: "Delivered to dashboard",
          text: "The agent appears among your active agents, ready with your credentials.",
        },
        {
          title: "Launch & tuning",
          text: "We stay with you at launch and tune tone, triggers and workflow on real usage.",
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
      invoice_created: "{agent} created invoice {invoice}",
      payment_reminder_sent: "{agent} sent a payment reminder to {email}",
      post_scheduled: "{agent} scheduled a {platform} post ({when})",
      cv_analyzed: "{agent} analyzed CV {filename}",
      email_sent: "{agent} sent an email to {to} ({subject})",
      email_trashed: "{agent} trashed an email ({message_id})",
      calendar_event_deleted: "{agent} deleted event {event_id}",
      calendar_reminder_set: "{agent} set a reminder for {event_id} ({minutes} min)",
      quote_generated: "{agent} generated a quote for {client_email}",
      quote_sent: "{agent} sent a quote to {client_email}",
      review_replied: "{agent} replied to a review ({review_id})",
      store_created: "{agent} created the store \"{shop_name}\""
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

export const es: Dictionary = {
  common: {
    comingSoon: "Próximamente",
    comingSoonShort: "Próximamente",
    setup: "Configuración",
    view: "Ver",
    active: "Activo",
    online: "En línea",
    close: "Cerrar",
    copy: "Copiar",
    copied: "¡Copiado!",
    aiUnavailable:
      "El servicio de IA no está disponible ahora. Inténtalo de nuevo pronto.",
    contactSupport: "Contáctanos por email",
    connectSuccess: "Conexión exitosa.",
    connectFailed: "Conexión fallida ({reason}). Inténtalo de nuevo o contáctanos.",
  },

  apiErrors: {
    unauthorized: "No autorizado",
    invalidJson: "Cuerpo JSON no válido",
    missingAgentOrMessages: "Falta agentId o messages",
    agentNotFound: "Agente no encontrado",
    rateLimited: "Demasiadas solicitudes. Inténtalo de nuevo en un momento.",
    executionError: "Ocurrió un error durante la ejecución del agente",
    notSubscribed:
      "No tienes una suscripción activa para este agente. Suscríbete para empezar a usarlo.",
    subscriptionInactive:
      "Tu suscripción para este agente es {status}. Reactívala para seguir usándolo.",
    overageCapReached:
      "Has alcanzado el límite de seguridad mensual de {cap} tokens ({multiplier}x tu asignación) para este agente. Contáctanos para aumentarlo.",
    limitExceeded:
      "Has agotado tu asignación mensual de {limit} tokens para este agente. Mejora tu plan para continuar.",
    invalidEmail: "Email no válido",
    invalidPlan: "Plan no válido",
    missingAgentOrPlan: "Falta agentId o planId+vertical",
    paymentLinkNotConfigured: "Enlace de pago no configurado",
    failedToGeneratePaymentLink: "No se pudo generar el enlace de pago",
    emailRequired: "El email es obligatorio",
    invalidEmailAddress: "Dirección de email no válida",
    alreadyOnWaitlist: "Este email ya está en la lista de espera",
    failedToJoinWaitlist: "No se pudo unir a la lista de espera",
    invalidAccessCode: "Código de acceso no válido",
    allFieldsRequired: "Todos los campos son obligatorios",
    aiStreamError: "Error al transmitir la respuesta",
    aiConnectionFailed:
      "No se pudo contactar con el backend de IA. Inténtalo más tarde.",
    internalServerError: "Error interno del servidor",
  },

  navbar: {
    marketplace: "Marketplace",
    solutions: "Soluciones",
    integrations: "Integraciones",
    browseAllAgents: "Ver todos los agentes",
    logOut: "Cerrar sesión",
    signIn: "Iniciar sesión",
    requestDemo: "Solicitar demo",
    menu: "Menú",
    solutionsItems: [
      {
        title: "Shopify y E-commerce",
        text: "Busca productos, crea enlaces al carrito y consulta el estado de los pedidos.",
      },
      {
        title: "Captura de leads",
        text: "Captura contactos de formularios y tu sitio automáticamente.",
      },
      {
        title: "Soporte de productos y pedidos",
        text: "Responde preguntas sobre productos y pedidos 24/7.",
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
      { plan: "Starter", price: "€9,99/mes", text: "One workflow agent" },
      { plan: "Growth", price: "€14,99/mes", text: "Agent plus integrations" },
      { plan: "Personalizado", price: "Personalizado", text: "Multi-agent systems" },
    ],
  },

  footer: {
    tagline: "AgentCloud — La Plataforma de Agentes IA",
    follow: "FOLLOW",
    company: "EMPRESA",
    about: "Sobre nosotros",
    faq: "FAQ",
    contact: "Contacto",
    phone: "+39 351 986 3021",
    email: "info@agentcloud.agency",
    rights: "© 2026 AgentCloud. All rights reserved.",
    privacy: "Privacidad",
    terms: "Términos",
    refunds: "Política de reembolso",
  },

  hero: {
    titleA: "Run Your Business",
    titleConnector: "con",
    titleB: "Ejecución IA",
    subtitle:
      "Ask for anything. Our AI will plan it, execute it, and connect it to your tools.",
    placeholderEmpty: "Dinos qué te gustaría automatizar...",
    placeholderContinued: "Continúa la conversación...",
    sendMessage: "Enviar mensaje",
    resetChat: "Reiniciar conversación (guardar en chat)",
    openFullChat: "Abrir chat completo",
    aiError:
      "El servicio de IA no está disponible ahora. Inténtalo de nuevo pronto.",
    chips: [
      "E-commerce",
      "Shopify",
      "Sales & Leads",
      "Lead capture",
      "Estado de pedidos",
    ],
    roles: [
      "Product Manager",
      "Desarrollador",
      "Marketer",
      "Sales Rep",
      "Solo Founder",
      "Diseñador",
      "Data Analyst",
      "Customer Success",
      "Community Lead",
      "Finance Ops",
      "Operaciones",
      "Course Creator",
    ],
  },

  features: {
    badge: "Automatizaciones",
    titleA: "Una plataforma,",
    titleB: "cada tarea automatizada",
    subtitle:
      "AgentCloud se integra con las herramientas que ya usas — desde suites de productividad hasta CRMs.",
    cta: "Deploy Your First Agent",
    items: [
      {
        title: "Shopify Product Assistant",
        description:
          "The Shopify agent answers product and order questions directly in chat, 24/7.",
      },
      {
        title: "Direct Cart Links",
        description:
          "Find products in the catalog and generate direct cart links you can share anywhere.",
      },
      {
        title: "Real-time Order Status",
        description:
          "Check order status with order number and email, and answer in seconds.",
      },
      {
        title: "Automatic Lead Capture",
        description:
          "The lead capture agent collects prospect details and enriches them with the right context.",
      },
      {
        title: "Sales Notifications",
        description:
          "When a lead arrives, the sales team is notified on Slack with all the details.",
      },
      {
        title: "Lead Qualification",
        description:
          "Enrich contacts and score each lead so you focus only on those ready to buy.",
      },
    ],
  },

  integrations: {
    badge: "Integraciones",
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
        title: "Captura de leads",
        description: "Capture leads from your site and notify sales",
      },
      {
        title: "Lead Qualification",
        description: "Enrich and qualify contacts automatically",
      },
    ],
    browseAll: "Ver todos los agentes",
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
    chartTitle: "Runs in the last 7 days",
    chartRuns: "Runs",
    chartWeek: "This week",
    sidebar: ["Overview", "Agentes", "Integraciones", "Runs", "Facturación"],
    stats: [] as [string, string][],
    agentsHeading: "Your agents",
    recentActivity: "Recent activity",
    events: [] as [string, string][],
    agents: [] as [string, string, string, string, string][],
  },

  agentCard: {
    comingSoon: "Próximamente",
    setup: "Configuración",
    view: "Ver",
    buy: "Buy",
  },

  chat: {
    newChat: "New Chat",
    assistantName: "Asistente personal",
    googleConnectTitle: "Connect your Google account",
    googleConnectDesc:
      "Conecta Gmail y Google Calendar para que el agente pueda trabajar con tus datos reales.",
    googleConnectAction: "Connect Google account",
    googleConnectedLine: "Google account connected: {email}",
    googleReadOnlyHint:
      "Vollzugriff auf Gmail und Google Kalender: Senden, Löschen von E-Mails und Verwalten von Terminen mit Erinnerungen (sichere OAuth-Zustimmung).",
    home: "Inicio",
    chat: "Chat",
    tools: "Herramientas",
    agents: "Agentes",
    conversations: "Conversaciones",
    noConversations: "Aún no hay conversaciones. ¡Inicia un nuevo chat!",
    thinking: "Pensando...",
    online: "En línea",
    emptyTitle: "¿Qué te gustaría automatizar?",
    emptySubtitle:
      "Pregúntame cualquier cosa sobre automatizar tu negocio. Puedo ayudarte con emails, soporte, leads y más.",
    placeholder: "Message your AI Agent...",
    sendMessage: "Enviar mensaje",
    disclaimer:
      "AgentCloud AI may produce inaccurate information. Verify critical data.",
    closeSidebar: "Cerrar barra lateral",
    openSidebar: "Abrir barra lateral",
    deleteConversation: "Eliminar conversación",
    newChatTitle: "New Chat",
    attachAria: "Adjuntar archivos o imágenes",
    dropHint: "Suelta aquí archivos o imágenes para adjuntarlos",
    removeAttachment: "Quitar {name}",
    fileTooLarge: "«{name}» es demasiado grande (máx. {max})",
    tooManyFiles: "Puedes adjuntar como máximo {n} archivos",
    unsupportedFile: "No se pudo leer «{name}»",
  },

  agentChat: {
    notFoundTitle: "Agente no encontrado",
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
    comingSoon: "Próximamente",
    agentsCount: "{count} agents",
  },

  agentDetail: {
    backToMarketplace: "Back to marketplace",
    forIndustry: "For {industry}",
    configureAgent: "Configure agent",
    setup: "Configuración",
    typicalLaunch: "Typical launch time: {setupTime}",
    gdprNote: "Built for GDPR-aware business workflows",
    setupPrice: "Setup price",
    whatAutomates: "What this agent automates",
    howItWorks: "How it works",
    howItWorksDesc:
      "{name} follows a structured workflow to deliver results every time.",
    useCases: "Use case examples",
    useCasesDesc: "Real scenarios where {name} delivers value out of the box.",
    integrationsTitle: "Integraciones",
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
    requestDemo: "Solicitar demo",
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
    copy: "Copiar",
    copied: "¡Copiado!",
    toolsBase: "Vertical tool base",
    leadCapture: "Lead capture",
    fullTools: "Full vertical tools",
    prioritySupport: "Priority support",
    consentPrefix: "I accept the",
    consentTerms: "Terms of Service",
    consentConjunction: "and the",
    consentPrivacy: "Privacy Policy",
    connected: "Connected",
    manage: "Manage",
  },

  dashboard: {
    welcomeBack: "Bienvenido de nuevo, {name}",
    welcomeBackGeneric: "Bienvenido de nuevo",
    myAgents: "Mis agentes",
    tagline:
      "Track status, recent runs, connected workflows, and agent performance from one place.",
    installAgent: "Instalar agente",
    installedAgents: "Agentes instalados",
    noAgentsTitle: "Aún no hay agentes instalados",
    noAgentsSubtitle:
      "Browse the marketplace and install your first agent to start automating your workflows.",
    browseAgents: "Explorar agentes",
    dashboardUnavailable: "Dashboard data unavailable",
    dashboardUnavailableDesc:
      "Set the Supabase environment variables to see your installed agents and usage here.",
    active: "Activo",
    runs: "{count} runs",
    tokens: "{count} tok",
    lastRun: "{time} ago",
    monthlyUsage: "Uso mensual",
    usageEmpty: "Usage will appear here once you install an agent.",
    usageEmptyDesc: "Connect Supabase to track usage and limits.",
    controlCenter: "Centro de control",
    controlCenterDesc:
      "Limits are enforced on tokens: each plan sets a monthly token budget (input + output) per installed agent. Usage above the allowance is billed automatically at {rate} per 1.000 tokens via Stripe, with a safety cap at 2x the allowance.",
    gettingStarted: "Primeros pasos",
    gettingStartedSteps: [
      "Browse marketplace",
      "Install your first agent",
      "Configure integrations",
      "View your dashboard",
    ],
    manageSubscription: "Gestionar suscripción",
    gettingStartedIntro:
      "Each plan includes a monthly token budget per installed agent (input + output). Usage over the allowance is billed automatically at {rate} per 1.000 tokens via Stripe, with a safety cap at 2x the allowance.",
    billingError:
      "We couldn't open the billing portal. Make sure you have an active subscription, and contact us if the problem persists.",
    cancelsAtPeriodEnd: "Cancels at period end",
    aboveAllowance: "Above allowance — billed at {rate}/1.000 tokens",
    overageAmount: " (+{count} in overage)",
    overageThisMonth: "(≈ €{amount} this month)",
    statInstalledAgents: "Agentes instalados",
    statRunsThisMonth: "Ejecuciones este mes",
    statTokensUsed: "Tokens usados",
    statActiveAgents: "Agentes activos",
    justNow: "just now",
    minutesAgo: "{n} min",
    hoursAgo: "{n} h",
    daysAgo: "{n} d",
    googleConnectDesc:
      "Connect your Google account (Gmail and Calendar) to give agents full access: read, send/delete emails and manage events with reminders.",
    googleConnectButton: "Connect Google account",
    googleConnectedBadge: "Connected",
    googleConnectedMsg: "Google account connected successfully.",
    googleConnectFailed: "Connection failed ({reason}).",
    googleConnectedEmail: "Connected account",
    googleConnectedAt: "Connected on",
    googleScopes: "Active scopes",
    googleDisconnect: "Disconnect",
    googleDisconnectConfirm:
      "Disconnect your Google account? Agents will lose access to Gmail and Calendar.",
    googleDisconnecting: "Disconnecting...",
    googleDisconnectedMsg: "Google account disconnected.",
    googleDisconnectFailed: "Could not disconnect the account. Please try again.",
    googleNotConnected: "No Google account connected.",
    googleNotConfigured:
      "Google integration not configured: add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the environment variables.",
    scopeGmailReadonly: "Gmail (lectura y escritura)",
    scopeCalendarReadonly: "Calendario (lectura y escritura)",
    scopeOther: "Other permissions",
  },

  auth: {
    login: {
      title: "Bienvenido de nuevo",
      hint: "Sign in with email and password or with Google",
      email: "Email",
      emailPlaceholder: "you@company.com",
      password: "Password",
      passwordPlaceholder: "Your password",
      submit: "Iniciar sesión",
      google: "Continue with Google",
      prompt: "Don't have an account yet?",
      link: "Sign up",
      forgot: "Forgot password?",
      resetSent: "We sent you a link to reset your password.",
      needSigninToConnect:
        "To connect {app}, sign in with your account first.",
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
      link: "Iniciar sesión",
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
    alreadyOnList: "Este email ya está en la lista de espera",
    somethingWrong: "Something went wrong",
    networkError: "Network error. Please try again.",
  },

  demo: {
    badge: "A medida",
    titleA: "Construyamos",
    titleB: "tu agente ideal.",
    subtitle:
      "Describe tu flujo de trabajo: conectamos tus herramientas y entregamos un agente IA a medida — sin código, listo en pocos días.",
    benefits: [
      {
        title: "Diseño a medida",
        text: "Analizamos tu proceso y diseñamos un agente que habla el idioma de tu empresa.",
      },
      {
        title: "Integraciones reales",
        text: "Conectamos Gmail, Slack, Shopify, Stripe, Sheets y las herramientas que usas cada día.",
      },
      {
        title: "Entrega rápida",
        text: "Recibe tu agente configurado, probado y listo en tu dashboard en 3-7 días laborables.",
      },
    ],
    whatToExpect: "Qué obtienes",
    expectations: [
      "Análisis del flujo y mapeo de automatizaciones",
      "Propuesta técnica con integraciones, tiempos y costes claros",
      "Agente personalizado entregado y activado en tu cuenta",
      "Soporte al lanzamiento y optimización posterior",
    ],
    requestDemo: "Solicitar agente a medida",
    requestDemoHint:
      "Cuéntanos tu idea: respondemos en 24 horas con propuesta y presupuesto.",
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Email",
    company: "Empresa",
    idea: "Tu agente imaginado",
    integrationsLabel: "Herramientas a conectar",
    budgetLabel: "Presupuesto indicativo",
    firstNamePh: "Juan",
    lastNamePh: "Pérez",
    emailPh: "juan@empresa.com",
    companyPh: "Tu empresa",
    ideaPh: "Ej. un agente que lee emails, crea presupuestos y los envía automáticamente...",
    integrationsPh: "Ej. Gmail, Shopify, Slack...",
    budgetPh: "Ej. €500-1500",
    requestButton: "Enviar solicitud",
    scheduleNote: "Sin compromiso — recibe propuesta y presupuesto sin ataduras",
    successTitle: "¡Solicitud enviada!",
    successText:
      "Gracias, {name}. Hemos recibido tu solicitud de agente a medida y te responderemos en 24 horas.",
    close: "Cerrar",
    failedRequest: "Error al enviar la solicitud",
    somethingWrong: "Algo salió mal",
    howToUse: {
      badge: "Cómo funciona",
      titleA: "De la idea",
      titleB: "al agente activo",
      subtitle:
        "Un recorrido guiado, sin tecnicismos, desde tu necesidad a tu agente a medida.",
      steps: [
        {
          title: "Cuenta tu idea",
          text: "Rellena el formulario con flujo, herramientas y objetivo: te contactamos en 24 horas para profundizar.",
        },
        {
          title: "Propuesta y presupuesto",
          text: "Recibe una propuesta clara con integraciones, tiempos (3-7 días) y costes, sin sorpresas.",
        },
        {
          title: "Construimos el agente",
          text: "Diseñamos y probamos tu agente a medida, conectando tus herramientas de forma segura.",
        },
        {
          title: "Entrega en el dashboard",
          text: "El agente aparece entre tus agentes activos, listo con tus credenciales.",
        },
        {
          title: "Lanzamiento y ajuste",
          text: "Te acompañamos en el lanzamiento y ajustamos tono, disparadores y flujo en uso real.",
        },
      ],
    },
  },

  contact: {
    badge: "Contacto",
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
    sendButton: "Enviar mensaje",
    successTitle: "Message sent!",
    successText:
      "Thanks, {name}. We've received your message and will reply within 24 hours.",
    close: "Cerrar",
    reasons: ["General inquiry", "Sales", "Support", "Partnership", "Other"],
    selected: "Selected: {subject}",
    somethingWrong: "Something went wrong",
    failedSend: "Failed to send message",
  },

  legal: {
    seeTerms: "See the Terms of Service",
    seeRefunds: "See the Refund Policy",
    privacy: {
      backHome: "Volver al inicio",
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
      backHome: "Volver al inicio",
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
      backHome: "Volver al inicio",
      title: "Política de reembolso",
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
    manage: "Gestionar suscripción",
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
      invoice_created: "{agent} created invoice {invoice}",
      payment_reminder_sent: "{agent} sent a payment reminder to {email}",
      post_scheduled: "{agent} scheduled a {platform} post ({when})",
      cv_analyzed: "{agent} analyzed CV {filename}",
      email_sent: "{agent} sent an email to {to} ({subject})",
      email_trashed: "{agent} trashed an email ({message_id})",
      calendar_event_deleted: "{agent} deleted event {event_id}",
      calendar_reminder_set: "{agent} set a reminder for {event_id} ({minutes} min)",
      quote_generated: "{agent} generated a quote for {client_email}",
      quote_sent: "{agent} sent a quote to {client_email}",
      review_replied: "{agent} replied to a review ({review_id})",
      store_created: "{agent} created the store \"{shop_name}\""
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
      cta: "Gestionar suscripción",
    },
  },

  about: {
    backHome: "Volver al inicio",
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

export const de: Dictionary = {
  common: {
    comingSoon: "Demnächst",
    comingSoonShort: "Demnächst",
    setup: "Setup",
    view: "Ansehen",
    active: "Aktiv",
    online: "Online",
    close: "Schließen",
    copy: "Kopieren",
    copied: "Kopiert!",
    aiUnavailable:
      "Der KI-Dienst ist gerade nicht verfügbar. Bitte versuche es gleich erneut.",
    contactSupport: "Kontaktiere uns per E-Mail",
    connectSuccess: "Verbindung erfolgreich.",
    connectFailed: "Verbindung fehlgeschlagen ({reason}). Bitte erneut versuchen oder kontaktiere uns.",
  },

  apiErrors: {
    unauthorized: "Nicht autorisiert",
    invalidJson: "Ungültiger JSON-Body",
    missingAgentOrMessages: "agentId oder messages fehlt",
    agentNotFound: "Agent nicht gefunden",
    rateLimited: "Zu viele Anfragen. Bitte gleich erneut versuchen.",
    executionError: "Fehler bei der Agent-Ausführung",
    notSubscribed:
      "Du hast kein aktives Abo für diesen Agenten. Abonniere ihn, um ihn zu nutzen.",
    subscriptionInactive:
      "Dein Abo für diesen Agenten ist {status}. Reaktiviere es, um weiterzumachen.",
    overageCapReached:
      "Du hast das monatliche Sicherheitslimit von {cap} Tokens ({multiplier}x dein Kontingent) erreicht. Kontaktiere uns zur Erhöhung.",
    limitExceeded:
      "Du hast dein monatliches Kontingent von {limit} Tokens verbraucht. Upgrade deinen Plan.",
    invalidEmail: "Ungültige E-Mail",
    invalidPlan: "Ungültiger Plan",
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
    marketplace: "Marktplatz",
    solutions: "Lösungen",
    integrations: "Integrationen",
    browseAllAgents: "Alle Agenten ansehen",
    logOut: "Abmelden",
    signIn: "Anmelden",
    requestDemo: "Demo anfordern",
    menu: "Menü",
    solutionsItems: [
      {
        title: "Shopify & E-Commerce",
        text: "Produkte finden, Warenkorb-Links erstellen und Bestellstatus prüfen.",
      },
      {
        title: "Lead-Erfassung",
        text: "Kontakte aus Formularen und deiner Website automatisch erfassen.",
      },
      {
        title: "Produkt- & Bestellsupport",
        text: "Produkt- und Bestellfragen rund um die Uhr beantworten.",
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
      { plan: "Starter", price: "9,99 €/Monat", text: "One workflow agent" },
      { plan: "Growth", price: "14,99 €/Monat", text: "Agent plus integrations" },
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
    titleConnector: "mit",
    titleB: "KI-Ausführung",
    subtitle:
      "Ask for anything. Our AI will plan it, execute it, and connect it to your tools.",
    placeholderEmpty: "Sag uns, was du automatisieren möchtest...",
    placeholderContinued: "Gespräch fortsetzen...",
    sendMessage: "Nachricht senden",
    resetChat: "Gespräch zurücksetzen (im Chat speichern)",
    openFullChat: "Vollständigen Chat öffnen",
    aiError:
      "Der KI-Dienst ist gerade nicht verfügbar. Bitte versuche es gleich erneut.",
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
        title: "Shopify Product Assistant",
        description:
          "The Shopify agent answers product and order questions directly in chat, 24/7.",
      },
      {
        title: "Direct Cart Links",
        description:
          "Find products in the catalog and generate direct cart links you can share anywhere.",
      },
      {
        title: "Real-time Order Status",
        description:
          "Check order status with order number and email, and answer in seconds.",
      },
      {
        title: "Automatic Lead Capture",
        description:
          "The lead capture agent collects prospect details and enriches them with the right context.",
      },
      {
        title: "Sales Notifications",
        description:
          "When a lead arrives, the sales team is notified on Slack with all the details.",
      },
      {
        title: "Lead Qualification",
        description:
          "Enrich contacts and score each lead so you focus only on those ready to buy.",
      },
    ],
  },

  integrations: {
    badge: "Integrationen",
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
        title: "Lead-Erfassung",
        description: "Capture leads from your site and notify sales",
      },
      {
        title: "Lead Qualification",
        description: "Enrich and qualify contacts automatically",
      },
    ],
    browseAll: "Alle Agenten ansehen",
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
    chartTitle: "Runs in the last 7 days",
    chartRuns: "Runs",
    chartWeek: "This week",
    sidebar: ["Overview", "Agenten", "Integrationen", "Runs", "Billing"],
    stats: [] as [string, string][],
    agentsHeading: "Your agents",
    recentActivity: "Recent activity",
    events: [] as [string, string][],
    agents: [] as [string, string, string, string, string][],
  },

  agentCard: {
    comingSoon: "Demnächst",
    setup: "Setup",
    view: "Ansehen",
    buy: "Buy",
  },

  chat: {
    newChat: "New Chat",
    assistantName: "Persönlicher Assistent",
    googleConnectTitle: "Connect your Google account",
    googleConnectDesc:
      "Verbinde Gmail und Google Kalender, damit der Agent mit deinen echten Daten arbeiten kann.",
    googleConnectAction: "Connect Google account",
    googleConnectedLine: "Google account connected: {email}",
    googleReadOnlyHint:
      "Acceso completo a Gmail y Google Calendar: envío, eliminación de emails y gestión de eventos con recordatorios (consentimiento OAuth seguro).",
    home: "Start",
    chat: "Chat",
    tools: "Tools",
    agents: "Agenten",
    conversations: "Gespräche",
    noConversations: "Noch keine Gespräche. Starte einen neuen Chat!",
    thinking: "Denke nach...",
    online: "Online",
    emptyTitle: "Was möchtest du automatisieren?",
    emptySubtitle:
      "Frag mich alles zur Automatisierung deines Business. Ich helfe bei E-Mails, Support, Leads u.v.m.",
    placeholder: "Message your AI Agent...",
    sendMessage: "Nachricht senden",
    disclaimer:
      "AgentCloud AI may produce inaccurate information. Verify critical data.",
    closeSidebar: "Seitenleiste schließen",
    openSidebar: "Seitenleiste öffnen",
    deleteConversation: "Gespräch löschen",
    newChatTitle: "New Chat",
    attachAria: "Dateien oder Bilder anhängen",
    dropHint: "Dateien oder Bilder hier ablegen",
    removeAttachment: "{name} entfernen",
    fileTooLarge: "„{name}“ ist zu groß (max. {max})",
    tooManyFiles: "Du kannst höchstens {n} Dateien anhängen",
    unsupportedFile: "„{name}“ konnte nicht gelesen werden",
  },

  agentChat: {
    notFoundTitle: "Agent nicht gefunden",
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
    comingSoon: "Demnächst",
    agentsCount: "{count} agents",
  },

  agentDetail: {
    backToMarketplace: "Back to marketplace",
    forIndustry: "For {industry}",
    configureAgent: "Configure agent",
    setup: "Setup",
    typicalLaunch: "Typical launch time: {setupTime}",
    gdprNote: "Built for GDPR-aware business workflows",
    setupPrice: "Setup price",
    whatAutomates: "What this agent automates",
    howItWorks: "How it works",
    howItWorksDesc:
      "{name} follows a structured workflow to deliver results every time.",
    useCases: "Use case examples",
    useCasesDesc: "Real scenarios where {name} delivers value out of the box.",
    integrationsTitle: "Integrationen",
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
    requestDemo: "Demo anfordern",
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
    copy: "Kopieren",
    copied: "Kopiert!",
    toolsBase: "Vertical tool base",
    leadCapture: "Lead capture",
    fullTools: "Full vertical tools",
    prioritySupport: "Priority support",
    consentPrefix: "I accept the",
    consentTerms: "Terms of Service",
    consentConjunction: "and the",
    consentPrivacy: "Privacy Policy",
    connected: "Connected",
    manage: "Manage",
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
    active: "Aktiv",
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
    gettingStartedIntro:
      "Each plan includes a monthly token budget per installed agent (input + output). Usage over the allowance is billed automatically at {rate} per 1.000 tokens via Stripe, with a safety cap at 2x the allowance.",
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
    googleConnectDesc:
      "Conecta tu cuenta de Google (Gmail y Calendario) para dar a los agentes acceso completo: lectura, envío/eliminación de emails y gestión de eventos con recordatorios.",
    googleConnectButton: "Connect Google account",
    googleConnectedBadge: "Connected",
    googleConnectedMsg: "Google account connected successfully.",
    googleConnectFailed: "Connection failed ({reason}).",
    googleConnectedEmail: "Connected account",
    googleConnectedAt: "Connected on",
    googleScopes: "Active scopes",
    googleDisconnect: "Disconnect",
    googleDisconnectConfirm:
      "Disconnect your Google account? Agents will lose access to Gmail and Calendar.",
    googleDisconnecting: "Disconnecting...",
    googleDisconnectedMsg: "Google account disconnected.",
    googleDisconnectFailed: "Could not disconnect the account. Please try again.",
    googleNotConnected: "No Google account connected.",
    googleNotConfigured:
      "Google integration not configured: add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the environment variables.",
    scopeGmailReadonly: "Gmail (Lesen & Schreiben)",
    scopeCalendarReadonly: "Kalender (Lesen & Schreiben)",
    scopeOther: "Other permissions",
  },

  auth: {
    login: {
      title: "Welcome back",
      hint: "Sign in with email and password or with Google",
      email: "Email",
      emailPlaceholder: "you@company.com",
      password: "Password",
      passwordPlaceholder: "Your password",
      submit: "Anmelden",
      google: "Continue with Google",
      prompt: "Don't have an account yet?",
      link: "Sign up",
      forgot: "Forgot password?",
      resetSent: "We sent you a link to reset your password.",
      needSigninToConnect:
        "To connect {app}, sign in with your account first.",
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
      link: "Anmelden",
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
    badge: "Maßgeschneidert",
    titleA: "Wir bauen",
    titleB: "deinen idealen Agenten.",
    subtitle:
      "Beschreibe deinen Workflow: Wir verbinden deine Tools und liefern einen maßgeschneiderten KI-Agenten — ohne Code, in wenigen Tagen einsatzbereit.",
    benefits: [
      {
        title: "Maßgeschneidertes Design",
        text: "Wir analysieren deinen Prozess und entwerfen einen Agenten, der deine Unternehmenssprache spricht.",
      },
      {
        title: "Echte Integrationen",
        text: "Wir verbinden Gmail, Slack, Shopify, Stripe, Sheets und die Tools, die du täglich nutzt.",
      },
      {
        title: "Schnelle Lieferung",
        text: "Erhalte deinen konfigurierten, getesteten Agenten in 3-7 Werktagen live in deinem Dashboard.",
      },
    ],
    whatToExpect: "Was du bekommst",
    expectations: [
      "Workflow-Analyse und Automatisierungs-Mapping",
      "Technischer Vorschlag mit Integrationen, Zeitplan und klaren Kosten",
      "Maßgeschneiderter Agent, geliefert und in deinem Konto aktiviert",
      "Launch-Support und Optimierung nach der Auslieferung",
    ],
    requestDemo: "Maßgeschneiderten Agenten anfragen",
    requestDemoHint:
      "Erzähle uns von deiner Idee: Wir melden uns innerhalb von 24 Stunden mit Vorschlag und Angebot.",
    firstName: "Vorname",
    lastName: "Nachname",
    email: "E-Mail",
    company: "Unternehmen",
    idea: "Dein Wunsch-Agent",
    integrationsLabel: "Zu verbindende Tools",
    budgetLabel: "Richtbudget",
    firstNamePh: "Max",
    lastNamePh: "Mustermann",
    emailPh: "max@firma.de",
    companyPh: "Dein Unternehmen",
    ideaPh: "Z.B. ein Agent, der E-Mails liest, Angebote erstellt und automatisch versendet...",
    integrationsPh: "Z.B. Gmail, Shopify, Slack...",
    budgetPh: "Z.B. €500-1500",
    requestButton: "Anfrage senden",
    scheduleNote: "Ohne Verpflichtung — erhalte Vorschlag und Angebot unverbindlich",
    successTitle: "Anfrage gesendet!",
    successText:
      "Danke, {name}. Wir haben deine Anfrage für einen maßgeschneiderten Agenten erhalten und melden uns innerhalb von 24 Stunden.",
    close: "Schließen",
    failedRequest: "Anfrage konnte nicht gesendet werden",
    somethingWrong: "Etwas ist schief gelaufen",
    howToUse: {
      badge: "So funktioniert's",
      titleA: "Von der Idee",
      titleB: "zum aktiven Agenten",
      subtitle:
        "Ein geführter Weg, ohne Fachjargon, von deinem Bedarf zu deinem maßgeschneiderten Agenten.",
      steps: [
        {
          title: "Teile deine Idee",
          text: "Fülle das Formular mit Workflow, Tools und Ziel aus: Wir melden uns binnen 24 Stunden.",
        },
        {
          title: "Vorschlag & Angebot",
          text: "Erhalte einen klaren Vorschlag mit Integrationen, Zeitplan (3-7 Tage) und Kosten, ohne Überraschungen.",
        },
        {
          title: "Wir bauen den Agenten",
          text: "Wir entwerfen und testen deinen maßgeschneiderten Agenten und verbinden deine Tools sicher.",
        },
        {
          title: "Lieferung ins Dashboard",
          text: "Der Agent erscheint unter deinen aktiven Agenten, bereit mit deinen Zugangsdaten.",
        },
        {
          title: "Launch & Feintuning",
          text: "Wir begleiten den Launch und optimieren Ton, Trigger und Workflow im realen Einsatz.",
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
    sendButton: "Nachricht senden",
    successTitle: "Message sent!",
    successText:
      "Thanks, {name}. We've received your message and will reply within 24 hours.",
    close: "Schließen",
    reasons: ["General inquiry", "Sales", "Support", "Partnership", "Other"],
    selected: "Selected: {subject}",
    somethingWrong: "Something went wrong",
    failedSend: "Failed to send message",
  },

  legal: {
    seeTerms: "See the Terms of Service",
    seeRefunds: "See the Refund Policy",
    privacy: {
      backHome: "Zur Startseite",
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
      backHome: "Zur Startseite",
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
      backHome: "Zur Startseite",
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
      invoice_created: "{agent} created invoice {invoice}",
      payment_reminder_sent: "{agent} sent a payment reminder to {email}",
      post_scheduled: "{agent} scheduled a {platform} post ({when})",
      cv_analyzed: "{agent} analyzed CV {filename}",
      email_sent: "{agent} sent an email to {to} ({subject})",
      email_trashed: "{agent} trashed an email ({message_id})",
      calendar_event_deleted: "{agent} deleted event {event_id}",
      calendar_reminder_set: "{agent} set a reminder for {event_id} ({minutes} min)",
      quote_generated: "{agent} generated a quote for {client_email}",
      quote_sent: "{agent} sent a quote to {client_email}",
      review_replied: "{agent} replied to a review ({review_id})",
      store_created: "{agent} created the store \"{shop_name}\""
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
    backHome: "Zur Startseite",
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

export const fr: Dictionary = {
  common: {
    comingSoon: "Bientôt disponible",
    comingSoonShort: "Bientôt disponible",
    setup: "Configuration",
    view: "Voir",
    active: "Actif",
    online: "En ligne",
    close: "Fermer",
    copy: "Copier",
    copied: "Copié !",
    aiUnavailable:
      "Le service IA est momentanément indisponible. Réessayez sous peu.",
    contactSupport: "Contactez-nous par e-mail",
    connectSuccess: "Connexion réussie.",
    connectFailed: "Échec de la connexion ({reason}). Réessayez ou contactez-nous.",
  },

  apiErrors: {
    unauthorized: "Non autorisé",
    invalidJson: "Corps JSON invalide",
    missingAgentOrMessages: "agentId ou messages manquant",
    agentNotFound: "Agent introuvable",
    rateLimited: "Trop de requêtes. Réessayez dans un instant.",
    executionError: "Erreur lors de l'exécution de l'agent",
    notSubscribed:
      "Vous n'avez pas d'abonnement actif pour cet agent. Abonnez-vous pour l'utiliser.",
    subscriptionInactive:
      "Votre abonnement pour cet agent est {status}. Réactivez-le pour continuer.",
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
    integrations: "Intégrations",
    browseAllAgents: "Voir tous les agents",
    logOut: "Se déconnecter",
    signIn: "Se connecter",
    requestDemo: "Demander une démo",
    menu: "Menu",
    solutionsItems: [
      {
        title: "Shopify & E-commerce",
        text: "Trouvez des produits, créez des liens panier et vérifiez le statut des commandes.",
      },
      {
        title: "Capture de leads",
        text: "Capturez automatiquement les contacts depuis les formulaires et votre site.",
      },
      {
        title: "Support produits & commandes",
        text: "Répondez aux questions produits et commandes 24/7.",
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
      { plan: "Starter", price: "9,99 €/mois", text: "One workflow agent" },
      { plan: "Growth", price: "14,99 €/mois", text: "Agent plus integrations" },
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
    titleConnector: "avec",
    titleB: "Exécution IA",
    subtitle:
      "Ask for anything. Our AI will plan it, execute it, and connect it to your tools.",
    placeholderEmpty: "Dites-nous ce que vous souhaitez automatiser...",
    placeholderContinued: "Continuer la conversation...",
    sendMessage: "Envoyer le message",
    resetChat: "Réinitialiser la conversation (enregistrer dans le chat)",
    openFullChat: "Ouvrir le chat complet",
    aiError:
      "Le service IA est momentanément indisponible. Réessayez sous peu.",
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
        title: "Shopify Product Assistant",
        description:
          "The Shopify agent answers product and order questions directly in chat, 24/7.",
      },
      {
        title: "Direct Cart Links",
        description:
          "Find products in the catalog and generate direct cart links you can share anywhere.",
      },
      {
        title: "Real-time Order Status",
        description:
          "Check order status with order number and email, and answer in seconds.",
      },
      {
        title: "Automatic Lead Capture",
        description:
          "The lead capture agent collects prospect details and enriches them with the right context.",
      },
      {
        title: "Sales Notifications",
        description:
          "When a lead arrives, the sales team is notified on Slack with all the details.",
      },
      {
        title: "Lead Qualification",
        description:
          "Enrich contacts and score each lead so you focus only on those ready to buy.",
      },
    ],
  },

  integrations: {
    badge: "Intégrations",
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
        title: "Capture de leads",
        description: "Capture leads from your site and notify sales",
      },
      {
        title: "Lead Qualification",
        description: "Enrich and qualify contacts automatically",
      },
    ],
    browseAll: "Voir tous les agents",
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
    chartTitle: "Runs in the last 7 days",
    chartRuns: "Runs",
    chartWeek: "This week",
    sidebar: ["Overview", "Agents", "Intégrations", "Runs", "Billing"],
    stats: [] as [string, string][],
    agentsHeading: "Your agents",
    recentActivity: "Recent activity",
    events: [] as [string, string][],
    agents: [] as [string, string, string, string, string][],
  },

  agentCard: {
    comingSoon: "Bientôt disponible",
    setup: "Configuration",
    view: "Voir",
    buy: "Buy",
  },

  chat: {
    newChat: "New Chat",
    assistantName: "Assistant personnel",
    googleConnectTitle: "Connect your Google account",
    googleConnectDesc:
      "Connectez Gmail et Google Calendar pour que l'agent puisse travailler avec vos données réelles.",
    googleConnectAction: "Connect Google account",
    googleConnectedLine: "Google account connected: {email}",
    googleReadOnlyHint:
      "Accès complet à Gmail et Google Calendar : envoi, suppression d'e-mails et gestion d'événements avec rappels (consentement OAuth sécurisé).",
    home: "Accueil",
    chat: "Chat",
    tools: "Outils",
    agents: "Agents",
    conversations: "Conversations",
    noConversations: "Pas encore de conversations. Démarrez un nouveau chat !",
    thinking: "Réflexion...",
    online: "En ligne",
    emptyTitle: "Que souhaitez-vous automatiser ?",
    emptySubtitle:
      "Demandez-moi tout sur l'automatisation de votre entreprise. Je peux aider avec les e-mails, le support, les leads, etc.",
    placeholder: "Message your AI Agent...",
    sendMessage: "Envoyer le message",
    disclaimer:
      "AgentCloud AI may produce inaccurate information. Verify critical data.",
    closeSidebar: "Fermer la barre latérale",
    openSidebar: "Ouvrir la barre latérale",
    deleteConversation: "Supprimer la conversation",
    newChatTitle: "New Chat",
    attachAria: "Joindre des fichiers ou des images",
    dropHint: "Déposez ici fichiers ou images pour les joindre",
    removeAttachment: "Retirer {name}",
    fileTooLarge: "« {name} » est trop volumineux (max {max})",
    tooManyFiles: "Vous pouvez joindre au plus {n} fichiers",
    unsupportedFile: "Impossible de lire « {name} »",
  },

  agentChat: {
    notFoundTitle: "Agent introuvable",
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
    comingSoon: "Bientôt disponible",
    agentsCount: "{count} agents",
  },

  agentDetail: {
    backToMarketplace: "Back to marketplace",
    forIndustry: "For {industry}",
    configureAgent: "Configure agent",
    setup: "Configuration",
    typicalLaunch: "Typical launch time: {setupTime}",
    gdprNote: "Built for GDPR-aware business workflows",
    setupPrice: "Setup price",
    whatAutomates: "What this agent automates",
    howItWorks: "How it works",
    howItWorksDesc:
      "{name} follows a structured workflow to deliver results every time.",
    useCases: "Use case examples",
    useCasesDesc: "Real scenarios where {name} delivers value out of the box.",
    integrationsTitle: "Intégrations",
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
    requestDemo: "Demander une démo",
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
    copy: "Copier",
    copied: "Copié !",
    toolsBase: "Vertical tool base",
    leadCapture: "Lead capture",
    fullTools: "Full vertical tools",
    prioritySupport: "Priority support",
    consentPrefix: "I accept the",
    consentTerms: "Terms of Service",
    consentConjunction: "and the",
    consentPrivacy: "Privacy Policy",
    connected: "Connected",
    manage: "Manage",
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
    active: "Actif",
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
    gettingStartedIntro:
      "Each plan includes a monthly token budget per installed agent (input + output). Usage over the allowance is billed automatically at {rate} per 1.000 tokens via Stripe, with a safety cap at 2x the allowance.",
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
    googleConnectDesc:
      "Verbinde dein Google-Konto (Gmail und Kalender), um Agenten Vollzugriff zu geben: Lesen, Senden/Löschen von E-Mails und Verwalten von Terminen mit Erinnerungen.",
    googleConnectButton: "Connect Google account",
    googleConnectedBadge: "Connected",
    googleConnectedMsg: "Google account connected successfully.",
    googleConnectFailed: "Connection failed ({reason}).",
    googleConnectedEmail: "Connected account",
    googleConnectedAt: "Connected on",
    googleScopes: "Active scopes",
    googleDisconnect: "Disconnect",
    googleDisconnectConfirm:
      "Disconnect your Google account? Agents will lose access to Gmail and Calendar.",
    googleDisconnecting: "Disconnecting...",
    googleDisconnectedMsg: "Google account disconnected.",
    googleDisconnectFailed: "Could not disconnect the account. Please try again.",
    googleNotConnected: "No Google account connected.",
    googleNotConfigured:
      "Google integration not configured: add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the environment variables.",
    scopeGmailReadonly: "Gmail (lecture & écriture)",
    scopeCalendarReadonly: "Calendrier (lecture & écriture)",
    scopeOther: "Other permissions",
  },

  auth: {
    login: {
      title: "Welcome back",
      hint: "Sign in with email and password or with Google",
      email: "Email",
      emailPlaceholder: "you@company.com",
      password: "Password",
      passwordPlaceholder: "Your password",
      submit: "Se connecter",
      google: "Continue with Google",
      prompt: "Don't have an account yet?",
      link: "Sign up",
      forgot: "Forgot password?",
      resetSent: "We sent you a link to reset your password.",
      needSigninToConnect:
        "To connect {app}, sign in with your account first.",
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
      link: "Se connecter",
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
    badge: "Sur mesure",
    titleA: "Construisons",
    titleB: "votre agent idéal.",
    subtitle:
      "Décrivez votre flux : nous connectons vos outils et livrons un agent IA sur mesure — sans code, prêt en quelques jours.",
    benefits: [
      {
        title: "Conception sur mesure",
        text: "Nous analysons votre processus et concevons un agent qui parle la langue de votre entreprise.",
      },
      {
        title: "Intégrations réelles",
        text: "Nous connectons Gmail, Slack, Shopify, Stripe, Sheets et les outils que vous utilisez au quotidien.",
      },
      {
        title: "Livraison rapide",
        text: "Recevez votre agent configuré, testé et live dans votre dashboard en 3-7 jours ouvrés.",
      },
    ],
    whatToExpect: "Ce que vous obtenez",
    expectations: [
      "Analyse du flux et cartographie des automatisations",
      "Proposition technique avec intégrations, délais et coûts clairs",
      "Agent sur mesure livré et activé sur votre compte",
      "Support au lancement et optimisation post-livraison",
    ],
    requestDemo: "Demander un agent sur mesure",
    requestDemoHint:
      "Racontez votre idée : nous répondons sous 24h avec proposition et devis.",
    firstName: "Prénom",
    lastName: "Nom",
    email: "Email",
    company: "Entreprise",
    idea: "Votre agent imaginé",
    integrationsLabel: "Outils à connecter",
    budgetLabel: "Budget indicatif",
    firstNamePh: "Jean",
    lastNamePh: "Dupont",
    emailPh: "jean@entreprise.fr",
    companyPh: "Votre entreprise",
    ideaPh: "Ex. un agent qui lit les emails, crée des devis et les envoie automatiquement...",
    integrationsPh: "Ex. Gmail, Shopify, Slack...",
    budgetPh: "Ex. €500-1500",
    requestButton: "Envoyer la demande",
    scheduleNote: "Sans engagement — recevez proposition et devis sans contrainte",
    successTitle: "Demande envoyée !",
    successText:
      "Merci, {name}. Nous avons reçu votre demande d'agent sur mesure et vous répondrons sous 24h.",
    close: "Fermer",
    failedRequest: "Échec de l'envoi",
    somethingWrong: "Quelque chose s'est mal passé",
    howToUse: {
      badge: "Comment ça marche",
      titleA: "De l'idée",
      titleB: "à l'agent actif",
      subtitle:
        "Un parcours guidé, sans jargon, de votre besoin à votre agent sur mesure.",
      steps: [
        {
          title: "Partagez votre idée",
          text: "Remplissez le formulaire avec flux, outils et objectif : nous revenons vers vous en 24h.",
        },
        {
          title: "Proposition & devis",
          text: "Recevez une proposition claire avec intégrations, planning (3-7 jours) et coûts, sans surprises.",
        },
        {
          title: "Nous construisons l'agent",
          text: "Nous concevons et testons votre agent sur mesure en connectant vos outils en toute sécurité.",
        },
        {
          title: "Livraison dans le dashboard",
          text: "L'agent apparaît parmi vos agents actifs, prêt avec vos identifiants.",
        },
        {
          title: "Lancement & optimisation",
          text: "Nous vous accompagnons au lancement et ajustons ton, déclencheurs et flux en usage réel.",
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
    sendButton: "Envoyer le message",
    successTitle: "Message sent!",
    successText:
      "Thanks, {name}. We've received your message and will reply within 24 hours.",
    close: "Fermer",
    reasons: ["General inquiry", "Sales", "Support", "Partnership", "Other"],
    selected: "Selected: {subject}",
    somethingWrong: "Something went wrong",
    failedSend: "Failed to send message",
  },

  legal: {
    seeTerms: "See the Terms of Service",
    seeRefunds: "See the Refund Policy",
    privacy: {
      backHome: "Retour à l'accueil",
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
      backHome: "Retour à l'accueil",
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
      backHome: "Retour à l'accueil",
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
      invoice_created: "{agent} created invoice {invoice}",
      payment_reminder_sent: "{agent} sent a payment reminder to {email}",
      post_scheduled: "{agent} scheduled a {platform} post ({when})",
      cv_analyzed: "{agent} analyzed CV {filename}",
      email_sent: "{agent} sent an email to {to} ({subject})",
      email_trashed: "{agent} trashed an email ({message_id})",
      calendar_event_deleted: "{agent} deleted event {event_id}",
      calendar_reminder_set: "{agent} set a reminder for {event_id} ({minutes} min)",
      quote_generated: "{agent} generated a quote for {client_email}",
      quote_sent: "{agent} sent a quote to {client_email}",
      review_replied: "{agent} replied to a review ({review_id})",
      store_created: "{agent} created the store \"{shop_name}\""
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
    backHome: "Retour à l'accueil",
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

export function getDictionary(locale: Locale): Dictionary {
  switch (locale) {
    case "it": return it;
    case "en": return en;
    case "es": return es;
    case "de": return de;
    case "fr": return fr;
    default: return en;
  }
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
