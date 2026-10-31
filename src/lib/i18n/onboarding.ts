/**
 * Testi del setup guidato (onboarding) — file i18n CENTRALE: it è la lingua
 * base, en è pre-disposto. Le altre lingue della piattaforma (es/de/fr)
 * ricadono su en finché non arriva il proprio overlay (stesso pattern di
 * agentCatalog.ts). Tutto il microcopy vive qui: niente stringhe sparse nei
 * componenti.
 *
 * Il tipo `OnboardingCopy` è la forma dell'oggetto it: cambiare una chiave
 * rompe la build finché gli altri overlay non si allineano (voluto).
 */

const it = {
  meta: {
    title: "Setup · AgentCloud",
    privacy: "Queste risposte non vanno a nessuno: servono solo a personalizzare la tua esperienza. Le puoi cambiare o cancellare dalle Impostazioni.",
  },
  nav: {
    skip: "Preferisco scoprire da solo",
    back: "Indietro",
    next: "Avanti",
    stepOf: (step: number, total: number) => `Schermata ${step} di ${total}`,
    saveError: "Non hai perso niente: riproviamo appena torna la connessione.",
  },
  screen1: {
    title: "Prima ancora di cominciare: come ti chiamiamo?",
    subtitle: "Come ti presentiamo dentro la piattaforma. Un soprannome va benissimo.",
    placeholder: "Es. Marta, Il Ragioniere Fortunato…",
    label: "Il tuo nome",
    fromGoogle: "Arriva da Google: cambialo pure se preferisci altro.",
  },
  screen2: {
    title: "Partiamo dalle basi: tu, che cosa fai di bello nella vita?",
    options: {
      employee: { label: "Lavoro dipendente", hint: "Capo, riunioni, scadenze" },
      business: { label: "Ho un'attività / sono freelance", hint: "Clienti, preventivi, conti da chiudere" },
      student: { label: "Studio", hint: "Libri, esami, tesi che aspetta" },
      exploring: { label: "Sto cercando la mia strada", hint: "Curioso, mani aperte" },
      other: { label: "Altro…", hint: "Raccontaci in due parole" },
    },
    otherField: {
      label: "In due parole",
      placeholder: "Es. dirigo un circolo sportivo, curo imballaggi…",
    },
  },
  screen3: {
    work: {
      title: "Qual è il tuo ruolo?",
      subtitle: "Ci dice quali problemi e scadenze prenderti di torno.",
    },
    // I ruoli restano in inglese: li usa pure il resto del sito.
    roleLabels: {
      "product-manager": "Product Manager",
      developer: "Developer",
      marketer: "Marketer",
      "sales-rep": "Sales Rep",
      "solo-founder": "Solo Founder",
      designer: "Designer",
      "data-analyst": "Data Analyst",
      "customer-success": "Customer Success",
      "community-lead": "Community Lead",
      "finance-ops": "Finance Ops",
      operations: "Operations",
      "course-creator": "Course Creator",
    },
    student: {
      title: "Che giro di studi? Solo per capire come parlarti.",
      levels: {
        highschool: { label: "Superiori" },
        university: { label: "Università" },
        postgrad: { label: "Master / dottorato" },
        "self-taught": { label: "Autodidatta" },
      },
      areaLabel: "E che cosa studi?",
      areaPlaceholder: "Es. marketing, fisica, scienze politiche…",
    },
    roleOther: {
      label: "Il tuo ruolo, in parole tue",
      placeholder: "Es. stregone dei fogli Excel, generalista del caos…",
    },
    other: "Altro…",
  },
  screen4: {
    title: "Qual è il lavoro che odi fare a mano ma fai comunque?",
    subtitle: "Scegli fino a 3. Da qui calcoliamo chi consigliarti davvero.",
    maxReached: "Tre bastano: le altre le aggiungi dopo, selezionandole a mano.",
    cards: {
      "sales-finance": {
        emoji: "🛒",
        title: "Vendere e farsi pagare",
        row: "Ordini, fatture e fogli Excel inseguiti a mano",
      },
      marketing: {
        emoji: "📣",
        title: "Marketing e nuovi contatti",
        row: "Le stesse email e DM riscritti a ogni lead nuovo",
      },
      customers: {
        emoji: "💬",
        title: "Clienti e assistenza",
        row: "Recensioni e ticket che aspettano risposta da tre giorni",
      },
      admin: {
        emoji: "📅",
        title: "Agenda e scadenze",
        row: "Appuntamenti a colpi di ping-pong via mail",
      },
      content: {
        emoji: "✍️",
        title: "Testi, social e contenuti",
        row: "Didascalie e bozze che riscrivi da capo ogni volta",
      },
      data: {
        emoji: "📊",
        title: "Numeri e report",
        row: "Il briefing del lunedì copiato a mano da tre tabelle",
      },
      dev: {
        emoji: "💻",
        title: "Codice e sito",
        row: "Fix e deploy di sera, di fretta, con le dita incrociate",
      },
    },
  },
  screen5: {
    title: "Con che cosa lavori già?",
    subtitle: "Nessun collegamento adesso: serve solo a suggerire dove conviene connettere.",
    none: "Non uso nessuno di questi",
  },
  screen6: {
    title: "Come ti parli?",
    subtitle: "Posso fare il collega serio o l'amico che ne sa.",
    tones: {
      direct: {
        label: "Diretto e sintetico",
        desc: "Risposte telegrafiche, zero preamboli.",
      },
      stepbystep: {
        label: "Chiaro e passo-passo",
        desc: "Una cosa per volta, senza salti.",
      },
      technical: {
        label: "Tecnico e preciso",
        desc: "Terminologia esatta, dettagli dove servono.",
      },
      friendly: {
        label: "Amichevole e informale",
        desc: "Due colleghi che si guardano le spalle.",
      },
    },
    languageLabel: "E in che lingua ti rispondiamo?",
    languageDefault: (browserLabel: string) => `${browserLabel} (dalla lingua del browser)`,
  },
  screen7: {
    title: "Il tuo agente predefinito",
    explanation: "È quello che trovi già selezionato quando apri una nuova chat. Lo cambi quando vuoi dalle Impostazioni.",
    recommended: "Consigliati per te",
    browseAll: "Altri agenti",
    none: "Nessuno, fammi scegliere ogni volta",
    searchPlaceholder: "Cerca agente…",
    noResults: "Nessun agente con questo nome. Prova con un pezzo di parola.",
    owned: "Già tuo",
    trial: "In prova gratuita",
  },
  screen8: {
    title: "Fatto. Studio operativo pronto, e pure ordinato.",
    summaryTitle: "Ecco il tuo setup",
    summary: {
      name: "Ti chiamiamo",
      occupation: "Ti occupi di",
      role: "Il tuo ruolo",
      studyArea: "Il tuo studio",
      goals: "Smettici di fare a mano",
      tools: "Lavori già con",
      tone: "Tono",
      language: "Lingua",
      defaultAgent: "Agente predefinito",
      none: "Nessuno (scegli ogni volta)",
    },
    defaultAgentIntro: "Nelle nuove chat parte da qui:",
    integrationsTitle: "Da collegare quando hai due minuti",
    integrationsHint: "Ogni collegamento sono 2 click; poi la chat li usa senza chiedere.",
    connectCta: "Collega in 2 click",
    primaryCta: "Apri la tua prima chat",
    secondaryCta: "Non ora, portami alla dashboard",
    starterPrompt: "Prima domanda suggerita (modificala liberamente):",
    // Si invia in automatico all'arrivo in /chat: onesto avvisarlo che costa
    // uno dei 5 messaggi del piano gratuito. Modificabile in chat dopo.
    starterAutoSend: "Arrivi in chat e parte da sola: usa uno dei 5 messaggi di oggi.",
    starterPrompts: {
      "sales-finance": "Passa in rassegna le fatture e i pagamenti aperti: elenca cosa è scaduto e prepara i promemoria gentili.",
      marketing: "Prepara 5 bozze di follow-up per i lead che non rispondono da due settimane.",
      customers: "Fammi il riepilogo delle recensioni e dei ticket senza risposta, con una proposta di reply una per una.",
      admin: "Guarda la mia settimana: riorganizzala e libera due ore per il lavoro che conta davvero.",
      content: "Bozze di 3 post per questa settimana, con un angolo diverso per ciascuno.",
      data: "Riassumi i numeri di questa settimana in cinque righe, con l'unico dato a cui prestare attenzione.",
      dev: "Guarda il progetto e suggerisci i tre fix più urgenti, in ordine di rischio.",
    },
    starterStudent: "Aiutami ad organizzare lo studio di questa settimana: obiettivi concreti, pause vere, niente lista impossibile.",
    trialNote: "E, onesto: nel piano gratuito hai 5 messaggi al giorno su tutti gli agenti. Domani tornano — senza promozioni urlate.",
    returnNote: (target: string) => `Al termine torni a dove eri: ${target}.`,
  },
  defaultAgentPicker: {
    label: "Agente predefinito per le nuove chat",
    help: "È l'agente già selezionato quando apri una nuova chat. Dentro la chat puoi cambiarlo con un click: il predefinito non cambia.",
    none: "Nessuno (chiedimi ogni volta)",
    searchPlaceholder: "Cerca agente…",
    saved: "Impostazione salvata.",
    savedNone: "Ok, nessun predefinito.",
    fallbackNotice: (name: string) => `L'agente ${name} non c'è più: la chat parte senza selezione. Scegline un altro dal selettore o dalle Impostazioni.`,
    dismiss: "Ok, capito",
  },
  settings: {
    chat: {
      title: "Chat",
      tone: "Tono delle risposte",
      language: "Lingua delle risposte",
      redo: "Rifai l'onboarding",
      redoHint: "Ti ruba 1 minuto, promesso. Rifallo quante volte vuoi.",
      redoConfirm: "Riparto con le domande? Le risposte attuali verranno sostituite.",
    },
    reminderBanner: {
      title: "Hai saltato il setup.",
      body: "Ti ruba 1 minuto, promesso.",
      cta: "Fai il setup",
      dismiss: "Più tardi",
    },
  },
} as const;

