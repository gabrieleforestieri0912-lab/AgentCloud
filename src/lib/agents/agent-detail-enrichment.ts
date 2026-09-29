/**
 * Contenuti arricchiti per la pagina dettaglio agente — marketplace pro.
 *
 * Fornisce KPI, demo transcript, capability cards, security bullets e
 * testimonianze per rendere la scheda densa e professionale senza
 * chiamate esterne.
 *
 * Perché le stringhe sono in tabelle per locale e non inline: la versione
 * precedente usava `T(locale, "it", "en")` e `locale === "it" ? [...] : [...]`,
 * quindi es/de/fr ricevevano silenziosamente il testo inglese mentre la
 * pagina mostrava il resto in italiano/castellano/tedesco/francese. Qui ogni
 * blocco è un `Record<Locale, …>`: se una lingua manca, il typecheck fallisce
 * invece di degradare a metà pagina.
 *
 * I valori numerici sono indicativi / medi e segnati come stime;
 * non sono claim certificati — servono a riempire la pagina con
 * metriche plausibili e confrontabili.
 */
import type { Locale } from "@/lib/i18n/constants";
import type { Agent } from "@/lib/agents";

export type KPI = { value: string; label: string; sub: string };
export type TranscriptTurn = { role: "user" | "agent"; text: string; meta?: string };
export type Testimonial = { quote: string; author: string; role: string; company: string };
export type Capability = { title: string; desc: string; tools: string[] };

type Enrichment = {
  kpis: KPI[];
  transcript: TranscriptTurn[];
  testimonial: Testimonial;
  capabilities: Capability[];
  security: string[];
};

/** Etichette brevi dei KPI: un solo punto di traduzione per tutte le lingue. */
type KpiLabels = {
  avgResponse: string;
  catalogSearch: string;
  assistedSales: string;
  chatToCart: string;
  cartConversion: string;
  estOnCarts: string;
  uptime: string;
  edgeInfra: string;
  coverage: string;
  kbEscalation: string;
  firstReply: string;
  avgSimpleTickets: string;
  autoResolved: string;
  withoutHuman: string;
  csat: string;
  estSatisfaction: string;
  leadCapture: string;
  fromFormChat: string;
  enrichment: string;
  companyRole: string;
  slackAlert: string;
  salesNotified: string;
  consentTracked: string;
  optInLog: string;
  booking: string;
  proposalConfirm: string;
  overlaps: string;
  availabilityCheck: string;
  autoLinks: string;
  inviteVideo: string;
  reminders: string;
  popupEmail: string;
  dailyTriage: string;
  priorityFolders: string;
  draftReady: string;
  proposedReply: string;
  deadlinesTracked: string;
  untilClosed: string;
  eodDigest: string;
  dailyBriefing: string;
  competitors: string;
  serpIntent: string;
  structureReady: string;
  metaLength: string;
  citedSources: string;
  internalLinks: string;
  readability: string;
  scoreDensity: string;
  variants: string;
  perAssetAngle: string;
  testReady: string;
  winnerPicked: string;
  sources: string;
  competitorsShort: string;
  fileDelivery: string;
  fileChannel: string;
  execBriefing: string;
  prioritiesRisks: string;
  kpisRollup: string;
  salesCalendar: string;
  decisionMemo: string;
  optionsTradeoffs: string;
  nextActions: string;
  ownerDue: string;
  reconciliation: string;
  inOut: string;
  financeReminders: string;
  afterApproval: string;
  cashReport: string;
  monthly: string;
  dueAlerts: string;
  openInvoices: string;
  structuredQuote: string;
  subtotalVat: string;
  emailSend: string;
  resend: string;
  discounts: string;
  custom: string;
  pdfAttached: string;
  lineItems: string;
  reviewWatch: string;
  googleBusiness: string;
  sentiment: string;
  painPraise: string;
  draftReply: string;
  empatheticTone: string;
  publish: string;
  dailyAgenda: string;
  optimizedPriorities: string;
  focusBlock: string;
  deepWork: string;
  notesSummarized: string;
  meetingActions: string;
  autoFollowups: string;
  cvScreening: string;
  skillExtraction: string;
  fitScore: string;
  vsJd: string;
  candidateComms: string;
  feedbackUpdates: string;
  interviewBooked: string;
  calendar: string;
  postsWeek: string;
  editorialPlan: string;
  captionTags: string;
  perChannel: string;
  trendsResearched: string;
  currentHooks: string;
  formatAdapt: string;
  socialChannels: string;
  stock: string;
  warehouseVariants: string;
  lowStockAlert: string;
  criticalThreshold: string;
  reorderForecast: string;
  sellThrough: string;
  shipmentTrack: string;
  deliveryStatus: string;
  setup: string;
  zeroToLive: string;
  price: string;
  integrations: string;
  compliance: string;
  socAes: string;
  task1: string;
  task2: string;
  perMonth: string;
};

