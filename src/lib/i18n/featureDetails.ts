/**
 * Contenuti i18n delle pagine di dettaglio delle funzionalità
 * (`/features/agents`, `/features/integrations`, `/features/chat`,
 * `/features/dashboard`).
 *
 * Sono le pagine aperte dal "Vedi dettagli" della sezione Funzionalità in
 * home: prima quel click espandeva solo tre punti, ora porta a una pagina
 * completa (benefici, come funziona, invito all'azione).
 *
 * L'ordine di `FEATURE_SLUGS` combacia con `dict.features.items` in
 * `dictionaries.ts`: la pagina mostra anche le tre voci "in sintesi" già
 * tradotte lì, quindi i due elenchi devono restare allineati.
 *
 * Modulo separato dal dizionario client per la stessa ragione di
 * `appClients.ts`: è testo di marketing servito solo dai server component.
 */

import type { Locale } from "./constants";

export type FeatureSlug = "agents" | "integrations" | "chat" | "dashboard";

/** L'ordine combacia con `dict.features.items` (vedi nota in testa al file). */
export const FEATURE_SLUGS: readonly FeatureSlug[] = [
  "agents",
  "integrations",
  "chat",
  "dashboard",
];

export const FEATURE_PATHS: Record<FeatureSlug, string> = {
  agents: "/features/agents",
  integrations: "/features/integrations",
  chat: "/features/chat",
  dashboard: "/features/dashboard",
};

export function isFeatureSlug(value: string): value is FeatureSlug {
  return (FEATURE_SLUGS as readonly string[]).includes(value);
}

export type FeatureDetailContent = {
  metaTitle: string;
  metaDescription: string;
  badge: string;
  titleA: string;
  titleB: string;
  subtitle: string;
  intro: string;
  /** Etichetta del link di ritorno alla home. */
  homeLink: string;
  benefitsTitle: string;
  benefits: { title: string; text: string }[];
  stepsTitle: string;
  steps: { title: string; text: string }[];
  highlightsTitle: string;
  relatedTitle: string;
  ctaTitle: string;
  ctaText: string;
  ctaLabel: string;
  ctaHref: string;
};

// ─── Italiano ────────────────────────────────────────────────────────────────