/**
 * Allarga i letterali stringa a `string` (ricorsivamente) ma conserva chiavi,
 * strutture e firme delle funzioni: così `it` resta la fonte della forma e
 * `en` può scrivere le proprie frasi senza litigare con i letterali congelati.
 */
type Widen<T> = T extends (...args: never[]) => unknown
  ? (...args: Parameters<T>) => ReturnType<T>
  : T extends string
    ? string
    : T extends ReadonlyArray<infer U>
      ? Array<Widen<U>>
      : T extends object
        ? { [K in keyof T]: Widen<T[K]> }
        : T;

export type OnboardingCopy = Widen<typeof it>;

const en: OnboardingCopy = {
  meta: {
    title: "Setup · AgentCloud",
    privacy: "These answers are only used to personalize your experience. Change or delete them anytime in Settings.",
  },
  nav: {
    skip: "I'd rather explore on my own",
    back: "Back",
    next: "Next",
    stepOf: (step: number, total: number) => `Screen ${step} of ${total}`,
    saveError: "Nothing was lost: we'll retry once the connection is back.",
  },
  screen1: {
    title: "Before anything else: what should we call you?",
    subtitle: "How you're addressed inside the platform. A nickname is fine.",
    placeholder: "e.g. Marta, The Lucky Accountant…",
    label: "Your name",
    fromGoogle: "Arrives with your Google account: change it if you prefer.",
  },
  screen2: {
    title: "Let's start with the basics: what do you do in life?",
    options: {
      employee: { label: "Employee", hint: "Bosses, meetings, deadlines" },
      business: { label: "I run a business / freelance", hint: "Clients, quotes, numbers to close" },
      student: { label: "Studying", hint: "Books, exams, a thesis waiting" },
      exploring: { label: "Finding my way", hint: "Curious, hands open" },
      other: { label: "Other…", hint: "Tell us in two words" },
    },
    otherField: {
      label: "In two words",
      placeholder: "e.g. I run a sports club, I make packaging…",
    },
  },
  screen3: {
    work: {
      title: "What's your role?",
      subtitle: "It tells us which messes to take off your hands.",
    },
    roleLabels: {
      "product-manager": "Product Manager",
      developer: "Developer",
      marketer: "Marketer",
      "sales-rep": "Sales Rep",
      "solo-founder": "Solo Founder",
      designer: "Designer",
      "data-analyst": "Data Analyst",
      "customer-success": "Customer Success",
      "community-lead": "Community Lead",
      "finance-ops": "Finance Ops",
      operations: "Operations",
      "course-creator": "Course Creator",
    },
    student: {
      title: "Where are you in your studies? Just to know how to talk to you.",
      levels: {
        highschool: { label: "High school" },
        university: { label: "University" },
        postgrad: { label: "Master's / PhD" },
        "self-taught": { label: "Self-taught" },
      },
      areaLabel: "And what do you study?",
      areaPlaceholder: "e.g. marketing, physics, political science…",
    },
    roleOther: {
      label: "Your role, in your own words",
      placeholder: "e.g. spreadsheet wizard, chaos generalist…",
    },
    other: "Other…",
  },
  screen4: {
    title: "Which job do you hate doing by hand but do anyway?",
    subtitle: "Pick up to 3. This is how we choose who to actually recommend.",
    maxReached: "Three is enough: you can add the rest later, selecting them manually.",
    cards: {
      "sales-finance": {
        emoji: "🛒",
        title: "Selling and getting paid",
        row: "Orders, invoices and spreadsheets chased by hand",
      },
      marketing: {
        emoji: "📣",
        title: "Marketing and new leads",
        row: "The same emails and DMs rewritten for every new lead",
      },
      customers: {
        emoji: "💬",
        title: "Customers and support",
        row: "Reviews and tickets waiting three days for a reply",
      },
      admin: {
        emoji: "📅",
        title: "Agenda and deadlines",
        row: "Appointment ping-pong over email",
      },
      content: {
        emoji: "✍️",
        title: "Texts, social and content",
        row: "Captions and drafts rewritten from scratch every time",
      },
      data: {
        emoji: "📊",
        title: "Numbers and reports",
        row: "Monday's briefing copied by hand from three tables",
      },
      dev: {
        emoji: "💻",
        title: "Code and websites",
        row: "Evening fixes, rushed deploys, fingers crossed",
      },
    },
  },
  screen5: {
    title: "What do you already work with?",
    subtitle: "No connections now: this only helps us suggest where to plug in.",
    none: "None of these",
  },
  screen6: {
    title: "How should we talk to you?",
    subtitle: "I can be the serious colleague or the friend who knows.",
    tones: {
      direct: {
        label: "Direct and to the point",
        desc: "Telegram-style replies, zero preamble.",
      },
      stepbystep: {
        label: "Clear and step-by-step",
        desc: "One thing at a time, no skips.",
      },
      technical: {
        label: "Technical and precise",
        desc: "Exact terminology, details where they matter.",
      },
      friendly: {
        label: "Friendly and informal",
        desc: "Two colleagues who watch each other's back.",
      },
    },
    languageLabel: "And in which language do we reply?",
    languageDefault: (browserLabel: string) => `${browserLabel} (from your browser language)`,
  },
  screen7: {
    title: "Your default agent",
    explanation: "It's the one already selected whenever you open a new chat. You can change it anytime in Settings.",
    recommended: "Picked for you",
    browseAll: "Other agents",
    none: "None, ask me every time",
    searchPlaceholder: "Search agents…",
    noResults: "No agent with that name. Try part of a word.",
    owned: "Yours",
    trial: "Free trial",
  },
  screen8: {
    title: "Done. Your workspace is ready — and tidy.",
    summaryTitle: "Here's your setup",
    summary: {
      name: "We call you",
      occupation: "You do",
      role: "Your role",
      studyArea: "You study",
      goals: "You'd stop doing by hand",
      tools: "You already work with",
      tone: "Tone",
      language: "Language",
      defaultAgent: "Default agent",
      none: "None (ask every time)",
    },
    defaultAgentIntro: "New chats start here:",
    integrationsTitle: "To connect when you have two minutes",
    integrationsHint: "Each connection is 2 clicks; then the chat uses it without asking.",
    connectCta: "Connect in 2 clicks",
    primaryCta: "Open your first chat",
    secondaryCta: "Not now, take me to the dashboard",
    starterPrompt: "Suggested first question (edit it freely):",
    starterAutoSend: "You'll land in chat and it starts on its own: it uses one of today's 5 messages.",
    starterPrompts: {
      "sales-finance": "Review open invoices and payments: list what's overdue and draft gentle reminders.",
      marketing: "Draft 5 follow-up messages for leads that haven't replied in two weeks.",
      customers: "Summarize unanswered reviews and tickets, with a reply suggestion for each.",
      admin: "Look at my week: reorganize it and free up two hours for the work that matters.",
      content: "Drafts for 3 posts this week, each with a different angle.",
      data: "Summarize this week's numbers in five lines, with the one figure worth watching.",
      dev: "Look at the project and suggest the three most urgent fixes, by risk.",
    },
    starterStudent: "Help me plan this week's studying: concrete goals, real breaks, no impossible list.",
    trialNote: "Fair warning: on the free plan you get 5 messages a day across all agents. They come back tomorrow — no guilt trip included.",
    returnNote: (target: string) => `When we're done you'll go back to where you were: ${target}.`,
  },
  defaultAgentPicker: {
    label: "Default agent for new chats",
    help: "It's the agent pre-selected when you open a new chat. Inside the chat you can change it in one click: the default stays as it is.",
    none: "None (ask every time)",
    searchPlaceholder: "Search agents…",
    saved: "Setting saved.",
    savedNone: "Done, no default.",
    fallbackNotice: (name: string) => "Agent " + name + " is gone: chats start without a selection. Pick another from the selector or from Settings.",
    dismiss: "Got it",
  },
  settings: {
    chat: {
      title: "Chat",
      tone: "Reply tone",
      language: "Reply language",
      redo: "Run the setup again",
      redoHint: "It steals 1 minute, promise. Redo it as many times as you like.",
      redoConfirm: "Start the questions again? Current answers will be replaced.",
    },
    reminderBanner: {
      title: "You skipped the setup.",
      body: "It costs 1 minute, promise.",
      cta: "Do the setup",
      dismiss: "Later",
    },
  },
};

export function getOnboardingCopy(locale: string): OnboardingCopy {
  if (locale === "it") return it as unknown as OnboardingCopy;
  return en;
}