const KPI_LABELS: Record<Locale, KpiLabels> = {
  it: {
    avgResponse: "Risposta media", catalogSearch: "ricerca catalogo",
    assistedSales: "Vendite assistite", chatToCart: "chat → carrello",
    cartConversion: "Conversione carrello", estOnCarts: "stima su carrelli generati",
    uptime: "Uptime", edgeInfra: "infrastruttura Edge",
    coverage: "Copertura", kbEscalation: "KB + escalation",
    firstReply: "Prima risposta", avgSimpleTickets: "media su ticket semplici",
    autoResolved: "Risoluzione autonoma", withoutHuman: "senza umano",
    csat: "CSAT", estSatisfaction: "soddisfazione stimata",
    leadCapture: "Cattura lead", fromFormChat: "da form/chat",
    enrichment: "Arricchimento", companyRole: "dati azienda + ruolo",
    slackAlert: "Slack alert", salesNotified: "vendite notificate",
    consentTracked: "Consenso tracciato", optInLog: "opt-in log",
    booking: "Prenotazione", proposalConfirm: "proposta → conferma",
    overlaps: "Sovrapposizioni", availabilityCheck: "controllo disponibilità",
    autoLinks: "Link automatici", inviteVideo: "invito con video",
    reminders: "Promemoria", popupEmail: "popup + email",
    dailyTriage: "Triage giornaliero", priorityFolders: "priorità + cartelle",
    draftReady: "Bozza pronta", proposedReply: "risposta proposta",
    deadlinesTracked: "Scadenze tracciate", untilClosed: "follow-up fino a chiusura",
    eodDigest: "Digest finale", dailyBriefing: "briefing giornaliero",
    competitors: "Competitor analizzati", serpIntent: "SERP + intent",
    structureReady: "Struttura pronta", metaLength: "meta 150–160",
    citedSources: "Fonti citate", internalLinks: "link interni suggeriti",
    readability: "Readability", scoreDensity: "score + keyword density",
    variants: "Varianti", perAssetAngle: "per asset / angolo",
    testReady: "Pronto al test", winnerPicked: "vincitore consigliato",
    sources: "Citazioni", competitorsShort: "2–3 competitor",
    fileDelivery: "Consegna file", fileChannel: "copy-{channel}.md",
    execBriefing: "Briefing dirigenziale", prioritiesRisks: "priorità + rischi",
    kpisRollup: "KPI aggregati", salesCalendar: "vendite + calendario",
    decisionMemo: "Decision memo", optionsTradeoffs: "opzioni + trade-off",
    nextActions: "Azioni prioritarie", ownerDue: "owner + deadline",
    reconciliation: "Riconciliazione", inOut: "entrate/uscite",
    financeReminders: "Solleciti", afterApproval: "dopo approvazione",
    cashReport: "Report cassa", monthly: "mensile",
    dueAlerts: "Allerta scadenze", openInvoices: "fatture aperte",
    structuredQuote: "Preventivo strutturato", subtotalVat: "subtotale + IVA",
    emailSend: "Invio email", resend: "Resend",
    discounts: "Sconti", custom: "personalizzati",
    pdfAttached: "Allegato PDF", lineItems: "riepilogo voci",
    reviewWatch: "Monitoraggio recensioni", googleBusiness: "Google Business",
    sentiment: "Analisi sentiment", painPraise: "punti dolenti/complimenti",
    draftReply: "Bozza risposta", empatheticTone: "tono empatico",
    publish: "Pubblicazione",
    dailyAgenda: "Agenda giornaliera", optimizedPriorities: "priorità ottimizzate",
    focusBlock: "Blocco focus", deepWork: "deep work",
    notesSummarized: "Note riassunte", meetingActions: "meeting → azioni",
    autoFollowups: "follow-up automatici",
    cvScreening: "Screening CV", skillExtraction: "estrazione skill",
    fitScore: "Fit score", vsJd: "vs job description",
    candidateComms: "Comunicazione candidati", feedbackUpdates: "feedback + update",
    interviewBooked: "Colloquio fissato", calendar: "Calendar",
    postsWeek: "Post / settimana", editorialPlan: "piano editoriale",
    captionTags: "Caption + hashtag", perChannel: "per canale",
    trendsResearched: "Trend ricercati", currentHooks: "hook attuali",
    formatAdapt: "Adattamento formato", socialChannels: "IG / LI / TikTok",
    stock: "Giacenze", warehouseVariants: "magazzino + varianti",
    lowStockAlert: "Allerta sottoscorta", criticalThreshold: "soglia critica",
    reorderForecast: "Previsione riordino", sellThrough: "tasso vendite",
    shipmentTrack: "Tracking spedizioni", deliveryStatus: "stato consegna",
    setup: "Setup", zeroToLive: "da zero a operativo",
    price: "Canone", integrations: "Integrazioni",
    compliance: "Conformità", socAes: "SOC 2 · AES-256",
    task1: "Attività 1", task2: "Attività 2", perMonth: "/mese",
  },
  en: {
    avgResponse: "Avg. response", catalogSearch: "catalog search",
    assistedSales: "Assisted sales", chatToCart: "chat → cart",
    cartConversion: "Cart conversion", estOnCarts: "est. on generated carts",
    uptime: "Uptime", edgeInfra: "Edge infra",
    coverage: "Coverage", kbEscalation: "KB + escalation",
    firstReply: "First reply", avgSimpleTickets: "avg on simple tickets",
    autoResolved: "Auto-resolved", withoutHuman: "without human",
    csat: "CSAT", estSatisfaction: "est. satisfaction",
    leadCapture: "Lead capture", fromFormChat: "from form/chat",
    enrichment: "Enrichment", companyRole: "company + role",
    slackAlert: "Slack alert", salesNotified: "sales notified",
    consentTracked: "Consent tracked", optInLog: "opt-in log",
    booking: "Booking", proposalConfirm: "proposal → confirm",
    overlaps: "Overlaps", availabilityCheck: "availability check",
    autoLinks: "Auto links", inviteVideo: "invite w/ video",
    reminders: "Reminders", popupEmail: "popup + email",
    dailyTriage: "Daily triage", priorityFolders: "priority + folders",
    draftReady: "Draft ready", proposedReply: "proposed reply",
    deadlinesTracked: "Deadlines tracked", untilClosed: "until closed",
    eodDigest: "EOD digest", dailyBriefing: "daily briefing",
    competitors: "Competitors", serpIntent: "SERP + intent",
    structureReady: "Structure ready", metaLength: "meta 150–160",
    citedSources: "Cited sources", internalLinks: "internal links",
    readability: "Readability", scoreDensity: "score + density",
    variants: "Variants", perAssetAngle: "per asset / angle",
    testReady: "Test-ready", winnerPicked: "winner picked",
    sources: "Sources", competitorsShort: "2–3 competitors",
    fileDelivery: "File delivery", fileChannel: "copy-{channel}.md",
    execBriefing: "Exec briefing", prioritiesRisks: "priorities + risks",
    kpisRollup: "KPIs roll-up", salesCalendar: "sales + calendar",
    decisionMemo: "Decision memo", optionsTradeoffs: "options + trade-offs",
    nextActions: "Next actions", ownerDue: "owner + due",
    reconciliation: "Reconciliation", inOut: "in/out",
    financeReminders: "Reminders", afterApproval: "after approval",
    cashReport: "Cash report", monthly: "monthly",
    dueAlerts: "Due alerts", openInvoices: "open invoices",
    structuredQuote: "Structured quote", subtotalVat: "subtotal + VAT",
    emailSend: "Email send", resend: "Resend",
    discounts: "Discounts", custom: "custom",
    pdfAttached: "PDF attached", lineItems: "line items",
    reviewWatch: "Review watch", googleBusiness: "Google Business",
    sentiment: "Sentiment", painPraise: "pain/praise",
    draftReply: "Draft reply", empatheticTone: "empathetic tone",
    publish: "Publish",
    dailyAgenda: "Daily agenda", optimizedPriorities: "optimized priorities",
    focusBlock: "Focus block", deepWork: "deep work",
    notesSummarized: "Notes summarized", meetingActions: "meeting → actions",
    autoFollowups: "auto follow-ups",
    cvScreening: "CV screening", skillExtraction: "skill extraction",
    fitScore: "Fit score", vsJd: "vs JD",
    candidateComms: "Candidate comms", feedbackUpdates: "feedback + updates",
    interviewBooked: "Interview booked", calendar: "Calendar",
    postsWeek: "Posts / week", editorialPlan: "editorial plan",
    captionTags: "Caption + tags", perChannel: "per channel",
    trendsResearched: "Trends researched", currentHooks: "current hooks",
    formatAdapt: "Format adapt", socialChannels: "IG / LI / TikTok",
    stock: "Stock", warehouseVariants: "warehouse + variants",
    lowStockAlert: "Low-stock alert", criticalThreshold: "critical threshold",
    reorderForecast: "Reorder forecast", sellThrough: "sell-through",
    shipmentTrack: "Shipment track", deliveryStatus: "delivery status",
    setup: "Setup", zeroToLive: "zero to live",
    price: "Price", integrations: "Integrations",
    compliance: "Compliance", socAes: "SOC 2 · AES-256",
    task1: "Task 1", task2: "Task 2", perMonth: "/mo",
  },
  es: {
    avgResponse: "Respuesta media", catalogSearch: "búsqueda en catálogo",
    assistedSales: "Ventas asistidas", chatToCart: "chat → carrito",
    cartConversion: "Conversión de carrito", estOnCarts: "est. sobre carritos generados",
    uptime: "Uptime", edgeInfra: "infraestructura Edge",
    coverage: "Cobertura", kbEscalation: "KB + escalado",
    firstReply: "Primera respuesta", avgSimpleTickets: "media en tickets simples",
    autoResolved: "Resolución autónoma", withoutHuman: "sin intervención humana",
    csat: "CSAT", estSatisfaction: "satisfacción est.",
    leadCapture: "Captación de leads", fromFormChat: "desde formulario/chat",
    enrichment: "Enriquecimiento", companyRole: "empresa + cargo",
    slackAlert: "Aviso en Slack", salesNotified: "ventas avisadas",
    consentTracked: "Consentimiento registrado", optInLog: "log de opt-in",
    booking: "Reserva", proposalConfirm: "propuesta → confirmación",
    overlaps: "Solapamientos", availabilityCheck: "comprobación de disponibilidad",
    autoLinks: "Enlaces automáticos", inviteVideo: "invitación con vídeo",
    reminders: "Recordatorios", popupEmail: "popup + email",
    dailyTriage: "Clasificación diaria", priorityFolders: "prioridad + carpetas",
    draftReady: "Borrador listo", proposedReply: "respuesta propuesta",
    deadlinesTracked: "Plazos vigilados", untilClosed: "hasta el cierre",
    eodDigest: "Resumen de fin de día", dailyBriefing: "informe diario",
    competitors: "Competidores analizados", serpIntent: "SERP + intención",
    structureReady: "Estructura lista", metaLength: "meta 150–160",
    citedSources: "Fuentes citadas", internalLinks: "enlaces internos sugeridos",
    readability: "Legibilidad", scoreDensity: "puntuación + densidad",
    variants: "Variantes", perAssetAngle: "por pieza / ángulo",
    testReady: "Listo para test", winnerPicked: "ganador sugerido",
    sources: "Fuentes", competitorsShort: "2–3 competidores",
    fileDelivery: "Entrega de archivo", fileChannel: "copy-{channel}.md",
    execBriefing: "Informe a dirección", prioritiesRisks: "prioridades + riesgos",
    kpisRollup: "KPI agregados", salesCalendar: "ventas + calendario",
    decisionMemo: "Memo decisionale", optionsTradeoffs: "opciones + trade-offs",
    nextActions: "Próximas acciones", ownerDue: "responsable + plazo",
    reconciliation: "Conciliación", inOut: "entradas/salidas",
    financeReminders: "Recordatorios de pago", afterApproval: "tras la aprobación",
    cashReport: "Informe de caja", monthly: "mensual",
    dueAlerts: "Alertas de vencimientos", openInvoices: "facturas abiertas",
    structuredQuote: "Presupuesto estructurado", subtotalVat: "subtotal + IVA",
    emailSend: "Envío por email", resend: "Resend",
    discounts: "Descuentos", custom: "personalizados",
    pdfAttached: "PDF adjunta", lineItems: "desglose de partidas",
    reviewWatch: "Vigilancia de reseñas", googleBusiness: "Google Business",
    sentiment: "Análisis de sentimiento", painPraise: "quejas/elogios",
    draftReply: "Borrador de respuesta", empatheticTone: "tono empático",
    publish: "Publicación",
    dailyAgenda: "Agenda diaria", optimizedPriorities: "prioridades optimizadas",
    focusBlock: "Bloque de concentración", deepWork: "trabajo profundo",
    notesSummarized: "Notas resumidas", meetingActions: "reunión → acciones",
    autoFollowups: "seguimientos automáticos",
    cvScreening: "Cribado de CV", skillExtraction: "extracción de habilidades",
    fitScore: "Fit score", vsJd: "vs oferta",
    candidateComms: "Comunicación con candidatos", feedbackUpdates: "feedback + novedades",
    interviewBooked: "Entrevista agendada", calendar: "Calendar",
    postsWeek: "Publicaciones / semana", editorialPlan: "plan editorial",
    captionTags: "Pie de foto + etiquetas", perChannel: "por canal",
    trendsResearched: "Tendencias investigadas", currentHooks: "ganchos actuales",
    formatAdapt: "Adaptación de formato", socialChannels: "IG / LI / TikTok",
    stock: "Existencias", warehouseVariants: "almacén + variantes",
    lowStockAlert: "Alerta de existencias bajas", criticalThreshold: "umbral crítico",
    reorderForecast: "Previsión de reposición", sellThrough: "rotación",
    shipmentTrack: "Seguimiento de envíos", deliveryStatus: "estado de entrega",
    setup: "Configuración", zeroToLive: "de cero a operativo",
    price: "Precio", integrations: "Integraciones",
    compliance: "Cumplimiento", socAes: "SOC 2 · AES-256",
    task1: "Tarea 1", task2: "Tarea 2", perMonth: "/mes",
  },
  de: {
    avgResponse: "Durchschn. Antwort", catalogSearch: "Katalogsuche",
    assistedSales: "Unterstützte Verkäufe", chatToCart: "Chat → Warenkorb",
    cartConversion: "Warenkorb-Conversion", estOnCarts: "geschätzt auf erzeugten Warenkörben",
    uptime: "Uptime", edgeInfra: "Edge-Infrastruktur",
    coverage: "Abdeckung", kbEscalation: "KB + Eskalation",
    firstReply: "Erste Antwort", avgSimpleTickets: "Ø bei einfachen Tickets",
    autoResolved: "Automatisch gelöst", withoutHuman: "ohne Menschen",
    csat: "CSAT", estSatisfaction: "geschätzte Zufriedenheit",
    leadCapture: "Lead-Erfassung", fromFormChat: "aus Formular/Chat",
    enrichment: "Anreicherung", companyRole: "Firma + Rolle",
    slackAlert: "Slack-Hinweis", salesNotified: "Vertrieb informiert",
    consentTracked: "Einwilligung erfasst", optInLog: "Opt-in-Protokoll",
    booking: "Terminbuchung", proposalConfirm: "Vorschlag → Bestätigung",
    overlaps: "Überschneidungen", availabilityCheck: "Verfügbarkeitsprüfung",
    autoLinks: "Automatische Links", inviteVideo: "Einladung mit Video",
    reminders: "Erinnerungen", popupEmail: "Popup + E-Mail",
    dailyTriage: "Tägliche Sortierung", priorityFolders: "Priorität + Ordner",
    draftReady: "Entwurf fertig", proposedReply: "vorgeschlagene Antwort",
    deadlinesTracked: "Fristen überwacht", untilClosed: "bis zum Abschluss",
    eodDigest: "Tagesabschluss", dailyBriefing: "tägliche Übersicht",
    competitors: "Analysierte Wettbewerber", serpIntent: "SERP + Intent",
    structureReady: "Struktur fertig", metaLength: "Meta 150–160",
    citedSources: "Zitierte Quellen", internalLinks: "interne Linkvorschläge",
    readability: "Lesbarkeit", scoreDensity: "Score + Dichte",
    variants: "Varianten", perAssetAngle: "pro Asset / Winkel",
    testReady: "Testbereit", winnerPicked: "Sieger empfohlen",
    sources: "Quellen", competitorsShort: "2–3 Wettbewerber",
    fileDelivery: "Dateilieferung", fileChannel: "copy-{channel}.md",
    execBriefing: "Management-Briefing", prioritiesRisks: "Prioritäten + Risiken",
    kpisRollup: "KPI-Übersicht", salesCalendar: "Vertrieb + Kalender",
    decisionMemo: "Entscheidungsmemo", optionsTradeoffs: "Optionen + Trade-offs",
    nextActions: "Nächste Schritte", ownerDue: "Verantwortlich + Frist",
    reconciliation: "Abgleich", inOut: "Eingänge/Ausgänge",
    financeReminders: "Zahlungserinnerungen", afterApproval: "nach Freigabe",
    cashReport: "Liquiditätsbericht", monthly: "monatlich",
    dueAlerts: "Fristenwarnungen", openInvoices: "offene Rechnungen",
    structuredQuote: "Strukturiertes Angebot", subtotalVat: "Zwischensumme + MwSt.",
    emailSend: "E-Mail-Versand", resend: "Resend",
    discounts: "Rabatte", custom: "individuell",
    pdfAttached: "PDF angehängt", lineItems: "Positionsaufstellung",
    reviewWatch: "Bewertungsüberwachung", googleBusiness: "Google Business",
    sentiment: "Stimmungsanalyse", painPraise: "Kritik/Lob",
    draftReply: "Antwortentwurf", empatheticTone: "empathischer Ton",
    publish: "Veröffentlichung",
    dailyAgenda: "Tagesagenda", optimizedPriorities: "optimierte Prioritäten",
    focusBlock: "Fokusblock", deepWork: "Deep Work",
    notesSummarized: "Notizen zusammengefasst", meetingActions: "Meeting → Aktionen",
    autoFollowups: "automatische Follow-ups",
    cvScreening: "Lebenslauf-Screening", skillExtraction: "Fähigkeitserkennung",
    fitScore: "Fit Score", vsJd: "vs. Stellenanzeige",
    candidateComms: "Kandidatenkommunikation", feedbackUpdates: "Feedback + Updates",
    interviewBooked: "Interview vereinbart", calendar: "Calendar",
    postsWeek: "Beiträge / Woche", editorialPlan: "Redaktionsplan",
    captionTags: "Bildunterschrift + Hashtags", perChannel: "pro Kanal",
    trendsResearched: "Recherchierte Trends", currentHooks: "aktuelle Hooks",
    formatAdapt: "Formatanpassung", socialChannels: "IG / LI / TikTok",
    stock: "Bestand", warehouseVariants: "Lager + Varianten",
    lowStockAlert: "Warnung bei niedrigem Bestand", criticalThreshold: "kritische Schwelle",
    reorderForecast: "Nachbestellprognose", sellThrough: "Abverkaufsrate",
    shipmentTrack: "Sendungsverfolgung", deliveryStatus: "Lieferstatus",
    setup: "Einrichtung", zeroToLive: "vom Nullpunkt einsatzbereit",
    price: "Preis", integrations: "Integrationen",
    compliance: "Compliance", socAes: "SOC 2 · AES-256",
    task1: "Aufgabe 1", task2: "Aufgabe 2", perMonth: "/Mon.",
  },
  fr: {
    avgResponse: "Temps de réponse moyen", catalogSearch: "recherche catalogue",
    assistedSales: "Ventes assistées", chatToCart: "chat → panier",
    cartConversion: "Conversion panier", estOnCarts: "est. sur paniers générés",
    uptime: "Uptime", edgeInfra: "infrastructure Edge",
    coverage: "Couverture", kbEscalation: "KB + escalade",
    firstReply: "Première réponse", avgSimpleTickets: "moy. sur tickets simples",
    autoResolved: "Résolution autonome", withoutHuman: "sans intervention humaine",
    csat: "CSAT", estSatisfaction: "satisfaction est.",
    leadCapture: "Collecte de leads", fromFormChat: "depuis formulaire/chat",
    enrichment: "Enrichissement", companyRole: "société + fonction",
    slackAlert: "Alerte Slack", salesNotified: "ventes alertées",
    consentTracked: "Consentement enregistré", optInLog: "journal d’opt-in",
    booking: "Réservation", proposalConfirm: "proposition → confirmation",
    overlaps: "Chevauchements", availabilityCheck: "vérification de disponibilité",
    autoLinks: "Liens automatiques", inviteVideo: "invitation avec vidéo",
    reminders: "Rappels", popupEmail: "popup + e-mail",
    dailyTriage: "Tri quotidien", priorityFolders: "priorité + dossiers",
    draftReady: "Brouillon prêt", proposedReply: "réponse proposée",
    deadlinesTracked: "Échéances suivies", untilClosed: "jusqu’à la clôture",
    eodDigest: "Résumé de fin de journée", dailyBriefing: "briefing quotidien",
    competitors: "Concurrents analysés", serpIntent: "SERP + intention",
    structureReady: "Structure prête", metaLength: "méta 150–160",
    citedSources: "Sources citées", internalLinks: "liens internes suggérés",
    readability: "Lisibilité", scoreDensity: "score + densité",
    variants: "Variantes", perAssetAngle: "par asset / angle",
    testReady: "Prêt à tester", winnerPicked: "gagnant suggéré",
    sources: "Sources", competitorsShort: "2–3 concurrents",
    fileDelivery: "Livraison de fichier", fileChannel: "copy-{channel}.md",
    execBriefing: "Briefing direction", prioritiesRisks: "priorités + risques",
    kpisRollup: "KPI consolidés", salesCalendar: "ventes + calendrier",
    decisionMemo: "Note de décision", optionsTradeoffs: "options + arbitrages",
    nextActions: "Prochaines actions", ownerDue: "responsable + échéance",
    reconciliation: "Rapprochement", inOut: "entrées/sorties",
    financeReminders: "Relances", afterApproval: "après validation",
    cashReport: "Rapport de trésorerie", monthly: "mensuel",
    dueAlerts: "Alertes d’échéance", openInvoices: "factures ouvertes",
    structuredQuote: "Devis structuré", subtotalVat: "sous-total + TVA",
    emailSend: "Envoi par e-mail", resend: "Resend",
    discounts: "Remises", custom: "personnalisés",
    pdfAttached: "PDF joint", lineItems: "détail des lignes",
    reviewWatch: "Surveillance des avis", googleBusiness: "Google Business",
    sentiment: "Analyse de sentiment", painPraise: "plaintes/éloges",
    draftReply: "Brouillon de réponse", empatheticTone: "ton empathetic",
    publish: "Publication",
    dailyAgenda: "Agenda du jour", optimizedPriorities: "priorités optimisées",
    focusBlock: "Bloc de concentration", deepWork: "travail profond",
    notesSummarized: "Notes résumées", meetingActions: "réunion → actions",
    autoFollowups: "relances automatiques",
    cvScreening: "Présélection CV", skillExtraction: "extraction des compétences",
    fitScore: "Fit score", vsJd: "vs offre",
    candidateComms: "Communication candidats", feedbackUpdates: "retour + infos",
    interviewBooked: "Entretien planifié", calendar: "Calendar",
    postsWeek: "Publications / semaine", editorialPlan: "plan éditorial",
    captionTags: "Légende + hashtags", perChannel: "par canal",
    trendsResearched: "Tendances étudiées", currentHooks: "accroches actuelles",
    formatAdapt: "Adaptation du format", socialChannels: "IG / LI / TikTok",
    stock: "Stocks", warehouseVariants: "entrepôt + variantes",
    lowStockAlert: "Alerte stock bas", criticalThreshold: "seuil critique",
    reorderForecast: "Prévision de réapprovisionnement", sellThrough: "rotation",
    shipmentTrack: "Suivi des expéditions", deliveryStatus: "statut de livraison",
    setup: "Configuration", zeroToLive: "de zéro à opérationnel",
    price: "Prix", integrations: "Intégrations",
    compliance: "Conformité", socAes: "SOC 2 · AES-256",
    task1: "Tâche 1", task2: "Tâche 2", perMonth: "/mois",
  },
};