const it: Record<FeatureSlug, FeatureDetailContent> = {
  agents: {
    metaTitle: "Agenti AI pronti all'uso",
    metaDescription:
      "Agenti AI già configurati per e-commerce, lead, supporto e marketing: prezzi chiari, integrazioni incluse e prova gratuita di 5 messaggi al giorno.",
    badge: "Agenti",
    titleA: "Agenti AI",
    titleB: "pronti all'uso",
    subtitle:
      "Non modelli generici da addestrare: agenti già configurati per un mestiere, con integrazioni, prezzi chiari e attivazione in giornata.",
    intro:
      "Il catalogo raccoglie agenti specializzati — e-commerce, acquisizione lead, assistenza, marketing e dati — e per ognuno la scheda dice cosa sa fare, quali strumenti usa e quanto costa al mese. Scegli, attiva e inizia: non c'è nessuna infrastruttura da configurare.",
    homeLink: "Torna alla home",
    benefitsTitle: "Perché funziona così",
    benefits: [
      {
        title: "Prezzi trasparenti",
        text: "Ogni scheda mostra costo mensile, categoria e casi d'uso reali prima che tu attivi qualsiasi cosa.",
      },
      {
        title: "Attivazione in giornata",
        text: "Scegli l'agente, collega gli strumenti e comincia: non c'è una fase di setup da gestire.",
      },
      {
        title: "Prova gratuita ogni giorno",
        text: "5 messaggi al giorno in totale su tutti gli agenti, senza carta di credito.",
      },
      {
        title: "Solo ciò che ti serve",
        text: "L'abbonamento è per singolo agente: attivi quelli che usi e disdici quando vuoi.",
      },
    ],
    stepsTitle: "Come si parte",
    steps: [
      {
        title: "Scegli l'agente",
        text: "Sfoglia il catalogo e apri la scheda: sa cosa fa, quali integrazioni usa e quanto costa.",
      },
      {
        title: "Collega i tuoi strumenti",
        text: "Gmail, Calendar, Shopify e gli altri si collegano con accesso sicuro, senza chiavi da copiare.",
      },
      {
        title: "Delega il lavoro",
        text: "Scrivi in chat cosa ti serve e l'agente esegue, mostrando cosa ha fatto e cosa richiede la tua approvazione.",
      },
    ],
    highlightsTitle: "In sintesi",
    relatedTitle: "Le altre funzionalità",
    ctaTitle: "Trova l'agente giusto",
    ctaText:
      "Il catalogo è pubblico: puoi leggere ogni scheda, con prezzi e integrazioni, prima di attivare.",
    ctaLabel: "Sfoglia gli agenti",
    ctaHref: "/agents",
  },
  integrations: {
    metaTitle: "Integrazioni in 2 click",
    metaDescription:
      "Collega Shopify, Gmail, Calendar, Slack e HubSpot agli agenti AgentCloud: autorizzazione OAuth, token cifrati e nessuna chiave da incollare.",
    badge: "Integrazioni",
    titleA: "I tuoi strumenti",
    titleB: "collegati in 2 click",
    subtitle:
      "Shopify, Gmail, Calendar, Slack, HubSpot e altri: l'agente lavora sui tuoi strumenti, con accesso sicuro e senza chiavi da incollare.",
    intro:
      "Un agente serve a poco se resta chiuso in una chat. Le integrazioni gli danno le mani: legge ordini, prenota appuntamenti, invia email e aggiorna i contatti. Il collegamento è un normale flusso di autorizzazione: lo concedi una volta e lo revochi quando vuoi.",
    homeLink: "Torna alla home",
    benefitsTitle: "Come sono fatte",
    benefits: [
      {
        title: "Collegamento in 2 click",
        text: "Nessuna chiave API da copiare: autorizzi dal provider e torni al lavoro.",
      },
      {
        title: "Credenziali protette",
        text: "I token restano cifrati e l'agente vede solo ciò che serve all'azione richiesta.",
      },
      {
        title: "Stato sempre visibile",
        text: "In dashboard vedi quali strumenti sono collegati e quali chiedono una nuova autorizzazione.",
      },
      {
        title: "Catalogo in crescita",
        text: "Nuove integrazioni arrivano di continuo; quelle non ancora attive sono etichettate come tali.",
      },
    ],
    stepsTitle: "Come funziona il collegamento",
    steps: [
      {
        title: "Scegli lo strumento",
        text: "Dalla scheda dell'agente o dalla sezione integrazioni.",
      },
      {
        title: "Autorizza",
        text: "Il provider apre la propria schermata di consenso: nessuna password condivisa con noi.",
      },
      {
        title: "Usalo in chat",
        text: "Da quel momento l'agente può agire sullo strumento quando glielo chiedi.",
      },
    ],
    highlightsTitle: "In sintesi",
    relatedTitle: "Le altre funzionalità",
    ctaTitle: "Guarda il catalogo completo",
    ctaText:
      "Vedi quali integrazioni sono già attive e quali stanno arrivando, con l'agente che le usa.",
    ctaLabel: "Vedi le integrazioni",
    ctaHref: "/integrations",
  },
  chat: {
    metaTitle: "Una chat che esegue davvero",
    metaDescription:
      "La chat di AgentCloud non si ferma alle risposte: cerca prodotti, crea link al carrello, prenota appuntamenti, invia email e genera file, con la tua approvazione.",
    badge: "Chat",
    titleA: "Una chat che",
    titleB: "esegue davvero",
    subtitle:
      "Non solo risposte: l'agente cerca prodotti, crea link al carrello, prenota appuntamenti, invia email e genera file.",
    intro:
      "La chat è il punto di comando. Scrivi quello che ti serve in linguaggio naturale: l'agente pianifica i passi, usa gli strumenti collegati e ti mostra il risultato. Le azioni più delicate partono solo dopo la tua conferma.",
    homeLink: "Torna alla home",
    benefitsTitle: "Cosa cambia rispetto a un chatbot",
    benefits: [
      {
        title: "Azioni reali",
        text: "Carrello, ordini, email, calendario e file generati: non si ferma al testo.",
      },
      {
        title: "Allegati e voce",
        text: "Alleghi immagini o file, oppure detti, e rileggi tutto prima di inviare.",
      },
      {
        title: "Output pronti",
        text: "Anteprime di documenti e file generati, scaricabili quando servono.",
      },
      {
        title: "Conferme umane",
        text: "Le operazioni delicate partono solo dopo la tua approvazione esplicita.",
      },
    ],
    stepsTitle: "Come si usa",
    steps: [
      {
        title: "Descrivi l'obiettivo",
        text: "In linguaggio naturale, come parleresti a un collega.",
      },
      {
        title: "L'agente pianifica",
        text: "Divide il lavoro in passi e usa le integrazioni che ha a disposizione.",
      },
      {
        title: "Verifichi e approvi",
        text: "Vedi cosa ha fatto, correggi il tiro e approvi le azioni che lo richiedono.",
      },
    ],
    highlightsTitle: "In sintesi",
    relatedTitle: "Le altre funzionalità",
    ctaTitle: "Prova la chat",
    ctaText:
      "Hai 5 messaggi gratuiti al giorno in totale su tutti gli agenti: abbastanza per vedere come lavora.",
    ctaLabel: "Apri la chat",
    ctaHref: "/chat",
  },
  dashboard: {
    metaTitle: "Dashboard, report ed export",
    metaDescription:
      "Dashboard AgentCloud: attività degli agenti, uso mensile, stato delle integrazioni e abbonamenti, con export dei report in PDF ed Excel.",
    badge: "Dashboard",
    titleA: "Tutto sotto controllo",
    titleB: "in una schermata",
    subtitle:
      "Agenti attivi, attività svolte, consumo e abbonamenti: la dashboard raccoglie quello che serve per decidere.",
    intro:
      "Quando gli agenti lavorano, serve un posto dove guardare: cosa hanno fatto, quanto hanno consumato e cosa è collegato. Da qui gestisci anche gli abbonamenti e scarichi i report in PDF ed Excel.",
    homeLink: "Torna alla home",
    benefitsTitle: "Cosa ci trovi",
    benefits: [
      {
        title: "Cronologia e attività",
        text: "Per ogni agente vedi cosa ha eseguito e quando, senza scavare nelle conversazioni.",
      },
      {
        title: "Report esportabili",
        text: "Esporti i dati in PDF ed Excel per condividerli o archiviarli.",
      },
      {
        title: "Consumo e limiti",
        text: "Uso mensile e allowance del piano sempre visibili, con avviso prima di toccare i limiti.",
      },
      {
        title: "Abbonamenti in un posto",
        text: "Attivi, sospendi o disdici i singoli agenti dalla stessa schermata.",
      },
    ],
    stepsTitle: "Le tre sezioni",
    steps: [
      {
        title: "Panoramica",
        text: "Agenti attivi, attività recenti e stato delle connessioni.",
      },
      {
        title: "Report",
        text: "Serie temporali di utilizzo e risultati, con export in PDF ed Excel.",
      },
      {
        title: "Abbonamenti",
        text: "Piani attivi, rinnovi e metodo di pagamento, con accesso al portale di fatturazione.",
      },
    ],
    highlightsTitle: "In sintesi",
    relatedTitle: "Le altre funzionalità",
    ctaTitle: "Apri la dashboard",
    ctaText:
      "Se non hai ancora un account, puoi crearne uno e attivare il primo agente in pochi minuti.",
    ctaLabel: "Vai alla dashboard",
    ctaHref: "/dashboard",
  },
};

// ─── English ─────────────────────────────────────────────────────────────────

