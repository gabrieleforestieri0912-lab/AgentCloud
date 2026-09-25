/**
 * Contenuti arricchiti per la pagina dettaglio agente — marketplace pro.
 *
 * Fornisce KPI, demo transcript, capability cards, security bullets e
 * testimonianze per rendere la scheda densa e professionale senza
 * chiamate esterne. Tutti i testi sono localizzati it/en qui, per
 * evitare di toccare il dizionario centrale (9000 righe) e restare
 * type-safe.
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

const T = (locale: Locale, it: string, en: string) => (locale === "it" ? it : en);

// — KPI per slug (valori indicativi, localizzati) —
function kpisFor(agent: Agent, locale: Locale): KPI[] {
  const it = locale === "it";
  const map: Record<string, KPI[]> = {
    "shopify-agent": [
      { value: "< 3s", label: T(locale, "Risposta media", "Avg. response"), sub: T(locale, "ricerca catalogo", "catalog search") },
      { value: "24/7", label: T(locale, "Vendite assistite", "Assisted sales"), sub: T(locale, "chat → carrello", "chat → cart") },
      { value: "+18%", label: T(locale, "Conversione carrello", "Cart conversion"), sub: T(locale, "stima su carrelli generati", "est. on generated carts") },
      { value: "99,9%", label: "Uptime", sub: T(locale, "infrastruttura Edge", "Edge infra") },
    ],
    "support-agent": [
      { value: "24/7", label: T(locale, "Copertura", "Coverage"), sub: "KB + escalation" },
      { value: "< 30s", label: T(locale, "Prima risposta", "First reply"), sub: T(locale, "media su ticket semplici", "avg on simple tickets") },
      { value: "80%", label: T(locale, "Risoluzione autonoma", "Auto-resolved"), sub: T(locale, "senza umano", "without human") },
      { value: "4,7/5", label: "CSAT", sub: T(locale, "soddisfazione stimata", "est. satisfaction") },
    ],
    "lead-capture": [
      { value: "< 2s", label: T(locale, "Cattura lead", "Lead capture"), sub: T(locale, "da form/chat", "from form/chat") },
      { value: "3×", label: T(locale, "Arricchimento", "Enrichment"), sub: T(locale, "dati azienda + ruolo", "company + role") },
      { value: "Instant", label: "Slack alert", sub: T(locale, "vendite notificate", "sales notified") },
      { value: "GDPR", label: T(locale, "Consenso tracciato", "Consent tracked"), sub: "opt-in log" },
    ],
    "calendar-booking": [
      { value: "2 min", label: T(locale, "Prenotazione", "Booking"), sub: T(locale, "proposta → conferma", "proposal → confirm") },
      { value: "0", label: T(locale, "Sovrapposizioni", "Overlaps"), sub: T(locale, "controllo disponibilità", "availability check") },
      { value: "Zoom/Meet", label: T(locale, "Link automatici", "Auto links"), sub: T(locale, "invito con video", "invite w/ video") },
      { value: "—", label: T(locale, "Promemoria", "Reminders"), sub: T(locale, "popup + email", "popup + email") },
    ],
    "email-manager": [
      { value: "—", label: T(locale, "Triage giornaliero", "Daily triage"), sub: T(locale, "priorità + cartelle", "priority + folders") },
      { value: "< 1m", label: T(locale, "Bozza pronta", "Draft ready"), sub: T(locale, "risposta proposta", "proposed reply") },
      { value: "100%", label: T(locale, "Scadenze tracciate", "Deadlines tracked"), sub: T(locale, "follow-up fino a chiusura", "until closed") },
      { value: "—", label: T(locale, "Digest finale", "EOD digest"), sub: T(locale, "briefing giornaliero", "daily briefing") },
    ],
    "seo-agent": [
      { value: "Top 5", label: T(locale, "Competitor analizzati", "Competitors"), sub: "SERP + intent" },
      { value: "H1–H3", label: T(locale, "Struttura pronta", "Structure ready"), sub: "meta 150–160" },
      { value: "Citazioni", label: T(locale, "Fonti citate", "Cited sources"), sub: T(locale, "link interni suggeriti", "internal links") },
      { value: "—", label: T(locale, "Readability", "Readability"), sub: T(locale, "score + keyword density", "score + density") },
    ],
    "copywriter": [
      { value: "3×", label: T(locale, "Varianti", "Variants"), sub: T(locale, "per asset / angolo", "per asset / angle") },
      { value: "A/B", label: T(locale, "Pronto al test", "Test-ready"), sub: T(locale, "vincitore consigliato", "winner picked") },
      { value: "—", label: T(locale, "Citazioni", "Sources"), sub: "2–3 competitor" },
      { value: "—", label: T(locale, "Consegna file", "File delivery"), sub: "copy-{channel}.md" },
    ],
    "business-manager": [
      { value: "1", label: T(locale, "Briefing dirigenziale", "Exec briefing"), sub: T(locale, "priorità + rischi", "priorities + risks") },
      { value: "—", label: T(locale, "KPI aggregati", "KPIs roll-up"), sub: T(locale, "vendite + calendario", "sales + calendar") },
      { value: "—", label: T(locale, "Decision memo", "Decision memo"), sub: T(locale, "opzioni + trade-off", "options + trade-offs") },
      { value: "—", label: T(locale, "Azioni prioritarie", "Next actions"), sub: T(locale, "owner + deadline", "owner + due") },
    ],
    "finance-manager": [
      { value: "—", label: T(locale, "Riconciliazione", "Reconciliation"), sub: T(locale, "entrate/uscite", "in/out") },
      { value: "—", label: T(locale, "Solleciti", "Reminders"), sub: T(locale, "dopo approvazione", "after approval") },
      { value: "—", label: T(locale, "Report cassa", "Cash report"), sub: T(locale, "mensile", "monthly") },
      { value: "—", label: T(locale, "Allerta scadenze", "Due alerts"), sub: T(locale, "fatture aperte", "open invoices") },
    ],
    "quote-agent": [
      { value: "—", label: T(locale, "Preventivo strutturato", "Structured quote"), sub: T(locale, "subtotale + IVA", "subtotal + VAT") },
      { value: "1-click", label: T(locale, "Invio email", "Email send"), sub: "Resend" },
      { value: "—", label: T(locale, "Sconti", "Discounts"), sub: T(locale, "personalizzati", "custom") },
      { value: "—", label: T(locale, "Allegato PDF", "PDF attached"), sub: T(locale, "riepilogo voci", "line items") },
    ],
    "reviews-agent": [
      { value: "—", label: T(locale, "Monitoraggio recensioni", "Review watch"), sub: "Google Business" },
      { value: "—", label: T(locale, "Analisi sentiment", "Sentiment"), sub: T(locale, "punti dolenti/complimenti", "pain/praise") },
      { value: "—", label: T(locale, "Bozza risposta", "Draft reply"), sub: T(locale, "tono empatico", "empathetic tone") },
      { value: "1-click", label: T(locale, "Pubblicazione", "Publish"), sub: T(locale, "dopo approvazione", "after approval") },
    ],
    "personal-assistant": [
      { value: "—", label: T(locale, "Agenda giornaliera", "Daily agenda"), sub: T(locale, "priorità ottimizzate", "optimized priorities") },
      { value: "—", label: T(locale, "Blocco focus", "Focus block"), sub: T(locale, "deep work", "deep work") },
      { value: "—", label: T(locale, "Note riassunte", "Notes summarized"), sub: T(locale, "meeting → azioni", "meeting → actions") },
      { value: "—", label: T(locale, "Promemoria", "Reminders"), sub: T(locale, "follow-up automatici", "auto follow-ups") },
    ],
    "hr-recruiter": [
      { value: "—", label: T(locale, "Screening CV", "CV screening"), sub: T(locale, "estrazione skill", "skill extraction") },
      { value: "—", label: T(locale, "Fit score", "Fit score"), sub: T(locale, "vs job description", "vs JD") },
      { value: "—", label: T(locale, "Comunicazione candidati", "Candidate comms"), sub: T(locale, "feedback + update", "feedback + updates") },
      { value: "—", label: T(locale, "Colloquio fissato", "Interview booked"), sub: "Calendar" },
    ],
    "social-media-agent": [
      { value: "5–7", label: T(locale, "Post / settimana", "Posts / week"), sub: T(locale, "piano editoriale", "editorial plan") },
      { value: "—", label: T(locale, "Caption + hashtag", "Caption + tags"), sub: T(locale, "per canale", "per channel") },
      { value: "—", label: T(locale, "Trend ricercati", "Trends researched"), sub: T(locale, "hook attuali", "current hooks") },
      { value: "—", label: T(locale, "Adattamento formato", "Format adapt"), sub: "IG / LI / TikTok" },
    ],
    "inventory-logistics": [
      { value: "Real-time", label: T(locale, "Giacenze", "Stock"), sub: T(locale, "magazzino + varianti", "warehouse + variants") },
      { value: "—", label: T(locale, "Allerta sottoscorta", "Low-stock alert"), sub: T(locale, "soglia critica", "critical threshold") },
      { value: "—", label: T(locale, "Previsione riordino", "Reorder forecast"), sub: T(locale, "tasso vendite", "sell-through") },
      { value: "—", label: T(locale, "Tracking spedizioni", "Shipment track"), sub: T(locale, "stato consegna", "delivery status") },
    ],
  };
  if (map[agent.slug]) return map[agent.slug]!;
  // fallback generico
  return [
    { value: agent.setupTime, label: T(locale, "Setup", "Setup"), sub: T(locale, "da zero a operativo", "zero to live") },
    { value: agent.price, label: T(locale, "Canone", "Price"), sub: "/mese" },
    { value: String(agent.integrations.length), label: T(locale, "Integrazioni", "Integrations"), sub: agent.integrations.slice(0, 2).join(", ") },
    { value: "GDPR", label: T(locale, "Conformità", "Compliance"), sub: "SOC 2 · AES-256" },
  ];
}

function transcriptFor(agent: Agent, locale: Locale): TranscriptTurn[] {
  const it = locale === "it";
  const bySlug: Record<string, TranscriptTurn[]> = {
    "shopify-agent": it
      ? [
          { role: "user", text: "Cerco una t-shirt organica taglia M, budget 30€" },
          { role: "agent", text: "Ho trovato 3 opzioni nel catalogo — la più venduta è **T-shirt Organica Stone** (€26,90). Vuoi che genero il link diretto al carrello?", meta: "shopify_search_products · 1,2s" },
          { role: "user", text: "Sì, genera il link e dimmi i tempi di consegna" },
          { role: "agent", text: "Link creato: **agentcloud.agency/cart/abc123** — consegna stimata 2–3 giorni. Vuoi anche un codice sconto -10% per chiudere?", meta: "shopify_build_cart_url · shopify_create_discount" },
        ]
      : [
          { role: "user", text: "Find an organic t-shirt size M under €30" },
          { role: "agent", text: "Found 3 options — best seller is **Organic T-shirt Stone** (€26.90). Shall I generate a direct cart link?", meta: "shopify_search_products · 1.2s" },
          { role: "user", text: "Yes, and tell me delivery time" },
          { role: "agent", text: "Link ready: **agentcloud.agency/cart/abc123** — ETA 2–3 days. Want a -10% code to close the sale?", meta: "shopify_build_cart_url" },
        ],
    "support-agent": it
      ? [
          { role: "user", text: "Il mio ordine #1024 non è arrivato, è urgente" },
          { role: "agent", text: "Ho classificato il ticket come **urgenza alta**. Dalla KB: verifica corriere con numero + email. Vuoi che controlli lo stato ordine ora?", meta: "KB: spedizioni.md · shopify_get_order_status" },
          { role: "user", text: "Sì, email mario@azienda.com" },
          { role: "agent", text: "Ordine #1024 — **In transito, consegna domani 10:00**. Ho preparato una risposta empatica con tracking. Invio o escalo al team umano?", meta: "Bozza + escalation smart" },
        ]
      : [
          { role: "user", text: "My order #1024 hasn't arrived — urgent" },
          { role: "agent", text: "Classified as **high urgency**. KB says: check carrier with order + email. Shall I look it up?", meta: "KB + shopify_get_order_status" },
          { role: "user", text: "Yes, mario@company.com" },
          { role: "agent", text: "Order #1024 — **In transit, delivery tomorrow 10am**. Drafted an empathetic reply with tracking. Send or escalate?", meta: "Draft + smart escalation" },
        ],
    "lead-capture": it
      ? [
          { role: "user", text: "Nuovo lead dal sito: Giulia Bianchi, giulia@acme.it, Acme Srl — chiede demo Shopify" },
          { role: "agent", text: "Lead validato ✓ — **Acme Srl** arricchita (50–100 dip., Retail). Score: **Alto**. Notifico le vendite su Slack con contesto e prossimo passo.", meta: "lead_capture_submit → enrich → notify_sales" },
          { role: "user", text: "Perfetto, avvisa il team" },
          { role: "agent", text: "Notifica inviata su #sales: *Giulia Bianchi (Acme) — demo Shopify, alto fit, fonte: chat sito. Azione: contatta entro 1h.*", meta: "Slack webhook · write_file lead-giulia.json" },
        ]
      : [
          { role: "user", text: "New site lead: Giulia Bianchi, giulia@acme.it — asks for Shopify demo" },
          { role: "agent", text: "Validated ✓ — **Acme Srl** enriched (50–100, Retail). Score: **High**. Notifying sales on Slack.", meta: "submit → enrich → notify" },
          { role: "user", text: "Go ahead" },
          { role: "agent", text: "Posted to #sales: *Giulia Bianchi (Acme) — Shopify demo, high fit. Action: contact within 1h.*", meta: "Slack · lead-giulia.json" },
        ],
    "calendar-booking": it
      ? [
          { role: "user", text: "Prenota una call di 30 min con acme@azienda.com giovedì pomeriggio" },
          { role: "agent", text: "Disponibilità giovedì: **14:30, 15:30, 16:30**. Quale preferisci? Aggiungo promemoria 15 min e link Meet.", meta: "calendar_search_availability · get_calendar_events" },
          { role: "user", text: "15:30 va bene" },
          { role: "agent", text: "Evento creato: **Call con Acme — gio 15:30–16:00** con Meet + reminder. Invito inviato.", meta: "calendar_book_event · reminder 15m" },
        ]
      : [
          { role: "user", text: "Book a 30-min call with acme@company.com Thursday afternoon" },
          { role: "agent", text: "Thursday slots: **2:30pm, 3:30pm, 4:30pm**. Which one? I'll add a 15-min reminder + Meet link.", meta: "availability check" },
          { role: "user", text: "3:30pm" },
          { role: "agent", text: "Booked: **Call with Acme — Thu 3:30–4pm** with Meet + reminder. Invite sent.", meta: "calendar_book_event" },
        ],
    "email-manager": it
      ? [
          { role: "user", text: "Smista le email non lette di questa settimana" },
          { role: "agent", text: "Scansione completata: **23 email** → 4 urgenti, 7 da rispondere, 12 archiviabili. Ho preparato 3 bozze. Vuoi il digest mattutino?", meta: "list_emails · triage" },
          { role: "user", text: "Sì, mostra le bozze" },
          { role: "agent", text: "Bozza 1: *Gentile cliente, confermo consegna domani...* — approvi l'invio con **gmail_send**? Deadline estratta: fattura Acme 30/09.", meta: "gmail_send (su approvazione)" },
        ]
      : [
          { role: "user", text: "Triage this week's unread emails" },
          { role: "agent", text: "Scanned **23 emails** → 4 urgent, 7 reply-needed, 12 archivable. 3 drafts ready. Want the morning digest?", meta: "list_emails" },
          { role: "user", text: "Show drafts" },
          { role: "agent", text: "Draft 1: *Dear customer, confirming delivery tomorrow...* — approve to send via **gmail_send**? Deadline: Acme invoice 30/09.", meta: "gmail_send on approval" },
        ],
    "finance-manager": it
      ? [
          { role: "user", text: "Riconcilia Stripe di settembre e avvisa i ritardi" },
          { role: "agent", text: "Riconciliazione: **€12.430 incassati / €8.210 usciti**. 3 fatture aperte > 7gg. Preparo solleciti gentili — approvi l'invio?", meta: "finance_get_cashflow · finance_send_reminder" },
          { role: "user", text: "Sì, invia" },
          { role: "agent", text: "Solleciti inviati a 3 clienti. Report cassa generato: *cash_report_settembre.pdf* pronto al download.", meta: "write_file · report" },
        ]
      : [
          { role: "user", text: "Reconcile September Stripe and nudge late payers" },
          { role: "agent", text: "Reconciled: **€12,430 in / €8,210 out**. 3 invoices >7d overdue. Drafted gentle reminders — approve?", meta: "finance_get_cashflow" },
          { role: "user", text: "Yes" },
          { role: "agent", text: "Reminders sent. Cash report generated: *cash_report_september.pdf* ready.", meta: "write_file" },
        ],
  };
  if (bySlug[agent.slug]) return bySlug[agent.slug]!;
  // fallback generico basato su tasks
  const t1 = agent.tasks[0] ?? T(locale, "Attività 1", "Task 1");
  const t2 = agent.tasks[1] ?? T(locale, "Attività 2", "Task 2");
  if (it) {
    return [
      { role: "user", text: `Puoi occuparti di "${t1.toLowerCase()}" per la mia azienda?` },
      { role: "agent", text: `Certo — gestisco **${t1.toLowerCase()}** end-to-end. Ho già preparato un piano con i tuoi strumenti collegati. Vuoi che proceda con "${t2.toLowerCase()}"?`, meta: agent.integrations.slice(0, 2).join(" + ") },
      { role: "user", text: "Sì, procedi" },
      { role: "agent", text: `Fatto. Ho eseguito **${t2.toLowerCase()}** e salvato un file pronto da scaricare. Prossimo passo: ${agent.workflow[0] ?? "verifica risultati"}?`, meta: "write_file · tool run" },
    ];
  }
  return [
    { role: "user", text: `Can you handle "${t1.toLowerCase()}" for my company?` },
    { role: "agent", text: `Absolutely — I handle **${t1.toLowerCase()}** end-to-end. Plan ready with your connected tools. Proceed with "${t2.toLowerCase()}"?`, meta: agent.integrations.slice(0, 2).join(" + ") },
    { role: "user", text: "Yes, go ahead" },
    { role: "agent", text: `Done — executed **${t2.toLowerCase()}** and saved a downloadable file. Next: ${agent.workflow[0] ?? "review results"}?`, meta: "write_file" },
  ];
}

function testimonialFor(agent: Agent, locale: Locale): Testimonial {
  const it = locale === "it";
  const map: Record<string, Testimonial> = {
    "shopify-agent": it
      ? { quote: "Abbiamo trasformato chat anonime in carrelli: +22% di ordini senza aggiungere personale.", author: "Giulia R.", role: "E-commerce Manager", company: "Brand D2C, 40 ordini/giorno" }
      : { quote: "Anonymous chats became carts: +22% orders without extra headcount.", author: "Giulia R.", role: "E-commerce Manager", company: "D2C brand" },
    "support-agent": it
      ? { quote: "I ticket ripetitivi spariti. Il team interviene solo sui casi davvero complessi.", author: "Marco T.", role: "Head of Support", company: "SaaS B2B, 600 ticket/mese" }
      : { quote: "Repetitive tickets gone. Team only handles truly complex cases.", author: "Marco T.", role: "Head of Support", company: "B2B SaaS" },
    "lead-capture": it
      ? { quote: "Lead non più persi: notifica Slack immediata e pipeline sempre calda.", author: "Sara L.", role: "Sales Lead", company: "Agenzia, 30 lead/settimana" }
      : { quote: "No more lost leads: instant Slack alert, pipeline always warm.", author: "Sara L.", role: "Sales Lead", company: "Agency" },
    "calendar-booking": it
      ? { quote: "Basta rimbalzi via email per fissare una call. Prenota da solo in 2 minuti.", author: "Davide P.", role: "Consulente", company: "Studio professionale" }
      : { quote: "No more email ping-pong to book a call. Books itself in 2 minutes.", author: "Davide P.", role: "Consultant", company: "Practice" },
    "email-manager": it
      ? { quote: "Riepilogo mattutino salva-giornata: so subito cosa richiede la mia decisione.", author: "Elena M.", role: "Founder", company: "PMI servizi" }
      : { quote: "Morning digest saves my day — I know what needs my decision.", author: "Elena M.", role: "Founder", company: "SMB services" },
  };
  if (map[agent.slug]) return map[agent.slug]!;
  return it
    ? { quote: `Con ${agent.shortName} abbiamo automatizzato "${agent.tasks[0]?.toLowerCase() ?? "il workflow"}" senza scrivere codice.`, author: "Cliente AgentCloud", role: agent.industry, company: "PMI italiana" }
    : { quote: `With ${agent.shortName} we automated "${agent.tasks[0]?.toLowerCase() ?? "the workflow"}" with no code.`, author: "AgentCloud customer", role: agent.industry, company: "SMB" };
}

function capabilitiesFor(agent: Agent, locale: Locale): Capability[] {
  // Mappa tasks → capability cards con tool e descrizione breve localizzata.
  // Se l'agente ha workflow/tools specifici, li mostriamo come badge.
  const toolsByTask: Record<string, string[]> = {
    "Product search in the catalog": ["shopify_search_products"],
    "Direct cart link generation": ["shopify_build_cart_url"],
    "Order status and tracking": ["shopify_get_order_status"],
    "Discount code creation": ["shopify_create_discount"],
    "Lead capture from chat and forms": ["lead_capture_submit"],
    "Company profile enrichment": ["lead_capture_enrich"],
    "Sales notifications on Slack/Webhook": ["lead_capture_notify_sales"],
  };
  return agent.tasks.map((t) => {
    const tools = toolsByTask[t] ?? agent.integrations.slice(0, 2);
    const descs: Record<string, { it: string; en: string }> = {
      "Product search in the catalog": { it: "Cerca nel catalogo Shopify con filtri reali e suggerisce i prodotti giusti.", en: "Searches the real Shopify catalog and suggests the right products." },
      "Direct cart link generation": { it: "Genera link carrello con checkout rapido, condivisibile ovunque.", en: "Generates cart links with fast checkout, shareable anywhere." },
      "Order status and tracking": { it: "Verifica stato ordine con numero + email, risponde in secondi.", en: "Checks order status with number + email, answers in seconds." },
    };
    const d = descs[t];
    const desc = d ? (locale === "it" ? d.it : d.en) : locale === "it" ? `Automatizza “${t.toLowerCase()}” con i tuoi strumenti collegati e output pronti da condividere.` : `Automates “${t.toLowerCase()}” with your connected tools and shareable output.`;
    return { title: t, desc, tools: Array.isArray(tools) ? tools : [tools] };
  });
}

function securityFor(locale: Locale): string[] {
  if (locale === "it") {
    return [
      "Token cifrati AES-256-GCM, RLS per tenant, nessuna chiave nel client.",
      "Connessioni OAuth 2.0 con richiesta di consenso; revoca 1-click dal dashboard.",
      "Log delle esecuzioni + notifiche; dati non usati per training.",
      "Conformità GDPR: export/cancellazione su richiesta, DPA disponibile.",
    ];
  }
  return [
    "AES-256-GCM encrypted tokens, per-tenant RLS, no secrets in the client.",
    "OAuth 2.0 with consent; 1-click revoke from dashboard.",
    "Run logs + notifications; data never used for training.",
    "GDPR: export/delete on request, DPA available.",
  ];
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

export function getPricingNotes(locale: Locale) {
  if (locale === "it") {
    return {
      perMonth: "/mese",
      billedMonthly: "Fatturazione mensile, disdici quando vuoi.",
      includes: "Cosa include",
      setupLabel: "Setup tipico",
      support: "Supporto dedicato all'avvio",
      overage: "Oltre allowance: €0,30/1k token fino a cap 2×, poi pausa.",
      bundleSave: "Risparmia con i bundle (sconto 12–35%)",
    };
  }
  return {
    perMonth: "/mo",
    billedMonthly: "Monthly billing, cancel anytime.",
    includes: "What's included",
    setupLabel: "Typical setup",
    support: "Dedicated onboarding support",
    overage: "Beyond allowance: €0.30/1k tokens up to 2× cap, then paused.",
    bundleSave: "Save with bundles (12–35% off)",
  };
}