/**
 * KPI per slug. I `value` sono numerici e uguali in ogni lingua; solo
 * `label`/`sub` passano dalla tabella `KPI_LABELS`.
 */
function kpisFor(agent: Agent, locale: Locale): KPI[] {
  const l = KPI_LABELS[locale];
  const map: Record<string, KPI[]> = {
    "shopify-agent": [
      { value: "< 3s", label: l.avgResponse, sub: l.catalogSearch },
      { value: "24/7", label: l.assistedSales, sub: l.chatToCart },
      { value: "+18%", label: l.cartConversion, sub: l.estOnCarts },
      { value: "99,9%", label: l.uptime, sub: l.edgeInfra },
    ],
    "support-agent": [
      { value: "24/7", label: l.coverage, sub: l.kbEscalation },
      { value: "< 30s", label: l.firstReply, sub: l.avgSimpleTickets },
      { value: "80%", label: l.autoResolved, sub: l.withoutHuman },
      { value: "4,7/5", label: l.csat, sub: l.estSatisfaction },
    ],
    "lead-capture": [
      { value: "< 2s", label: l.leadCapture, sub: l.fromFormChat },
      { value: "3×", label: l.enrichment, sub: l.companyRole },
      { value: "Instant", label: l.slackAlert, sub: l.salesNotified },
      { value: "GDPR", label: l.consentTracked, sub: l.optInLog },
    ],
    "calendar-booking": [
      { value: "2 min", label: l.booking, sub: l.proposalConfirm },
      { value: "0", label: l.overlaps, sub: l.availabilityCheck },
      { value: "Zoom/Meet", label: l.autoLinks, sub: l.inviteVideo },
      { value: "—", label: l.reminders, sub: l.popupEmail },
    ],
    "email-manager": [
      { value: "—", label: l.dailyTriage, sub: l.priorityFolders },
      { value: "< 1m", label: l.draftReady, sub: l.proposedReply },
      { value: "100%", label: l.deadlinesTracked, sub: l.untilClosed },
      { value: "—", label: l.eodDigest, sub: l.dailyBriefing },
    ],
    "seo-agent": [
      { value: "Top 5", label: l.competitors, sub: l.serpIntent },
      { value: "H1–H3", label: l.structureReady, sub: l.metaLength },
      { value: "Citazioni", label: l.citedSources, sub: l.internalLinks },
      { value: "—", label: l.readability, sub: l.scoreDensity },
    ],
    "copywriter": [
      { value: "3×", label: l.variants, sub: l.perAssetAngle },
      { value: "A/B", label: l.testReady, sub: l.winnerPicked },
      { value: "—", label: l.sources, sub: l.competitorsShort },
      { value: "—", label: l.fileDelivery, sub: l.fileChannel },
    ],
    "business-manager": [
      { value: "1", label: l.execBriefing, sub: l.prioritiesRisks },
      { value: "—", label: l.kpisRollup, sub: l.salesCalendar },
      { value: "—", label: l.decisionMemo, sub: l.optionsTradeoffs },
      { value: "—", label: l.nextActions, sub: l.ownerDue },
    ],
    "finance-manager": [
      { value: "—", label: l.reconciliation, sub: l.inOut },
      { value: "—", label: l.financeReminders, sub: l.afterApproval },
      { value: "—", label: l.cashReport, sub: l.monthly },
      { value: "—", label: l.dueAlerts, sub: l.openInvoices },
    ],
    "quote-agent": [
      { value: "—", label: l.structuredQuote, sub: l.subtotalVat },
      { value: "1-click", label: l.emailSend, sub: l.resend },
      { value: "—", label: l.discounts, sub: l.custom },
      { value: "—", label: l.pdfAttached, sub: l.lineItems },
    ],
    "reviews-agent": [
      { value: "—", label: l.reviewWatch, sub: l.googleBusiness },
      { value: "—", label: l.sentiment, sub: l.painPraise },
      { value: "—", label: l.draftReply, sub: l.empatheticTone },
      { value: "1-click", label: l.publish, sub: l.afterApproval },
    ],
    "personal-assistant": [
      { value: "—", label: l.dailyAgenda, sub: l.optimizedPriorities },
      { value: "—", label: l.focusBlock, sub: l.deepWork },
      { value: "—", label: l.notesSummarized, sub: l.meetingActions },
      { value: "—", label: l.reminders, sub: l.autoFollowups },
    ],
    "hr-recruiter": [
      { value: "—", label: l.cvScreening, sub: l.skillExtraction },
      { value: "—", label: l.fitScore, sub: l.vsJd },
      { value: "—", label: l.candidateComms, sub: l.feedbackUpdates },
      { value: "—", label: l.interviewBooked, sub: l.calendar },
    ],
    "social-media-agent": [
      { value: "5–7", label: l.postsWeek, sub: l.editorialPlan },
      { value: "—", label: l.captionTags, sub: l.perChannel },
      { value: "—", label: l.trendsResearched, sub: l.currentHooks },
      { value: "—", label: l.formatAdapt, sub: l.socialChannels },
    ],
    "inventory-logistics": [
      { value: "Real-time", label: l.stock, sub: l.warehouseVariants },
      { value: "—", label: l.lowStockAlert, sub: l.criticalThreshold },
      { value: "—", label: l.reorderForecast, sub: l.sellThrough },
      { value: "—", label: l.shipmentTrack, sub: l.deliveryStatus },
    ],
  };
  if (map[agent.slug]) return map[agent.slug]!;
  // fallback generico
  return [
    { value: agent.setupTime, label: l.setup, sub: l.zeroToLive },
    { value: agent.price, label: l.price, sub: l.perMonth },
    { value: String(agent.integrations.length), label: l.integrations, sub: agent.integrations.slice(0, 2).join(", ") },
    { value: "GDPR", label: l.compliance, sub: l.socAes },
  ];
}