const en: Record<FeatureSlug, FeatureDetailContent> = {
  agents: {
    metaTitle: "Ready-to-use AI agents",
    metaDescription:
      "AI agents already configured for e-commerce, leads, support and marketing: clear pricing, integrations included and a free trial of 5 messages a day.",
    badge: "Agents",
    titleA: "AI agents",
    titleB: "ready to use",
    subtitle:
      "Not generic models you have to train: agents already configured for a job, with integrations, clear pricing and same-day activation.",
    intro:
      "The catalogue collects specialised agents — e-commerce, lead capture, support, marketing and data — and each page says what it can do, which tools it uses and what it costs per month. Pick one, activate it and start: there is no infrastructure to set up.",
    homeLink: "Back to home",
    benefitsTitle: "Why it works this way",
    benefits: [
      {
        title: "Transparent pricing",
        text: "Every page shows the monthly cost, the category and real use cases before you activate anything.",
      },
      {
        title: "Same-day activation",
        text: "Pick your agent, connect your tools and start: there is no setup phase to manage.",
      },
      {
        title: "A free trial every day",
        text: "5 messages a day in total across all agents, with no credit card.",
      },
      {
        title: "Only what you need",
        text: "Subscriptions are per agent: activate the ones you use and cancel whenever you want.",
      },
    ],
    stepsTitle: "How to get started",
    steps: [
      {
        title: "Choose the agent",
        text: "Browse the catalogue and open a page: what it does, which integrations it uses and what it costs.",
      },
      {
        title: "Connect your tools",
        text: "Gmail, Calendar, Shopify and the rest connect through secure sign-in, with no keys to copy.",
      },
      {
        title: "Delegate the work",
        text: "Tell the chat what you need and the agent executes, showing what it did and what needs your approval.",
      },
    ],
    highlightsTitle: "In short",
    relatedTitle: "Other capabilities",
    ctaTitle: "Find the right agent",
    ctaText:
      "The catalogue is public: you can read every page, with pricing and integrations, before activating.",
    ctaLabel: "Browse agents",
    ctaHref: "/agents",
  },
  integrations: {
    metaTitle: "Integrations in 2 clicks",
    metaDescription:
      "Connect Shopify, Gmail, Calendar, Slack and HubSpot to your AgentCloud agents: OAuth consent, encrypted tokens and no keys to paste.",
    badge: "Integrations",
    titleA: "Your tools",
    titleB: "connected in 2 clicks",
    subtitle:
      "Shopify, Gmail, Calendar, Slack, HubSpot and more: the agent works on your tools, with secure access and no keys to paste.",
    intro:
      "An agent is not much use if it stays locked in a chat. Integrations give it hands: it reads orders, books appointments, sends email and updates contacts. Connecting is a normal authorisation flow: you grant it once and revoke it whenever you want.",
    homeLink: "Back to home",
    benefitsTitle: "How they work",
    benefits: [
      {
        title: "Connected in 2 clicks",
        text: "No API keys to copy: you authorise at the provider and get back to work.",
      },
      {
        title: "Protected credentials",
        text: "Tokens stay encrypted and the agent only sees what the requested action needs.",
      },
      {
        title: "Status always visible",
        text: "In the dashboard you see which tools are connected and which need a new authorisation.",
      },
      {
        title: "A growing catalogue",
        text: "New integrations keep arriving; the ones not live yet are labelled as such.",
      },
    ],
    stepsTitle: "How connecting works",
    steps: [
      {
        title: "Pick the tool",
        text: "From the agent page or from the integrations section.",
      },
      {
        title: "Authorise",
        text: "The provider opens its own consent screen: no password is shared with us.",
      },
      {
        title: "Use it in chat",
        text: "From then on the agent can act on that tool whenever you ask.",
      },
    ],
    highlightsTitle: "In short",
    relatedTitle: "Other capabilities",
    ctaTitle: "See the full catalogue",
    ctaText:
      "Check which integrations are live and which are on the way, with the agent that uses them.",
    ctaLabel: "View integrations",
    ctaHref: "/integrations",
  },
  chat: {
    metaTitle: "A chat that actually executes",
    metaDescription:
      "The AgentCloud chat does not stop at answers: it finds products, builds cart links, books appointments, sends email and generates files, with your approval.",
    badge: "Chat",
    titleA: "A chat that",
    titleB: "actually executes",
    subtitle:
      "Not just answers: the agent finds products, builds cart links, books appointments, sends email and generates files.",
    intro:
      "The chat is the control room. Write what you need in plain language: the agent plans the steps, uses the connected tools and shows you the result. The most sensitive actions only start after your confirmation.",
    homeLink: "Back to home",
    benefitsTitle: "What changes versus a chatbot",
    benefits: [
      {
        title: "Real actions",
        text: "Cart, orders, email, calendar and generated files: it does not stop at text.",
      },
      {
        title: "Attachments and voice",
        text: "Attach images or files, or dictate, and read everything back before sending.",
      },
      {
        title: "Ready-made output",
        text: "Previews of generated documents and files, ready to download when you need them.",
      },
      {
        title: "Human confirmations",
        text: "Sensitive operations start only after your explicit approval.",
      },
    ],
    stepsTitle: "How to use it",
    steps: [
      {
        title: "Describe the goal",
        text: "In plain language, the way you would explain it to a colleague.",
      },
      {
        title: "The agent plans",
        text: "It splits the work into steps and uses the integrations at its disposal.",
      },
      {
        title: "You check and approve",
        text: "See what it did, adjust the direction and approve the actions that need it.",
      },
    ],
    highlightsTitle: "In short",
    relatedTitle: "Other capabilities",
    ctaTitle: "Try the chat",
    ctaText:
      "You get 5 free messages a day in total across all agents: enough to see how it works.",
    ctaLabel: "Open the chat",
    ctaHref: "/chat",
  },
  dashboard: {
    metaTitle: "Dashboard, reports and exports",
    metaDescription:
      "The AgentCloud dashboard: agent activity, monthly usage, integration status and subscriptions, with report exports in PDF and Excel.",
    badge: "Dashboard",
    titleA: "Everything under control",
    titleB: "on one screen",
    subtitle:
      "Active agents, completed work, usage and subscriptions: the dashboard gathers what you need to decide.",
    intro:
      "When agents work, you need somewhere to look: what they did, what they consumed and what is connected. This is also where you manage subscriptions and download reports in PDF and Excel.",
    homeLink: "Back to home",
    benefitsTitle: "What you find there",
    benefits: [
      {
        title: "History and activity",
        text: "For each agent, see what it executed and when, without digging through conversations.",
      },
      {
        title: "Exportable reports",
        text: "Export the data to PDF and Excel to share it or keep it on file.",
      },
      {
        title: "Usage and limits",
        text: "Monthly usage and plan allowance always visible, with a warning before you hit the limits.",
      },
      {
        title: "Subscriptions in one place",
        text: "Activate, pause or cancel individual agents from the same screen.",
      },
    ],
    stepsTitle: "The three sections",
    steps: [
      {
        title: "Overview",
        text: "Active agents, recent activity and the status of your connections.",
      },
      {
        title: "Reports",
        text: "Usage and results over time, with PDF and Excel exports.",
      },
      {
        title: "Subscriptions",
        text: "Active plans, renewals and payment method, with access to the billing portal.",
      },
    ],
    highlightsTitle: "In short",
    relatedTitle: "Other capabilities",
    ctaTitle: "Open the dashboard",
    ctaText:
      "If you do not have an account yet, you can create one and activate your first agent in a few minutes.",
    ctaLabel: "Go to the dashboard",
    ctaHref: "/dashboard",
  },
};

// ─── Español ─────────────────────────────────────────────────────────────────

const es: Record<FeatureSlug, FeatureDetailContent> = {
  agents: {
    metaTitle: "Agentes de IA listos para usar",
    metaDescription:
      "Agentes de IA ya configurados para e-commerce, leads, soporte y marketing: precios claros, integraciones incluidas y prueba gratuita de 5 mensajes al día.",
    badge: "Agentes",
    titleA: "Agentes de IA",
    titleB: "listos para usar",
    subtitle:
      "No son modelos genéricos que haya que entrenar: agentes ya configurados para un oficio, con integraciones, precios claros y activación el mismo día.",
    intro:
      "El catálogo reúne agentes especializados — e-commerce, captación de leads, soporte, marketing y datos — y cada ficha dice qué sabe hacer, qué herramientas usa y cuánto cuesta al mes. Elige, activa y empieza: no hay ninguna infraestructura que configurar.",
    homeLink: "Volver al inicio",
    benefitsTitle: "Por qué funciona así",
    benefits: [
      {
        title: "Precios transparentes",
        text: "Cada ficha muestra el coste mensual, la categoría y casos de uso reales antes de que actives nada.",
      },
      {
        title: "Activación el mismo día",
        text: "Elige el agente, conecta tus herramientas y empieza: no hay una fase de configuración que gestionar.",
      },
      {
        title: "Prueba gratis cada día",
        text: "5 mensajes al día en total entre todos los agentes, sin tarjeta de crédito.",
      },
      {
        title: "Solo lo que necesitas",
        text: "La suscripción es por agente: activas los que usas y cancelas cuando quieras.",
      },
    ],
    stepsTitle: "Cómo empezar",
    steps: [
      {
        title: "Elige el agente",
        text: "Explora el catálogo y abre la ficha: qué hace, qué integraciones usa y cuánto cuesta.",
      },
      {
        title: "Conecta tus herramientas",
        text: "Gmail, Calendar, Shopify y las demás se conectan con acceso seguro, sin claves que copiar.",
      },
      {
        title: "Delega el trabajo",
        text: "Escribe en el chat qué necesitas y el agente ejecuta, mostrando qué ha hecho y qué requiere tu aprobación.",
      },
    ],
    highlightsTitle: "En resumen",
    relatedTitle: "Otras capacidades",
    ctaTitle: "Encuentra el agente adecuado",
    ctaText:
      "El catálogo es público: puedes leer cada ficha, con precios e integraciones, antes de activar.",
    ctaLabel: "Ver los agentes",
    ctaHref: "/agents",
  },
  integrations: {
    metaTitle: "Integraciones en 2 clics",
    metaDescription:
      "Conecta Shopify, Gmail, Calendar, Slack y HubSpot con tus agentes de AgentCloud: autorización OAuth, tokens cifrados y ninguna clave que pegar.",
    badge: "Integraciones",
    titleA: "Tus herramientas",
    titleB: "conectadas en 2 clics",
    subtitle:
      "Shopify, Gmail, Calendar, Slack, HubSpot y más: el agente trabaja en tus herramientas, con acceso seguro y sin claves que pegar.",
    intro:
      "Un agente sirve de poco si se queda encerrado en un chat. Las integraciones le dan manos: lee pedidos, reserva citas, envía correos y actualiza contactos. Conectar es un flujo normal de autorización: lo concedes una vez y lo revocas cuando quieras.",
    homeLink: "Volver al inicio",
    benefitsTitle: "Cómo están hechas",
    benefits: [
      {
        title: "Conectadas en 2 clics",
        text: "Ninguna clave API que copiar: autorizas en el proveedor y vuelves al trabajo.",
      },
      {
        title: "Credenciales protegidas",
        text: "Los tokens permanecen cifrados y el agente solo ve lo que necesita la acción solicitada.",
      },
      {
        title: "Estado siempre visible",
        text: "En el panel ves qué herramientas están conectadas y cuáles piden una nueva autorización.",
      },
      {
        title: "Catálogo en crecimiento",
        text: "Llegan integraciones nuevas continuamente; las que aún no están activas se etiquetan como tal.",
      },
    ],
    stepsTitle: "Cómo funciona la conexión",
    steps: [
      {
        title: "Elige la herramienta",
        text: "Desde la ficha del agente o desde la sección de integraciones.",
      },
      {
        title: "Autoriza",
        text: "El proveedor abre su propia pantalla de consentimiento: ninguna contraseña se comparte con nosotros.",
      },
      {
        title: "Úsala en el chat",
        text: "Desde ese momento el agente puede actuar sobre la herramienta cuando se lo pidas.",
      },
    ],
    highlightsTitle: "En resumen",
    relatedTitle: "Otras capacidades",
    ctaTitle: "Mira el catálogo completo",
    ctaText:
      "Consulta qué integraciones ya están activas y cuáles están por llegar, con el agente que las usa.",
    ctaLabel: "Ver las integraciones",
    ctaHref: "/integrations",
  },
  chat: {
    metaTitle: "Un chat que ejecuta de verdad",
    metaDescription:
      "El chat de AgentCloud no se queda en respuestas: busca productos, crea enlaces al carrito, reserva citas, envía correos y genera archivos, con tu aprobación.",
    badge: "Chat",
    titleA: "Un chat que",
    titleB: "ejecuta de verdad",
    subtitle:
      "No solo respuestas: el agente busca productos, crea enlaces al carrito, reserva citas, envía correos y genera archivos.",
    intro:
      "El chat es el centro de mando. Escribe lo que necesitas en lenguaje natural: el agente planifica los pasos, usa las integraciones conectadas y te muestra el resultado. Las acciones más delicadas solo empiezan con tu confirmación.",
    homeLink: "Volver al inicio",
    benefitsTitle: "Qué cambia frente a un chatbot",
    benefits: [
      {
        title: "Acciones reales",
        text: "Carrito, pedidos, correo, calendario y archivos generados: no se queda en el texto.",
      },
      {
        title: "Adjuntos y voz",
        text: "Adjunta imágenes o archivos, o dicta, y revisa todo antes de enviar.",
      },
      {
        title: "Resultados listos",
        text: "Vistas previas de documentos y archivos generados, descargables cuando los necesites.",
      },
      {
        title: "Confirmaciones humanas",
        text: "Las operaciones delicadas solo empiezan tras tu aprobación explícita.",
      },
    ],
    stepsTitle: "Cómo se usa",
    steps: [
      {
        title: "Describe el objetivo",
        text: "En lenguaje natural, como se lo explicarías a un colega.",
      },
      {
        title: "El agente planifica",
        text: "Divide el trabajo en pasos y usa las integraciones de las que dispone.",
      },
      {
        title: "Revisas y apruebas",
        text: "Ves qué ha hecho, corriges el rumbo y apruebas las acciones que lo necesitan.",
      },
    ],
    highlightsTitle: "En resumen",
    relatedTitle: "Otras capacidades",
    ctaTitle: "Prueba el chat",
    ctaText:
      "Tienes 5 mensajes gratis al día en total entre todos los agentes: suficiente para ver cómo trabaja.",
    ctaLabel: "Abrir el chat",
    ctaHref: "/chat",
  },
  dashboard: {
    metaTitle: "Panel, informes y exportaciones",
    metaDescription:
      "El panel de AgentCloud: actividad de los agentes, uso mensual, estado de las integraciones y suscripciones, con exportación de informes en PDF y Excel.",
    badge: "Panel",
    titleA: "Todo bajo control",
    titleB: "en una pantalla",
    subtitle:
      "Agentes activos, actividad realizada, consumo y suscripciones: el panel reúne lo que necesitas para decidir.",
    intro:
      "Cuando los agentes trabajan, hace falta un lugar donde mirar: qué han hecho, cuánto han consumido y qué está conectado. Desde aquí gestionas también las suscripciones y descargas los informes en PDF y Excel.",
    homeLink: "Volver al inicio",
    benefitsTitle: "Qué encuentras dentro",
    benefits: [
      {
        title: "Historial y actividad",
        text: "Para cada agente ves qué ha ejecutado y cuándo, sin rebuscar en las conversaciones.",
      },
      {
        title: "Informes exportables",
        text: "Exportas los datos en PDF y Excel para compartirlos o archivarlos.",
      },
      {
        title: "Consumo y límites",
        text: "Uso mensual y límite del plan siempre visibles, con aviso antes de llegar al tope.",
      },
      {
        title: "Suscripciones en un lugar",
        text: "Activas, pausas o cancelas agentes concretos desde la misma pantalla.",
      },
    ],
    stepsTitle: "Las tres secciones",
    steps: [
      {
        title: "Resumen",
        text: "Agentes activos, actividad reciente y estado de las conexiones.",
      },
      {
        title: "Informes",
        text: "Series temporales de uso y resultados, con exportación en PDF y Excel.",
      },
      {
        title: "Suscripciones",
        text: "Planes activos, renovaciones y método de pago, con acceso al portal de facturación.",
      },
    ],
    highlightsTitle: "En resumen",
    relatedTitle: "Otras capacidades",
    ctaTitle: "Abrir el panel",
    ctaText:
      "Si aún no tienes cuenta, puedes crear una y activar tu primer agente en pocos minutos.",
    ctaLabel: "Ir al panel",
    ctaHref: "/dashboard",
  },
};