/** Frasi del transcript generico, per locale (con placeholder `{t1}`/`{t2}`). */
type GenericTranscript = {
  ask: string;
  handle: string;
  proceed: string;
  done: string;
};

const GENERIC_TRANSCRIPT: Record<Locale, GenericTranscript> = {
  it: {
    ask: 'Puoi occuparti di "{t1}" per la mia azienda?',
    handle: 'Certo — gestisco **{t1}** end-to-end. Ho già preparato un piano con i tuoi strumenti collegati. Vuoi che proceda con "{t2}"?',
    proceed: "Sì, procedi",
    done: 'Fatto. Ho eseguito **{t2}** e salvato un file pronto da scaricare. Prossimo passo: {workflow}?',
  },
  en: {
    ask: 'Can you handle "{t1}" for my company?',
    handle: 'Absolutely — I handle **{t1}** end-to-end. Plan ready with your connected tools. Proceed with "{t2}"?',
    proceed: "Yes, go ahead",
    done: 'Done — executed **{t2}** and saved a downloadable file. Next: {workflow}?',
  },
  es: {
    ask: '¿Puedes encargarte de "{t1}" para mi empresa?',
    handle: 'Claro — gestiono **{t1}** de principio a fin. Ya tengo un plan listo con tus herramientas conectadas. ¿Sigo con "{t2}"?',
    proceed: "Sí, adelante",
    done: 'Hecho. He ejecutado **{t2}** y he guardado un archivo listo para descargar. Siguiente paso: ¿{workflow}?',
  },
  de: {
    ask: 'Kümmst du dich um "{t1}" für mein Unternehmen?',
    handle: 'Klar — ich erledige **{t1}** durchgängig. Ein Plan mit deinen verbundenen Tools steht bereit. Soll ich mit "{t2}" fortfahren?',
    proceed: "Ja, mach weiter",
    done: 'Erledigt — **{t2}** ausgeführt und eine herunterladbare Datei gespeichert. Nächster Schritt: {workflow}?',
  },
  fr: {
    ask: 'Pouvez-vous gérer « {t1} » pour mon entreprise ?',
    handle: 'Bien sûr — je gère **{t1}** de bout en bout. Un plan est prêt avec vos outils connectés. Je poursuis avec « {t2} » ?',
    proceed: "Oui, allez-y",
    done: 'C’est fait — **{t2}** exécuté et un fichier téléchargeable enregistré. Étape suivante : {workflow} ?',
  },
};

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) =>
    key in values ? values[key] : m,
  );
}

const TRANSCRIPTS: Record<
  string,
  Record<Locale, TranscriptTurn[]>
> = {
  "shopify-agent": {
    it: [
      { role: "user", text: "Cerco una t-shirt organica taglia M, budget 30€" },
      { role: "agent", text: "Ho trovato 3 opzioni nel catalogo — la più venduta è **T-shirt Organica Stone** (€26,90). Vuoi che genero il link diretto al carrello?", meta: "shopify_search_products · 1,2s" },
      { role: "user", text: "Sì, genera il link e dimmi i tempi di consegna" },
      { role: "agent", text: "Link creato: **agentcloud.agency/cart/abc123** — consegna stimata 2–3 giorni. Vuoi anche un codice sconto -10% per chiudere?", meta: "shopify_build_cart_url · shopify_create_discount" },
    ],
    en: [
      { role: "user", text: "Find an organic t-shirt size M under €30" },
      { role: "agent", text: "Found 3 options — best seller is **Organic T-shirt Stone** (€26.90). Shall I generate a direct cart link?", meta: "shopify_search_products · 1.2s" },
      { role: "user", text: "Yes, and tell me delivery time" },
      { role: "agent", text: "Link ready: **agentcloud.agency/cart/abc123** — ETA 2–3 days. Want a -10% code to close the sale?", meta: "shopify_build_cart_url" },
    ],
    es: [
      { role: "user", text: "Busco una camiseta orgánica talla M, presupuesto 30€" },
      { role: "agent", text: "He encontrado 3 opciones — la más vendida es **Camiseta Orgánica Stone** (26,90€). ¿Genero el enlace directo al carrito?", meta: "shopify_search_products · 1,2s" },
      { role: "user", text: "Sí, genera el enlace y dime los plazos de entrega" },
      { role: "agent", text: "Enlace creado: **agentcloud.agency/cart/abc123** — entrega estimada en 2–3 días. ¿Quieres también un código de descuento del -10% para cerrar?", meta: "shopify_build_cart_url · shopify_create_discount" },
    ],
    de: [
      { role: "user", text: "Suche ein organisches T-Shirt in Größe M, Budget 30€" },
      { role: "agent", text: "3 Optionen gefunden — der Bestseller ist **Organic T-Shirt Stone** (26,90€). Soll ich den direkten Warenkorb-Link erstellen?", meta: "shopify_search_products · 1,2s" },
      { role: "user", text: "Ja, erstelle den Link und sag mir die Lieferzeit" },
      { role: "agent", text: "Link erstellt: **agentcloud.agency/cart/abc123** — Lieferung in 2–3 Tagen. Soll ich auch einen -10%-Rabattcode zum Abschluss hinzufügen?", meta: "shopify_build_cart_url · shopify_create_discount" },
    ],
    fr: [
      { role: "user", text: "Je cherche un t-shirt bio taille M, budget 30€" },
      { role: "agent", text: "J’ai trouvé 3 options — la plus vendue est **T-shirt Bio Stone** (26,90€). Je génère le lien direct vers le panier ?", meta: "shopify_search_products · 1,2s" },
      { role: "user", text: "Oui, génère le lien et donne-moi les délais de livraison" },
      { role: "agent", text: "Lien créé : **agentcloud.agency/cart/abc123** — livraison estimée sous 2–3 jours. Je vous ajoute aussi un code -10 % pour finaliser ?", meta: "shopify_build_cart_url · shopify_create_discount" },
    ],
  },
  "support-agent": {
    it: [
      { role: "user", text: "Il mio ordine #1024 non è arrivato, è urgente" },
      { role: "agent", text: "Ho classificato il ticket come **urgenza alta**. Dalla KB: verifica corriere con numero + email. Vuoi che controlli lo stato ordine ora?", meta: "KB: spedizioni.md · shopify_get_order_status" },
      { role: "user", text: "Sì, email mario@azienda.com" },
      { role: "agent", text: "Ordine #1024 — **In transito, consegna domani 10:00**. Ho preparato una risposta empatica con tracking. Invio o escalo al team umano?", meta: "Bozza + escalation smart" },
    ],
    en: [
      { role: "user", text: "My order #1024 hasn't arrived — urgent" },
      { role: "agent", text: "Classified as **high urgency**. KB says: check carrier with order + email. Shall I look it up?", meta: "KB + shopify_get_order_status" },
      { role: "user", text: "Yes, mario@company.com" },
      { role: "agent", text: "Order #1024 — **In transit, delivery tomorrow 10am**. Drafted an empathetic reply with tracking. Send or escalate?", meta: "Draft + smart escalation" },
    ],
    es: [
      { role: "user", text: "Mi pedido #1024 no ha llegado, es urgente" },
      { role: "agent", text: "Lo he clasificado como **urgencia alta**. Desde la KB: comprobar el transportista con número + email. ¿Miro el estado del pedido ahora?", meta: "KB: envíos.md · shopify_get_order_status" },
      { role: "user", text: "Sí, email mario@empresa.com" },
      { role: "agent", text: "Pedido #1024 — **En tránsito, entrega mañana a las 10:00**. He preparado una respuesta empática con seguimiento. ¿Envío o escalo al equipo humano?", meta: "Borrador + escalado inteligente" },
    ],
    de: [
      { role: "user", text: "Meine Bestellung #1024 ist nicht angekommen, ist dringend" },
      { role: "agent", text: "Als **hohe Dringlichkeit** eingestuft. Aus der KB: Spediteur mit Nummer + E-Mail prüfen. Soll ich den Bestellstatus abrufen?", meta: "KB: versand.md · shopify_get_order_status" },
      { role: "user", text: "Ja, E-Mail mario@firma.de" },
      { role: "agent", text: "Bestellung #1024 — **Unterwegs, Lieferung morgen 10:00 Uhr**. Ich habe eine empathische Antwort mit Tracking vorbereitet. Senden oder an das Team eskalieren?", meta: "Entwurf + smarte Eskalation" },
    ],
    fr: [
      { role: "user", text: "Ma commande #1024 n’est pas arrivée, c’est urgent" },
      { role: "agent", text: "Classé comme **haute urgence**. Depuis la base : vérifier le transporteur avec le numéro + l’e-mail. Je consulte le statut de la commande ?", meta: "KB : expeditions.md · shopify_get_order_status" },
      { role: "user", text: "Oui, e-mail mario@societe.fr" },
      { role: "agent", text: "Commande #1024 — **En transit, livraison demain 10h00**. J’ai rédigé une réponse empathique avec suivi. J’envoie ou j’escalade à l’équipe ?", meta: "Brouillon + escalade intelligente" },
    ],
  },
  "lead-capture": {
    it: [
      { role: "user", text: "Nuovo lead dal sito: Giulia Bianchi, giulia@acme.it, Acme Srl — chiede demo Shopify" },
      { role: "agent", text: "Lead validato ✓ — **Acme Srl** arricchita (50–100 dip., Retail). Score: **Alto**. Notifico le vendite su Slack con contesto e prossimo passo.", meta: "lead_capture_submit → enrich → notify_sales" },
      { role: "user", text: "Perfetto, avvisa il team" },
      { role: "agent", text: "Notifica inviata su #sales: *Giulia Bianchi (Acme) — demo Shopify, alto fit, fonte: chat sito. Azione: contatta entro 1h.*", meta: "Slack webhook · write_file lead-giulia.json" },
    ],
    en: [
      { role: "user", text: "New site lead: Giulia Bianchi, giulia@acme.it — asks for Shopify demo" },
      { role: "agent", text: "Validated ✓ — **Acme Srl** enriched (50–100, Retail). Score: **High**. Notifying sales on Slack.", meta: "submit → enrich → notify" },
      { role: "user", text: "Go ahead" },
      { role: "agent", text: "Posted to #sales: *Giulia Bianchi (Acme) — Shopify demo, high fit. Action: contact within 1h.*", meta: "Slack · lead-giulia.json" },
    ],
    es: [
      { role: "user", text: "Nuevo lead del sitio: Giulia Bianchi, giulia@acme.es, Acme Srl — pide demo de Shopify" },
      { role: "agent", text: "Lead validado ✓ — **Acme Srl** enriquecida (50–100, Retail). Puntuación: **Alta**. Aviso al equipo comercial en Slack con contexto y siguiente paso.", meta: "lead_capture_submit → enrich → notify_sales" },
      { role: "user", text: "Perfecto, avisa al equipo" },
      { role: "agent", text: "Aviso enviado a #sales: *Giulia Bianchi (Acme) — demo Shopify, encaje alto, origen: chat del sitio. Acción: contactar en 1h.*", meta: "Slack webhook · write_file lead-giulia.json" },
    ],
    de: [
      { role: "user", text: "Neuer Lead von der Website: Giulia Bianchi, giulia@acme.de, Acme GmbH — bittet um Shopify-Demo" },
      { role: "agent", text: "Lead validiert ✓ — **Acme GmbH** angereichert (50–100, Retail). Score: **Hoch**. Ich benachrichtige den Vertrieb in Slack mit Kontext und nächsten Schritt.", meta: "lead_capture_submit → enrich → notify_sales" },
      { role: "user", text: "Perfekt, informiere das Team" },
      { role: "agent", text: "Nachricht an #sales: *Giulia Bianchi (Acme) — Shopify-Demo, hoher Fit, Quelle: Website-Chat. Aktion: innerhalb 1h kontaktieren.*", meta: "Slack-Webhook · write_file lead-giulia.json" },
    ],
    fr: [
      { role: "user", text: "Nouveau lead depuis le site : Giulia Bianchi, giulia@acme.fr, Acme SARL — demande une démo Shopify" },
      { role: "agent", text: "Lead validé ✓ — **Acme SARL** enrichie (50–100, retail). Score : **Élevé**. J’alerte l’équipe commerciale sur Slack avec le contexte et la prochaine étape.", meta: "lead_capture_submit → enrich → notify_sales" },
      { role: "user", text: "Parfait, préviens l’équipe" },
      { role: "agent", text: "Message posté dans #sales : *Giulia Bianchi (Acme) — démo Shopify, bon fit, source : chat du site. Action : contacter sous 1h.*", meta: "Slack webhook · write_file lead-giulia.json" },
    ],
  },
  "calendar-booking": {
    it: [
      { role: "user", text: "Prenota una call di 30 min con acme@azienda.com giovedì pomeriggio" },
      { role: "agent", text: "Disponibilità giovedì: **14:30, 15:30, 16:30**. Quale preferisci? Aggiungo promemoria 15 min e link Meet.", meta: "calendar_search_availability · get_calendar_events" },
      { role: "user", text: "15:30 va bene" },
      { role: "agent", text: "Evento creato: **Call con Acme — gio 15:30–16:00** con Meet + reminder. Invito inviato.", meta: "calendar_book_event · reminder 15m" },
    ],
    en: [
      { role: "user", text: "Book a 30-min call with acme@company.com Thursday afternoon" },
      { role: "agent", text: "Thursday slots: **2:30pm, 3:30pm, 4:30pm**. Which one? I'll add a 15-min reminder + Meet link.", meta: "availability check" },
      { role: "user", text: "3:30pm" },
      { role: "agent", text: "Booked: **Call with Acme — Thu 3:30–4pm** with Meet + reminder. Invite sent.", meta: "calendar_book_event" },
    ],
    es: [
      { role: "user", text: "Reserva una llamada de 30 min con acme@empresa.com el jueves por la tarde" },
      { role: "agent", text: "Huecos el jueves: **14:30, 15:30, 16:30**. ¿Cuál prefieres? Añado un recordatorio de 15 min y el enlace de Meet.", meta: "calendar_search_availability · get_calendar_events" },
      { role: "user", text: "15:30 me vale" },
      { role: "agent", text: "Evento creado: **Llamada con Acme — jue 15:30–16:00** con Meet + recordatorio. Invitación enviada.", meta: "calendar_book_event · reminder 15m" },
    ],
    de: [
      { role: "user", text: "Buche ein 30-minütiges Gespräch mit acme@firma.de für Donnerstagnachmittag" },
      { role: "agent", text: "Zeiten am Donnerstag: **14:30, 15:30, 16:30**. Welche passt? Ich ergänze eine 15-Minuten-Erinnerung und den Meet-Link.", meta: "calendar_search_availability · get_calendar_events" },
      { role: "user", text: "15:30 passt" },
      { role: "agent", text: "Termin erstellt: **Gespräch mit Acme — Do 15:30–16:00** mit Meet + Erinnerung. Einladung gesendet.", meta: "calendar_book_event · reminder 15m" },
    ],
    fr: [
      { role: "user", text: "Planifiez un appel de 30 min avec acme@societe.fr jeudi après-midi" },
      { role: "agent", text: "Créneaux jeudi : **14h30, 15h30, 16h30**. Lequel préférez-vous ? J’ajoute un rappel de 15 min et le lien Meet.", meta: "calendar_search_availability · get_calendar_events" },
      { role: "user", text: "15h30 me va" },
      { role: "agent", text: "Événement créé : **Appel avec Acme — jeu. 15h30–16h00** avec Meet + rappel. Invitation envoyée.", meta: "calendar_book_event · reminder 15m" },
    ],
  },
  "email-manager": {
    it: [
      { role: "user", text: "Smista le email non lette di questa settimana" },
      { role: "agent", text: "Scansione completata: **23 email** → 4 urgenti, 7 da rispondere, 12 archiviabili. Ho preparato 3 bozze. Vuoi il digest mattutino?", meta: "list_emails · triage" },
      { role: "user", text: "Sì, mostra le bozze" },
      { role: "agent", text: "Bozza 1: *Gentile cliente, confermo consegna domani...* — approvi l'invio con **gmail_send**? Deadline estratta: fattura Acme 30/09.", meta: "gmail_send (su approvazione)" },
    ],
    en: [
      { role: "user", text: "Triage this week's unread emails" },
      { role: "agent", text: "Scanned **23 emails** → 4 urgent, 7 reply-needed, 12 archivable. 3 drafts ready. Want the morning digest?", meta: "list_emails" },
      { role: "user", text: "Show drafts" },
      { role: "agent", text: "Draft 1: *Dear customer, confirming delivery tomorrow...* — approve to send via **gmail_send**? Deadline: Acme invoice 30/09.", meta: "gmail_send on approval" },
    ],
    es: [
      { role: "user", text: "Clasifica los correos sin leer de esta semana" },
      { role: "agent", text: "Escaneo completado: **23 correos** → 4 urgentes, 7 por responder, 12 archivables. He preparado 3 borradores. ¿Quieres el resumen matutino?", meta: "list_emails · triage" },
      { role: "user", text: "Sí, muéstrame los borradores" },
      { role: "agent", text: "Borrador 1: *Estimado cliente, confirmo la entrega de mañana...* — ¿apruebas el envío con **gmail_send**? Fecha límite detectada: factura Acme 30/09.", meta: "gmail_send (con aprobación)" },
    ],
    de: [
      { role: "user", text: "Sortiere die ungelesenen E-Mails dieser Woche" },
      { role: "agent", text: "Scan abgeschlossen: **23 E-Mails** → 4 dringend, 7 zu beantworten, 12 archivierbar. Ich habe 3 Entwürfe vorbereitet. Möchtest du die Morgenübersicht?", meta: "list_emails · triage" },
      { role: "user", text: "Ja, zeig mir die Entwürfe" },
      { role: "agent", text: "Entwurf 1: *Sehr geehrte Kundin, wir bestätigen die Lieferung morgen...* — genehmigst du den Versand mit **gmail_send**? Erkannte Frist: Acme-Rechnung 30.09.", meta: "gmail_send (nach Freigabe)" },
    ],
    fr: [
      { role: "user", text: "Trie les e-mails non lus de cette semaine" },
      { role: "agent", text: "Analyse terminée : **23 e-mails** → 4 urgents, 7 à répondre, 12 archivables. J’ai préparé 3 brouillons. Voulez-vous le résumé du matin ?", meta: "list_emails · triage" },
      { role: "user", text: "Oui, montre-moi les brouillons" },
      { role: "agent", text: "Brouillon 1 : *Madame, nous confirmons la livraison demain…* — validez l’envoi via **gmail_send** ? Échéance détectée : facture Acme 30/09.", meta: "gmail_send (sur validation)" },
    ],
  },
  "finance-manager": {
    it: [
      { role: "user", text: "Riconcilia Stripe di settembre e avvisa i ritardi" },
      { role: "agent", text: "Riconciliazione: **€12.430 incassati / €8.210 usciti**. 3 fatture aperte > 7gg. Preparo solleciti gentili — approvi l'invio?", meta: "finance_get_cashflow · finance_send_reminder" },
      { role: "user", text: "Sì, invia" },
      { role: "agent", text: "Solleciti inviati a 3 clienti. Report cassa generato: *cash_report_settembre.pdf* pronto al download.", meta: "write_file · report" },
    ],
    en: [
      { role: "user", text: "Reconcile September Stripe and nudge late payers" },
      { role: "agent", text: "Reconciled: **€12,430 in / €8,210 out**. 3 invoices >7d overdue. Drafted gentle reminders — approve?", meta: "finance_get_cashflow" },
      { role: "user", text: "Yes" },
      { role: "agent", text: "Reminders sent. Cash report generated: *cash_report_september.pdf* ready.", meta: "write_file" },
    ],
    es: [
      { role: "user", text: "Concilia Stripe de septiembre y avisa a los morosos" },
      { role: "agent", text: "Conciliado: **12.430 € cobrados / 8.210 € pagados**. 3 facturas vencidas hace más de 7 días. He redactado recordatorios amables — ¿apruebas el envío?", meta: "finance_get_cashflow · finance_send_reminder" },
      { role: "user", text: "Sí, envía" },
      { role: "agent", text: "Recordatorios enviados. Informe de caja generado: *cash_report_septiembre.pdf* listo para descargar.", meta: "write_file · report" },
    ],
    de: [
      { role: "user", text: "Gleiche Stripe für September ab und erinnere an Zahlungsziele" },
      { role: "agent", text: "Abgeglichen: **12.430 € eingegangen / 8.210 € ausgegangen**. 3 Rechnungen überfällig (>7 Tage). Ich habe freundliche Erinnerungen entworfen — freigeben?", meta: "finance_get_cashflow · finance_send_reminder" },
      { role: "user", text: "Ja, sende sie" },
      { role: "agent", text: "Erinnerungen versendet. Liquiditätsbericht erstellt: *cash_report_september.pdf* steht zum Download bereit.", meta: "write_file · report" },
    ],
    fr: [
      { role: "user", text: "Rapproche Stripe de septembre et relance les retards de paiement" },
      { role: "agent", text: "Rapproché : **12 430 € encaissés / 8 210 € décaissés**. 3 factures en retard de plus de 7 jours. J’ai rédigé des relances courtoises — vous validez l’envoi ?", meta: "finance_get_cashflow · finance_send_reminder" },
      { role: "user", text: "Oui, envoie" },
      { role: "agent", text: "Relances envoyées. Rapport de trésorerie généré : *cash_report_septembre.pdf* prêt à télécharger.", meta: "write_file · report" },
    ],
  },
};