// ─── Deutsch ─────────────────────────────────────────────────────────────────

const de: Record<FeatureSlug, FeatureDetailContent> = {
  agents: {
    metaTitle: "Sofort einsatzbereite KI-Agenten",
    metaDescription:
      "KI-Agenten, bereits eingerichtet für E-Commerce, Leads, Support und Marketing: klare Preise, enthaltene Integrationen und eine kostenlose Testphase mit 5 Nachrichten pro Tag.",
    badge: "Agenten",
    titleA: "KI-Agenten",
    titleB: "sofort einsatzbereit",
    subtitle:
      "Keine generischen Modelle zum Trainieren: Agenten, die für eine Aufgabe eingerichtet sind – mit Integrationen, klaren Preisen und Freischaltung am selben Tag.",
    intro:
      "Der Katalog versammelt spezialisierte Agenten – E-Commerce, Leadgewinnung, Support, Marketing und Daten – und jede Seite sagt, was er kann, welche Tools er nutzt und was er pro Monat kostet. Auswählen, aktivieren, loslegen: es gibt keine Infrastruktur einzurichten.",
    homeLink: "Zurück zur Startseite",
    benefitsTitle: "Warum das so funktioniert",
    benefits: [
      {
        title: "Transparente Preise",
        text: "Jede Seite zeigt monatliche Kosten, Kategorie und echte Anwendungsfälle, bevor du etwas aktivierst.",
      },
      {
        title: "Freischaltung am selben Tag",
        text: "Agenten wählen, Tools verbinden und starten: es gibt keine Setup-Phase zu verwalten.",
      },
      {
        title: "Täglich kostenlos testen",
        text: "Insgesamt 5 Nachrichten pro Tag über alle Agenten hinweg, ohne Kreditkarte.",
      },
      {
        title: "Nur was du brauchst",
        text: "Das Abo gilt je Agent: aktiviere die, die du nutzt, und kündige jederzeit.",
      },
    ],
    stepsTitle: "So startest du",
    steps: [
      {
        title: "Agenten auswählen",
        text: "Katalog durchsehen und eine Seite öffnen: was er kann, welche Integrationen er nutzt und was er kostet.",
      },
      {
        title: "Tools verbinden",
        text: "Gmail, Calendar, Shopify und die übrigen verbinden sich über sichere Anmeldung – ohne Schlüssel zum Kopieren.",
      },
      {
        title: "Arbeit abgeben",
        text: "Schreibe im Chat, was du brauchst: der Agent führt es aus und zeigt, was er getan hat und was deine Freigabe braucht.",
      },
    ],
    highlightsTitle: "Kurz gesagt",
    relatedTitle: "Weitere Funktionen",
    ctaTitle: "Finde den passenden Agenten",
    ctaText:
      "Der Katalog ist öffentlich: du kannst jede Seite mit Preisen und Integrationen vor der Aktivierung lesen.",
    ctaLabel: "Agenten ansehen",
    ctaHref: "/agents",
  },
  integrations: {
    metaTitle: "Integrationen in 2 Klicks",
    metaDescription:
      "Verbinde Shopify, Gmail, Calendar, Slack und HubSpot mit deinen AgentCloud-Agenten: OAuth-Freigabe, verschlüsselte Token und keine Schlüssel zum Einfügen.",
    badge: "Integrationen",
    titleA: "Deine Tools",
    titleB: "in 2 Klicks verbunden",
    subtitle:
      "Shopify, Gmail, Calendar, Slack, HubSpot und mehr: der Agent arbeitet in deinen Tools – mit sicherem Zugriff und ohne Schlüssel zum Einfügen.",
    intro:
      "Ein Agent nützt wenig, wenn er im Chat eingesperrt bleibt. Integrationen geben ihm Hände: Er liest Bestellungen, bucht Termine, versendet E-Mails und aktualisiert Kontakte. Das Verbinden ist ein normaler Freigabefluss: einmal erlauben, jederzeit widerrufen.",
    homeLink: "Zurück zur Startseite",
    benefitsTitle: "Wie sie aufgebaut sind",
    benefits: [
      {
        title: "In 2 Klicks verbunden",
        text: "Keine API-Schlüssel zum Kopieren: du gibst beim Anbieter frei und arbeitest weiter.",
      },
      {
        title: "Geschützte Zugangsdaten",
        text: "Token bleiben verschlüsselt und der Agent sieht nur, was die angeforderte Aktion braucht.",
      },
      {
        title: "Status immer sichtbar",
        text: "Im Dashboard siehst du, welche Tools verbunden sind und welche eine neue Freigabe brauchen.",
      },
      {
        title: "Wachsender Katalog",
        text: "Laufend kommen neue Integrationen dazu; noch nicht aktive sind entsprechend gekennzeichnet.",
      },
    ],
    stepsTitle: "So funktioniert das Verbinden",
    steps: [
      {
        title: "Tool auswählen",
        text: "Auf der Agenten-Seite oder im Bereich Integrationen.",
      },
      {
        title: "Freigeben",
        text: "Der Anbieter öffnet seine eigene Zustimmungsseite: kein Passwort wird mit uns geteilt.",
      },
      {
        title: "Im Chat nutzen",
        text: "Ab dann kann der Agent auf dieses Tool zugreifen, wenn du es verlangst.",
      },
    ],
    highlightsTitle: "Kurz gesagt",
    relatedTitle: "Weitere Funktionen",
    ctaTitle: "Den vollständigen Katalog ansehen",
    ctaText:
      "Sieh nach, welche Integrationen schon aktiv sind und welche kommen – samt dem Agenten, der sie nutzt.",
    ctaLabel: "Integrationen ansehen",
    ctaHref: "/integrations",
  },
  chat: {
    metaTitle: "Ein Chat, der wirklich ausführt",
    metaDescription:
      "Der AgentCloud-Chat bleibt nicht bei Antworten stehen: Er findet Produkte, erstellt Warenkorb-Links, bucht Termine, versendet E-Mails und erzeugt Dateien – mit deiner Freigabe.",
    badge: "Chat",
    titleA: "Ein Chat, der",
    titleB: "wirklich ausführt",
    subtitle:
      "Nicht nur Antworten: Der Agent findet Produkte, erstellt Warenkorb-Links, bucht Termine, versendet E-Mails und erzeugt Dateien.",
    intro:
      "Der Chat ist der Kommandostand. Schreibe in normaler Sprache, was du brauchst: Der Agent plant die Schritte, nutzt die verbundenen Integrationen und zeigt dir das Ergebnis. Heikle Aktionen starten erst nach deiner Bestätigung.",
    homeLink: "Zurück zur Startseite",
    benefitsTitle: "Was sich gegenüber einem Chatbot ändert",
    benefits: [
      {
        title: "Echte Aktionen",
        text: "Warenkorb, Bestellungen, E-Mail, Kalender und erzeugte Dateien: Es bleibt nicht beim Text.",
      },
      {
        title: "Anhänge und Stimme",
        text: "Bilder oder Dateien anhängen oder diktieren und alles vor dem Senden noch einmal lesen.",
      },
      {
        title: "Fertige Ergebnisse",
        text: "Vorschauen erzeugter Dokumente und Dateien, herunterladbar, wenn du sie brauchst.",
      },
      {
        title: "Menschliche Bestätigung",
        text: "Empfindliche Vorgänge starten erst nach deiner ausdrücklichen Freigabe.",
      },
    ],
    stepsTitle: "So nutzt du sie",
    steps: [
      {
        title: "Ziel beschreiben",
        text: "In normaler Sprache, so wie du es einer Kollegin erklären würdest.",
      },
      {
        title: "Der Agent plant",
        text: "Er teilt die Arbeit in Schritte und nutzt die verfügbaren Integrationen.",
      },
      {
        title: "Du prüfst und gibst frei",
        text: "Sieh, was er getan hat, korrigiere die Richtung und gib die nötigen Aktionen frei.",
      },
    ],
    highlightsTitle: "Kurz gesagt",
    relatedTitle: "Weitere Funktionen",
    ctaTitle: "Chat ausprobieren",
    ctaText:
      "Du hast insgesamt 5 kostenlose Nachrichten pro Tag über alle Agenten: genug, um zu sehen, wie er arbeitet.",
    ctaLabel: "Chat öffnen",
    ctaHref: "/chat",
  },
  dashboard: {
    metaTitle: "Dashboard, Berichte und Exporte",
    metaDescription:
      "Das AgentCloud-Dashboard: Aktivität der Agenten, monatliche Nutzung, Status der Integrationen und Abos, mit Berichtsexport als PDF und Excel.",
    badge: "Dashboard",
    titleA: "Alles im Blick",
    titleB: "auf einem Bildschirm",
    subtitle:
      "Aktive Agenten, erledigte Arbeit, Verbrauch und Abos: Das Dashboard sammelt, was du für Entscheidungen brauchst.",
    intro:
      "Wenn Agenten arbeiten, braucht es einen Ort zum Nachsehen: was sie getan haben, wie viel sie verbraucht haben und was verbunden ist. Hier verwaltest du auch Abos und lädst Berichte als PDF und Excel herunter.",
    homeLink: "Zurück zur Startseite",
    benefitsTitle: "Was du dort findest",
    benefits: [
      {
        title: "Verlauf und Aktivität",
        text: "Für jeden Agenten siehst du, was er wann ausgeführt hat – ohne in Gesprächen zu suchen.",
      },
      {
        title: "Exportierbare Berichte",
        text: "Exportiere die Daten als PDF und Excel, um sie zu teilen oder abzulegen.",
      },
      {
        title: "Verbrauch und Limits",
        text: "Monatliche Nutzung und Plan-Kontingent immer sichtbar, mit Hinweis vor dem Limit.",
      },
      {
        title: "Abos an einem Ort",
        text: "Einzelne Agenten auf demselben Bildschirm aktivieren, pausieren oder kündigen.",
      },
    ],
    stepsTitle: "Die drei Bereiche",
    steps: [
      {
        title: "Überblick",
        text: "Aktive Agenten, letzte Aktivitäten und Status der Verbindungen.",
      },
      {
        title: "Berichte",
        text: "Zeitreihen zu Nutzung und Ergebnissen, mit Export als PDF und Excel.",
      },
      {
        title: "Abos",
        text: "Aktive Pläne, Verlängerungen und Zahlungsmethode, mit Zugang zum Abrechnungsportal.",
      },
    ],
    highlightsTitle: "Kurz gesagt",
    relatedTitle: "Weitere Funktionen",
    ctaTitle: "Dashboard öffnen",
    ctaText:
      "Falls du noch kein Konto hast, kannst du eines anlegen und den ersten Agenten in wenigen Minuten aktivieren.",
    ctaLabel: "Zum Dashboard",
    ctaHref: "/dashboard",
  },
};