function transcriptFor(agent: Agent, locale: Locale): TranscriptTurn[] {
  const bySlug = TRANSCRIPTS[agent.slug];
  if (bySlug) return bySlug[locale];
  // fallback generico basato su tasks
  const l = KPI_LABELS[locale];
  const g = GENERIC_TRANSCRIPT[locale];
  const t1 = (agent.tasks[0] ?? l.task1).toLowerCase();
  const t2 = (agent.tasks[1] ?? l.task2).toLowerCase();
  const meta = agent.integrations.slice(0, 2).join(" + ");
  return [
    { role: "user", text: fill(g.ask, { t1 }) },
    { role: "agent", text: fill(g.handle, { t1, t2 }), meta },
    { role: "user", text: g.proceed },
    { role: "agent", text: fill(g.done, { t2, workflow: agent.workflow[0] ?? "" }), meta: "write_file · tool run" },
  ];
}

const TESTIMONIALS: Record<string, Record<Locale, Testimonial>> = {
  "shopify-agent": {
    it: { quote: "Abbiamo trasformato chat anonime in carrelli: +22% di ordini senza aggiungere personale.", author: "Giulia R.", role: "E-commerce Manager", company: "Brand D2C, 40 ordini/giorno" },
    en: { quote: "Anonymous chats became carts: +22% orders without extra headcount.", author: "Giulia R.", role: "E-commerce Manager", company: "D2C brand" },
    es: { quote: "Convertimos los chats anónimos en carritos: +22% de pedidos sin contratar más personal.", author: "Giulia R.", role: "E-commerce Manager", company: "Marca D2C, 40 pedidos/día" },
    de: { quote: "Aus anonymen Chats wurden Warenkörbe: +22 % Bestellungen ohne zusätzliches Personal.", author: "Giulia R.", role: "E-Commerce Manager", company: "D2C-Marke, 40 Bestellungen/Tag" },
    fr: { quote: "Les chats anonymes sont devenus des paniers : +22 % de commandes sans recruter.", author: "Giulia R.", role: "E-commerce Manager", company: "Marque D2C, 40 commandes/jour" },
  },
  "support-agent": {
    it: { quote: "I ticket ripetitivi spariti. Il team interviene solo sui casi davvero complessi.", author: "Marco T.", role: "Head of Support", company: "SaaS B2B, 600 ticket/mese" },
    en: { quote: "Repetitive tickets gone. Team only handles truly complex cases.", author: "Marco T.", role: "Head of Support", company: "B2B SaaS" },
    es: { quote: "Se acabaron los tickets repetitivos. El equipo solo atiende los casos realmente complejos.", author: "Marco T.", role: "Head of Support", company: "SaaS B2B, 600 tickets/mes" },
    de: { quote: "Wiederkehrende Tickets sind Geschichte. Das Team kümmert sich nur um wirklich komplexe Fälle.", author: "Marco T.", role: "Head of Support", company: "B2B SaaS, 600 Tickets/Monat" },
    fr: { quote: "Fini les tickets répétitifs. L’équipe ne traite que les cas vraiment complexes.", author: "Marco T.", role: "Head of Support", company: "SaaS B2B, 600 tickets/mois" },
  },
  "lead-capture": {
    it: { quote: "Lead non più persi: notifica Slack immediata e pipeline sempre calda.", author: "Sara L.", role: "Sales Lead", company: "Agenzia, 30 lead/settimana" },
    en: { quote: "No more lost leads: instant Slack alert, pipeline always warm.", author: "Sara L.", role: "Sales Lead", company: "Agency" },
    es: { quote: "Lead que ya no se pierden: aviso inmediato en Slack y pipeline siempre caliente.", author: "Sara L.", role: "Sales Lead", company: "Agencia, 30 leads/semana" },
    de: { quote: "Keine verlorenen Leads mehr: sofortige Slack-Benachrichtigung und warme Pipeline.", author: "Sara L.", role: "Sales Lead", company: "Agentur, 30 Leads/Woche" },
    fr: { quote: "Plus de leads perdus : alerte Slack immédiate et pipeline toujours chaud.", author: "Sara L.", role: "Sales Lead", company: "Agence, 30 leads/semaine" },
  },
  "calendar-booking": {
    it: { quote: "Basta rimbalzi via email per fissare una call. Prenota da solo in 2 minuti.", author: "Davide P.", role: "Consulente", company: "Studio professionale" },
    en: { quote: "No more email ping-pong to book a call. Books itself in 2 minutes.", author: "Davide P.", role: "Consultant", company: "Practice" },
    es: { quote: "Se acabaron los idas y venidas por email para agendar una llamada. Reserva solo en 2 minutos.", author: "Davide P.", role: "Consultor", company: "Despacho profesional" },
    de: { quote: "Kein Ping-Pong per E-Mail mehr, um ein Gespräch zu buchen. Terminiert in 2 Minuten selbst.", author: "Davide P.", role: "Berater", company: "Kanzlei" },
    fr: { quote: "Fini les allers-retours par e-mail pour planifier un appel. Il réserve en 2 minutes.", author: "Davide P.", role: "Consultant", company: "Cabinet" },
  },
  "email-manager": {
    it: { quote: "Riepilogo mattutino salva-giornata: so subito cosa richiede la mia decisione.", author: "Elena M.", role: "Founder", company: "PMI servizi" },
    en: { quote: "Morning digest saves my day — I know what needs my decision.", author: "Elena M.", role: "Founder", company: "SMB services" },
    es: { quote: "El resumen matutino me salva el día: sé al instante qué necesita mi decisión.", author: "Elena M.", role: "Founder", company: "Pymes de servicios" },
    de: { quote: "Die Morgenübersicht rettet mir den Tag — ich weiß sofort, was meine Entscheidung braucht.", author: "Elena M.", role: "Founder", company: "Dienstleister (KMU)" },
    fr: { quote: "Le résumé du matin me sauve la journée : je sais tout de suite ce qui attend ma décision.", author: "Elena M.", role: "Fondatrice", company: "PME de services" },
  },
};

/** Frase della testimonianza generica, per locale (con placeholder `{task}`). */
const GENERIC_QUOTE: Record<Locale, string> = {
  it: 'Con {agent} abbiamo automatizzato "{task}" senza scrivere codice.',
  en: 'With {agent} we automated "{task}" with no code.',
  es: 'Con {agent} automatizamos "{task}" sin escribir código.',
  de: 'Mit {agent} haben wir "{task}" ohne Code automatisiert.',
  fr: 'Avec {agent}, nous avons automatisé « {task} » sans écrire de code.',
};

const GENERIC_COMPANY: Record<Locale, string> = {
  it: "PMI italiana",
  en: "SMB",
  es: "Pyme española",
  de: "Deutsches KMU",
  fr: "PME française",
};

function testimonialFor(agent: Agent, locale: Locale): Testimonial {
  const bySlug = TESTIMONIALS[agent.slug];
  if (bySlug) return bySlug[locale];
  return {
    quote: fill(GENERIC_QUOTE[locale], {
      agent: agent.shortName,
      task: agent.tasks[0]?.toLowerCase() ?? "",
    }),
    author:
      locale === "it"
        ? "Cliente AgentCloud"
        : locale === "es"
          ? "Cliente de AgentCloud"
          : locale === "de"
            ? "AgentCloud-Kunde"
            : locale === "fr"
              ? "Client AgentCloud"
              : "AgentCloud customer",
    role: agent.industry,
    company: GENERIC_COMPANY[locale],
  };
}