// ─── Français ────────────────────────────────────────────────────────────────

const fr: Record<FeatureSlug, FeatureDetailContent> = {
  agents: {
    metaTitle: "Agents IA prêts à l'emploi",
    metaDescription:
      "Des agents IA déjà configurés pour l'e-commerce, les leads, le support et le marketing : prix clairs, intégrations incluses et essai gratuit de 5 messages par jour.",
    badge: "Agents",
    titleA: "Des agents IA",
    titleB: "prêts à l'emploi",
    subtitle:
      "Pas des modèles génériques à entraîner : des agents déjà configurés pour un métier, avec intégrations, prix clairs et activation le jour même.",
    intro:
      "Le catalogue réunit des agents spécialisés — e-commerce, acquisition de leads, support, marketing et données — et chaque fiche indique ce qu'il sait faire, quels outils il utilise et son coût mensuel. Choisissez, activez et commencez : il n'y a aucune infrastructure à configurer.",
    homeLink: "Retour à l'accueil",
    benefitsTitle: "Pourquoi ça fonctionne ainsi",
    benefits: [
      {
        title: "Prix transparents",
        text: "Chaque fiche montre le coût mensuel, la catégorie et des cas d'usage réels avant toute activation.",
      },
      {
        title: "Activation le jour même",
        text: "Choisissez l'agent, connectez vos outils et commencez : aucune phase d'installation à gérer.",
      },
      {
        title: "Essai gratuit chaque jour",
        text: "5 messages par jour au total sur tous les agents, sans carte bancaire.",
      },
      {
        title: "Uniquement ce qu'il vous faut",
        text: "L'abonnement est par agent : activez ceux que vous utilisez et résiliez quand vous voulez.",
      },
    ],
    stepsTitle: "Comment démarrer",
    steps: [
      {
        title: "Choisissez l'agent",
        text: "Parcourez le catalogue et ouvrez une fiche : ce qu'il fait, ses intégrations et son prix.",
      },
      {
        title: "Connectez vos outils",
        text: "Gmail, Calendar, Shopify et les autres se connectent par une autorisation sécurisée, sans clé à copier.",
      },
      {
        title: "Déléguez le travail",
        text: "Écrivez dans le chat ce dont vous avez besoin : l'agent exécute et montre ce qu'il a fait et ce qui attend votre validation.",
      },
    ],
    highlightsTitle: "En bref",
    relatedTitle: "Autres capacités",
    ctaTitle: "Trouvez le bon agent",
    ctaText:
      "Le catalogue est public : vous pouvez lire chaque fiche, avec prix et intégrations, avant d'activer.",
    ctaLabel: "Voir les agents",
    ctaHref: "/agents",
  },
  integrations: {
    metaTitle: "Intégrations en 2 clics",
    metaDescription:
      "Connectez Shopify, Gmail, Calendar, Slack et HubSpot à vos agents AgentCloud : autorisation OAuth, jetons chiffrés et aucune clé à coller.",
    badge: "Intégrations",
    titleA: "Vos outils",
    titleB: "connectés en 2 clics",
    subtitle:
      "Shopify, Gmail, Calendar, Slack, HubSpot et d'autres : l'agent travaille sur vos outils, avec un accès sécurisé et sans clé à coller.",
    intro:
      "Un agent sert à peu de chose s'il reste enfermé dans un chat. Les intégrations lui donnent des mains : il lit les commandes, réserve des rendez-vous, envoie des e-mails et met à jour les contacts. La connexion est un flux d'autorisation classique : vous l'accordez une fois et la révoquez quand vous voulez.",
    homeLink: "Retour à l'accueil",
    benefitsTitle: "Comment elles sont faites",
    benefits: [
      {
        title: "Connectées en 2 clics",
        text: "Aucune clé API à copier : vous autorisez chez le fournisseur et reprenez votre travail.",
      },
      {
        title: "Identifiants protégés",
        text: "Les jetons restent chiffrés et l'agent ne voit que ce que l'action demandée nécessite.",
      },
      {
        title: "État toujours visible",
        text: "Dans le tableau de bord, vous voyez quels outils sont connectés et lesquels demandent une nouvelle autorisation.",
      },
      {
        title: "Catalogue en croissance",
        text: "De nouvelles intégrations arrivent en continu ; celles qui ne sont pas actives sont signalées comme telles.",
      },
    ],
    stepsTitle: "Comment se passe la connexion",
    steps: [
      {
        title: "Choisissez l'outil",
        text: "Depuis la fiche de l'agent ou la section intégrations.",
      },
      {
        title: "Autorisez",
        text: "Le fournisseur ouvre son propre écran de consentement : aucun mot de passe ne nous est transmis.",
      },
      {
        title: "Utilisez-le dans le chat",
        text: "À partir de là, l'agent peut agir sur cet outil quand vous le demandez.",
      },
    ],
    highlightsTitle: "En bref",
    relatedTitle: "Autres capacités",
    ctaTitle: "Voir le catalogue complet",
    ctaText:
      "Vérifiez quelles intégrations sont déjà actives et lesquelles arrivent, avec l'agent qui les utilise.",
    ctaLabel: "Voir les intégrations",
    ctaHref: "/integrations",
  },
  chat: {
    metaTitle: "Un chat qui exécute vraiment",
    metaDescription:
      "Le chat AgentCloud ne s'arrête pas aux réponses : il cherche des produits, crée des liens panier, réserve des rendez-vous, envoie des e-mails et génère des fichiers, avec votre validation.",
    badge: "Chat",
    titleA: "Un chat qui",
    titleB: "exécute vraiment",
    subtitle:
      "Pas seulement des réponses : l'agent cherche des produits, crée des liens panier, réserve des rendez-vous, envoie des e-mails et génère des fichiers.",
    intro:
      "Le chat est le poste de commande. Écrivez ce dont vous avez besoin en langage naturel : l'agent planifie les étapes, utilise les intégrations connectées et vous montre le résultat. Les actions les plus sensibles ne démarrent qu'après votre confirmation.",
    homeLink: "Retour à l'accueil",
    benefitsTitle: "Ce qui change par rapport à un chatbot",
    benefits: [
      {
        title: "Des actions réelles",
        text: "Panier, commandes, e-mail, calendrier et fichiers générés : il ne s'arrête pas au texte.",
      },
      {
        title: "Pièces jointes et voix",
        text: "Joignez des images ou des fichiers, ou dictez, et relisez tout avant d'envoyer.",
      },
      {
        title: "Des livrables prêts",
        text: "Aperçus des documents et fichiers générés, téléchargeables quand vous en avez besoin.",
      },
      {
        title: "Validation humaine",
        text: "Les opérations sensibles ne démarrent qu'après votre approbation explicite.",
      },
    ],
    stepsTitle: "Comment l'utiliser",
    steps: [
      {
        title: "Décrivez l'objectif",
        text: "En langage naturel, comme vous l'expliqueriez à un collègue.",
      },
      {
        title: "L'agent planifie",
        text: "Il découpe le travail en étapes et utilise les intégrations dont il dispose.",
      },
      {
        title: "Vous vérifiez et validez",
        text: "Voyez ce qu'il a fait, corrigez le tir et validez les actions qui le demandent.",
      },
    ],
    highlightsTitle: "En bref",
    relatedTitle: "Autres capacités",
    ctaTitle: "Essayez le chat",
    ctaText:
      "Vous avez 5 messages gratuits par jour au total sur tous les agents : de quoi voir comment il travaille.",
    ctaLabel: "Ouvrir le chat",
    ctaHref: "/chat",
  },
  dashboard: {
    metaTitle: "Tableau de bord, rapports et exports",
    metaDescription:
      "Le tableau de bord AgentCloud : activité des agents, usage mensuel, état des intégrations et abonnements, avec export des rapports en PDF et Excel.",
    badge: "Tableau de bord",
    titleA: "Tout sous contrôle",
    titleB: "sur un seul écran",
    subtitle:
      "Agents actifs, travail réalisé, consommation et abonnements : le tableau de bord réunit ce qu'il faut pour décider.",
    intro:
      "Quand les agents travaillent, il faut un endroit où regarder : ce qu'ils ont fait, ce qu'ils ont consommé et ce qui est connecté. C'est aussi là que vous gérez les abonnements et téléchargez les rapports en PDF et Excel.",
    homeLink: "Retour à l'accueil",
    benefitsTitle: "Ce que vous y trouvez",
    benefits: [
      {
        title: "Historique et activité",
        text: "Pour chaque agent, ce qu'il a exécuté et quand, sans fouiller dans les conversations.",
      },
      {
        title: "Rapports exportables",
        text: "Exportez les données en PDF et Excel pour les partager ou les archiver.",
      },
      {
        title: "Consommation et limites",
        text: "Usage mensuel et quota du forfait toujours visibles, avec une alerte avant la limite.",
      },
      {
        title: "Abonnements au même endroit",
        text: "Activez, mettez en pause ou résiliez chaque agent depuis le même écran.",
      },
    ],
    stepsTitle: "Les trois sections",
    steps: [
      {
        title: "Vue d'ensemble",
        text: "Agents actifs, activité récente et état des connexions.",
      },
      {
        title: "Rapports",
        text: "Séries temporelles d'usage et de résultats, avec export en PDF et Excel.",
      },
      {
        title: "Abonnements",
        text: "Forfaits actifs, renouvellements et moyen de paiement, avec accès au portail de facturation.",
      },
    ],
    highlightsTitle: "En bref",
    relatedTitle: "Autres capacités",
    ctaTitle: "Ouvrir le tableau de bord",
    ctaText:
      "Si vous n'avez pas encore de compte, vous pouvez en créer un et activer votre premier agent en quelques minutes.",
    ctaLabel: "Aller au tableau de bord",
    ctaHref: "/dashboard",
  },
};

const CONTENT: Record<Locale, Record<FeatureSlug, FeatureDetailContent>> = {
  it,
  en,
  es,
  de,
  fr,
};

export function getFeatureDetail(
  locale: Locale,
  slug: FeatureSlug,
): FeatureDetailContent {
  return CONTENT[locale][slug];
}