/**
 * Tool associati ai task, indicizzati per slug + posizione.
 *
 * Prima chiavevano sul testo inglese del task, ma `getDetailEnrichment()`
 * riceve l'agente già localizzato (`localizeAgent`), quindi in it/es/de/fr la
 * ricerca falliva sempre e le capability mostravano tool generici. Indicizzare
 * per posizione rende la mappa immune alla lingua.
 */
const TOOLS_BY_SLUG: Record<string, (string[] | null)[]> = {
  "shopify-agent": [
    ["shopify_search_products"],
    ["shopify_build_cart_url"],
    ["shopify_get_order_status"],
    ["shopify_create_discount"],
  ],
  "lead-capture": [
    ["lead_capture_submit"],
    ["lead_capture_enrich"],
    ["lead_capture_notify_sales"],
  ],
};

/** Descrizione delle capability per posizione del task, per locale. */
const CAPABILITY_DESCS: Record<Locale, [string, string, string]> = {
  it: [
    "Cerca nel catalogo Shopify con filtri reali e suggerisce i prodotti giusti.",
    "Genera link carrello con checkout rapido, condivisibile ovunque.",
    "Verifica stato ordine con numero + email, risponde in secondi.",
  ],
  en: [
    "Searches the real Shopify catalog and suggests the right products.",
    "Generates cart links with fast checkout, shareable anywhere.",
    "Checks order status with number + email, answers in seconds.",
  ],
  es: [
    "Busca en el catálogo real de Shopify y sugiere los productos adecuados.",
    "Genera enlaces de carrito con pago rápido, compartibles donde quieras.",
    "Comprueba el estado del pedido con número + email y responde en segundos.",
  ],
  de: [
    "Durchsucht den echten Shopify-Katalog und schlägt die passenden Produkte vor.",
    "Erstellt Warenkorb-Links mit schnellem Checkout, überall teilbar.",
    "Prüft den Bestellstatus mit Nummer + E-Mail und antwortet in Sekunden.",
  ],
  fr: [
    "Recherche dans le vrai catalogue Shopify et suggère les bons produits.",
    "Génère des liens de panier avec paiement rapide, partageables partout.",
    "Vérifie le statut de la commande avec numéro + e-mail, répond en quelques secondes.",
  ],
};

const GENERIC_CAPABILITY: Record<Locale, string> = {
  it: 'Automatizza “{task}” con i tuoi strumenti collegati e output pronti da condividere.',
  en: 'Automates “{task}” with your connected tools and shareable output.',
  es: 'Automatiza “{task}” con tus herramientas conectadas y resultados listos para compartir.',
  de: 'Automatisiert „{task}“ mit deinen verbundenen Tools und teilfertigen Ergebnissen.',
  fr: 'Automatise « {task} » avec vos outils connectés et des résultats prêts à partager.',
};

function capabilitiesFor(agent: Agent, locale: Locale): Capability[] {
  // Mappa tasks → capability cards con tool e descrizione breve localizzata.
  // Se l'agente ha workflow/tools specifici, li mostriamo come badge.
  const perSlug = TOOLS_BY_SLUG[agent.slug];
  const descs = CAPABILITY_DESCS[locale];
  return agent.tasks.map((t, i) => {
    const mapped = perSlug?.[i];
    const tools = mapped ?? agent.integrations.slice(0, 2);
    const desc = mapped
      ? fill(descs[i] ?? GENERIC_CAPABILITY[locale], { task: t })
      : fill(GENERIC_CAPABILITY[locale], { task: t });
    return { title: t, desc, tools: Array.isArray(tools) ? tools : [tools] };
  });
}

const SECURITY: Record<Locale, string[]> = {
  it: [
    "Token cifrati AES-256-GCM, RLS per tenant, nessuna chiave nel client.",
    "Connessioni OAuth 2.0 con richiesta di consenso; revoca 1-click dal dashboard.",
    "Log delle esecuzioni + notifiche; dati non usati per training.",
    "Conformità GDPR: export/cancellazione su richiesta, DPA disponibile.",
  ],
  en: [
    "AES-256-GCM encrypted tokens, per-tenant RLS, no secrets in the client.",
    "OAuth 2.0 with consent; 1-click revoke from dashboard.",
    "Run logs + notifications; data never used for training.",
    "GDPR: export/delete on request, DPA available.",
  ],
  es: [
    "Tokens cifrados con AES-256-GCM, RLS por tenant, sin claves en el cliente.",
    "Conexiones OAuth 2.0 con solicitud de consentimiento; revocación en 1 clic desde el panel.",
    "Registros de ejecuciones + notificaciones; los datos no se usan para entrenamiento.",
    "Cumplimiento del RGPD: exportación/borrado bajo petición, DPA disponible.",
  ],
  de: [
    "AES-256-GCM-verschlüsselte Tokens, RLS pro Tenant, keine Schlüssel im Client.",
    "OAuth-2.0-Verbindungen mit Einwilligung; Widerruf per Klick im Dashboard.",
    "Ausführungsprotokolle + Benachrichtigungen; Daten werden nicht zum Training genutzt.",
    "DSGVO-Konformität: Export/Löschung auf Anfrage, DPA verfügbar.",
  ],
  fr: [
    "Jetons chiffrés en AES-256-GCM, RLS par tenant, aucune clé côté client.",
    "Connexions OAuth 2.0 avec consentement ; révocation en un clic depuis le tableau de bord.",
    "Journaux d’exécution + notifications ; les données ne servent jamais à l’entraînement.",
    "Conformité RGPD : export/suppression sur demande, DPA disponible.",
  ],
};

function securityFor(locale: Locale): string[] {
  return SECURITY[locale];
}

export function getDetailEnrichment(agent: Agent, locale: Locale): Enrichment {
  return {
    kpis: kpisFor(agent, locale),
    transcript: transcriptFor(agent, locale),
    testimonial: testimonialFor(agent, locale),
    capabilities: capabilitiesFor(agent, locale),
    security: securityFor(locale),
  };
}

type PricingNotes = {
  perMonth: string;
  billedMonthly: string;
  includes: string;
  setupLabel: string;
  support: string;
  overage: string;
  bundleSave: string;
};

const PRICING_NOTES: Record<Locale, PricingNotes> = {
  it: {
    perMonth: "/mese",
    billedMonthly: "Fatturazione mensile, disdici quando vuoi.",
    includes: "Cosa include",
    setupLabel: "Setup tipico",
    support: "Supporto dedicato all'avvio",
    overage: "Oltre allowance: €0,30/1k token fino a cap 2×, poi pausa.",
    bundleSave: "Risparmia con i bundle (sconto 12–35%)",
  },
  en: {
    perMonth: "/mo",
    billedMonthly: "Monthly billing, cancel anytime.",
    includes: "What's included",
    setupLabel: "Typical setup",
    support: "Dedicated onboarding support",
    overage: "Beyond allowance: €0.30/1k tokens up to 2× cap, then paused.",
    bundleSave: "Save with bundles (12–35% off)",
  },
  es: {
    perMonth: "/mes",
    billedMonthly: "Facturación mensual, cancela cuando quieras.",
    includes: "Qué incluye",
    setupLabel: "Configuración habitual",
    support: "Soporte dedicado durante la puesta en marcha",
    overage: "Más allá del límite: 0,30 €/1k tokens hasta un tope del 2× y después pausa.",
    bundleSave: "Ahorra con los packs (12–35% de descuento)",
  },
  de: {
    perMonth: "/Mon.",
    billedMonthly: "Monatliche Abrechnung, jederzeit kündbar.",
    includes: "Enthalten ist",
    setupLabel: "Typische Einrichtung",
    support: "Persönliche Unterstützung bei der Einrichtung",
    overage: "Über dem Kontingent: 0,30 €/1k Tokens bis zum 2-fachen Limit, danach Pause.",
    bundleSave: "Mit Bundles sparen (12–35 % Rabatt)",
  },
  fr: {
    perMonth: "/mois",
    billedMonthly: "Facturation mensuelle, résiliable à tout moment.",
    includes: "Ce qui est inclus",
    setupLabel: "Configuration habituelle",
    support: "Accompagnement dédié au démarrage",
    overage: "Au-delà du quota : 0,30 €/1k tokens jusqu’à 2× le plafond, puis mise en pause.",
    bundleSave: "Économisez avec les packs (12–35 % de remise)",
  },
};

export function getPricingNotes(locale: Locale): PricingNotes {
  return PRICING_NOTES[locale];
}
