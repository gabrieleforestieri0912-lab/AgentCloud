/**
 * Catalogo statico delle Competenze (Skill) e dei Plugin.
 *
 * Perché esiste accanto al DB (`supabase/schema-skills.sql` +
 * `supabase/seed-skills.sql`): le tabelle `skills`/`plugins` sono la fonte di
 * verità quando sono state migrate, ma il sito deve comunque mostrare il
 * catalogo su un ambiente dove la migration non è ancora stata applicata.
 * `src/lib/skills/data.ts` prova Supabase e ricade su questo modulo.
 *
 * Perché gli slug qui sono quelli REALI del marketplace (`src/lib/agents.ts`) e
 * del catalogo integrazioni (`src/lib/integrations.ts`): le card devono poter
 * linkare `/agents/<slug>` e mostrare il logo del brand senza traduzione
 * intermedia. La disponibilità di un'integrazione non è scritta qui ma derivata
 * da `INTEGRATIONS` (un solo interruttore `available` per tutto il sito).
 */

import { INTEGRATIONS } from "@/lib/integrations";

export type SkillRisk = "low" | "medium" | "high";

export type SkillEntry = {
  slug: string;
  name: string;
  /** Cosa fa e QUANDO usarla: è il testo che l'agente legge per decidere. */
  description: string;
  risk: SkillRisk;
  permissions: string[];
  /** Quando NON usarla (anti-trigger espliciti). */
  whenNot: string[];
  procedure: string[];
  rules: string[];
  output: string;
  /** Esempio di richiesta in chat che attiva la skill. */
  example: string;
};

export type PluginAgent = {
  slug: string;
  fit: "primary" | "secondary";
  rationale: string;
};

export type PluginIntegration = {
  /** Brand slug del catalogo integrazioni (usato da BrandLogo). */
  brand: string;
  status: "required" | "optional";
  rationale: string;
};

export type SkillPlugin = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  icon: string;
  priceTier: "free" | "included" | "addon";
  version: string;
  skills: SkillEntry[];
  agents: PluginAgent[];
  integrations: PluginIntegration[];
  /**
   * Changelog mostrato nella pagina del plugin.
   *
   * Vive qui e non come colonna nel DB: cambia una volta per versione, si
   * scrive insieme al resto del plugin e non viene mai filtrato per account.
   * Il DB resta la fonte dei metadati, questa è la parte di contenuto.
   */
  changelog: { version: string; date: string; changes: string[] }[];
};

/* ------------------------------------------------------------------ *
 * 7.1 E-commerce Operations
 * ------------------------------------------------------------------ */
const ECOMMERCE: SkillPlugin = {
  slug: "ecommerce-operations",
  name: "Operazioni E-commerce",
  tagline: "Gestisci catalogo, ordini e magazzino",
  description:
    "Suite completa per gestire le operazioni e-commerce: ricerca prodotti con link carrello, stato ordine e tracking, gestione sconti, allerta scorte con previsione di riordino e riepilogo vendite.",
  category: "ecommerce",
  icon: "🛒",
  priceTier: "included",
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [
        "Prima versione del plugin: 5 competenze operative (catalogo, tracking ordine, sconti, scorte, riepilogo vendite).",
        "WooCommerce e Google Sheets già disponibili; Shopify e PayPal indicati come in arrivo, mai richiesti.",
      ],
    },
  ],
  skills: [
    {
      slug: "catalog-search",
      name: "Ricerca Catalogo",
      description:
        "Cerca prodotti nel catalogo e genera link carrello. Usare quando il cliente chiede informazioni su prodotti, disponibilità o prezzi.",
      risk: "low",
      permissions: ["read:products"],
      whenNot: [
        "Il cliente chiede informazioni su un ordine già inviato (usa Tracking Ordine)",
        "Il catalogo collegato non è disponibile: non inventare prezzi, proponi il link al negozio",
      ],
      procedure: [
        "Chiedi o ricava dal contesto: nome prodotto, variante, quantità, budget",
        "Cerca nel catalogo collegato con i termini esatti del cliente",
        "Se ci sono varianti, proponi massimo 3 con differenza di prezzo chiara",
        "Compila l'output: nome, SKU, prezzo, disponibilità, link carrello",
        "Aggiungi sempre la disclaimer: prezzi e disponibilità soggetti a verifica in checkout",
      ],
      rules: [
        "Non inventare mai prezzi, SKU o disponibilità: se il dato manca, dillo",
        "Non applicare sconti: la gestione sconti è una skill separata con approvazione",
        "Tono: professionale e diretto, frasi brevi",
      ],
      output:
        "Tabella prodotto (nome, SKU, prezzo, disponibilità) + link carrello + nota di verifica checkout",
      example: "Che mi serve per il compleanno di Marta, budget 60 euro",
    },
    {
      slug: "order-tracking",
      name: "Tracking Ordine",
      description:
        "Verifica lo stato di un ordine e fornisce il tracking. Usare per richieste tipo 'dove è il mio ordine' o aggiornamenti sulla spedizione.",
      risk: "low",
      permissions: ["read:orders"],
      whenNot: [
        "Non ci sono ordini collegati: chiedi numero ordine o email di acquisto",
        "Il cliente chiede un reso o un rimborso (non è tracking: porta a Support Agent)",
      ],
      procedure: [
        "Identifica l'ordine: numero ordine, email o nome + cognome",
        "Se manca l'identificativo, chiedi e non procedere",
        "Leggi stato, data prevista, codice tracking e corriere",
        "Riporta la data prevista di consegna e l'ultimo evento di tracking",
        "Se la consegna è in ritardo, proponi il percorso di rimborso/rimessa come opzione",
      ],
      rules: [
        "Non inventare codici di tracking né date di consegna",
        "Non promettere rimborsi: proposta e poi approvazione umana",
        "Dati personali minimi nel riepilogo (nome, città, non indirizzo completo)",
      ],
      output:
        "Stato ordine in una riga + tabella tracking (evento, data) + data prevista consegna",
      example: "Dove è finito il mio ordine #1042?",
    },
    {
      slug: "discount-management",
      name: "Gestione Sconti",
      description:
        "Gestisce codici sconto e promozioni. Usare su richieste di sconto o promozioni; richiede approvazione per sconti superiori al 20%.",
      risk: "medium",
      permissions: ["read:orders", "update:orders"],
      whenNot: [
        "Sconto richiesto oltre il 20%: passa da approvazione umana",
        "Promozione con impatto su prezzi di listino: non applicare, segnala al gestore",
      ],
      procedure: [
        "Verifica lo sconto richiesto e la sua entità percentuale",
        "Controlla che non ci siano promozioni già attive sulla stessa fascia prodotti",
        "Se ≤ 20%: applicalo e comunica codice e validità",
        "Se > 20%: prepara la bozza, spiega l'impatto e chiedi approvazione",
        "Registra sempre lo sconto applicato con data e motivo commerciale",
      ],
      rules: [
        "Soglia di approvazione: 20%. Oltre, mai senza conferma esplicita",
        "Non inventare codici promozionali esistenti",
        "Non combinare codici se il negozio li esclude (verifica le regole)",
      ],
      output:
        "Codice sconto + percentuale + validità + conferma di applicazione, oppure richiesta di approvazione",
      example: "Il cliente storico chiede il 25%: glielo concediamo?",
    },
    {
      slug: "stock-alert",
      name: "Allerta Scorte",
      description:
        "Monitora i livelli di scorte e genera previsioni di riordino. Usare per allertare quando un prodotto scende sotto la soglia minima.",
      risk: "low",
      permissions: ["read:inventory"],
      whenNot: [
        "Non è collegato alcun gestionale di magazzino: usa Sheets/Airtable se disponibili",
        "Richiesta di riordino concreto verso un fornitore: passa a Inventory & Logistics",
      ],
      procedure: [
        "Leggi i livelli di stock dei prodotti venduti nell'ultimo periodo",
        "Confronta con la soglia minima concordata",
        "Calcola la previsione di riordino: vendita media giornaliera × giorni di copertura",
        "Segnala i prodotti sotto soglia con data stimata di esaurimento",
        "Notifica il team (Slack) solo per le scorte critiche",
      ],
      rules: [
        "Non modificare i livelli di magazzino: questa skill solo legge e avvisa",
        "Stima esplicita: indica sempre il metodo (media 30 giorni)",
        "Soglia minima: se non definita, chiedi prima di notificare",
      ],
      output:
        "Elenco prodotti sotto soglia: nome, stock, soglia, esaurimento stimato, qty suggerita di riordino",
      example: "Cosa sta per esaurire? Fammi la lista per il riordino",
    },
    {
      slug: "sales-summary",
      name: "Riepilogo Vendite",
      description:
        "Genera un report vendite giornaliero, settimanale o mensile con metriche chiave e variazione sul periodo precedente.",
      risk: "low",
      permissions: ["read:orders", "read:products"],
      whenNot: ["Richiesta di analisi strategica o di decisioni: usa Report & Decisioni"],
      procedure: [
        "Determina il periodo (oggi, 7 giorni, 30 giorni) e allinea il periodo di confronto",
        "Calcola: ordini, fatturato, scontrino medio, tasso di conversione se disponibile",
        "Calcola la variazione percentuale sul periodo precedente",
        "Evidenzia i 3 prodotti e le 3 categorie con la variazione più rilevante",
        "Chiudi con 1-3 azioni suggerite, non con una lista di numeri",
      ],
      rules: [
        "Sempres citare il periodo esatto e la fonte dei dati",
        "Nessuna cifra non calcolata: se il dato manca, scrivi 'non disponibile'",
        "Non fare previsioni di fatturato senza storico sufficiente",
      ],
      output:
        "Tabella KPI (periodo corrente vs precedente, variazione) + 3 highlight + 3 azioni",
      example: "Quanto abbiamo venduto questa settimana rispetto a quella scorsa?",
    },
  ],
  agents: [
    { slug: "shopify-agent", fit: "primary", rationale: "Shopify Agent gestisce nativamente catalogo e ordini" },
    { slug: "inventory-logistics", fit: "primary", rationale: "Inventory & Logistics gestisce magazzino e scorte" },
    { slug: "finance-manager", fit: "secondary", rationale: "Finance Manager analizza le metriche vendite" },
    { slug: "reviews-agent", fit: "secondary", rationale: "Reviews & Reputation usa i dati ordini per le recensioni" },
  ],
  integrations: [
    { brand: "woocommerce", status: "required", rationale: "WooCommerce fornisce catalogo e ordini" },
    { brand: "shopify", status: "required", rationale: "Shopify gestisce catalogo e ordini nativi" },
    { brand: "googlesheets", status: "optional", rationale: "Sheets fa da magazzino leggero" },
    { brand: "airtable", status: "optional", rationale: "Airtable gestisce l'inventario" },
    { brand: "slack", status: "optional", rationale: "Slack notifica le scorte critiche" },
    { brand: "gmail", status: "optional", rationale: "Gmail invia gli aggiornamenti ordine" },
    { brand: "paypal", status: "optional", rationale: "PayPal processa i pagamenti" },
  ],
};

/* ------------------------------------------------------------------ *
 * 7.2 Lead & Vendite
 * ------------------------------------------------------------------ */
const LEAD_SALES: SkillPlugin = {
  slug: "lead-sales",
  name: "Lead & Vendite",
  tagline: "Cattura, qualifica e converte lead",
  description:
    "Sistema per il lead management: cattura e validazione dei contatti, arricchimento del profilo, scoring High/Medium/Low, notifica al team, sequenza di follow-up e aggiornamento della pipeline.",
  category: "sales",
  icon: "🎯",
  priceTier: "included",
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [
        "Prima versione: cattura, arricchimento, scoring, notifica team e sequenza di follow-up.",
        "HubSpot, Slack, Gmail, Sheets e Calendar già disponibili; WhatsApp, Calendly e Mailchimp in arrivo.",
      ],
    },
  ],
  skills: [
    {
      slug: "lead-capture",
      name: "Cattura Lead",
      description:
        "Cattura e valida nuovi lead da varie fonti. Usare quando arriva una richiesta di contatto, una richiesta di preventivo o un form da compilare.",
      risk: "low",
      permissions: ["read:contacts", "create:contacts"],
      whenNot: [
        "Il contatto è già in CRM: aggiorna (Arricchimento Profilo), non duplicare",
        "Richiesta che è in realtà assistenza post-vendita: passa a Support Agent",
      ],
      procedure: [
        "Estrai i dati disponibili: nome, email, telefono, azienda, fonte",
        "Valida i dati: email formalmente valida, telefono plausibile, CAP/NAP coerenti",
        "Chiedi solo i campi mancanti, in un unico messaggio breve",
        "Registra il lead in CRM con fonte e data",
        "Restituisci conferma di acquisizione e prossimo passo",
      ],
      rules: [
        "Consenso: registra sempre l'origine del dato e la base del consenso",
        "Non comprare né arricchisci liste: solo dati forniti dal contatto",
        "GDPR: ritenzione e basi legali nei casi di lead B2B vanno verificate prima dell'export",
      ],
      output:
        "Scheda lead (nome, azienda, email, telefono, fonte, campi mancanti) + conferma CRM",
      example: "Sono Marco Bianchi di Bianchi Srl, vorrei un preventivo per 300 sedie",
    },
    {
      slug: "lead-enrichment",
      name: "Arricchimento Profilo",
      description:
        "Arricchisce il profilo del lead con dati aziendali e storicizza le interazioni. Usare dopo la cattura per completare la scheda.",
      risk: "low",
      permissions: ["read:contacts", "update:contacts"],
      whenNot: [
        "Dati aziendali non disponibili nelle fonti collegate: chiedi, non indovinare",
        "Richiesta di scraping massivo: fuori dal principio di minimo privilegio",
      ],
      procedure: [
        "Leggi la scheda lead attuale e individua i campi vuoti",
        "Completa solo con dati presenti nelle fonti collegate (CRM, Sheets, Note)",
        "Aggiungi una nota temporale per ogni interazione",
        "Segnala i campi ancora sconosciuti, non riempirli con supposizioni",
        "Aggiorna la scheda CRM",
      ],
      rules: [
        "Nessun dato inventato: fonti o 'non disponibile'",
        "Non usare dati personali oltre necessari (nome, ruolo, azienda)",
        "Ogni aggiunta deve avere data e fonte",
      ],
      output: "Scheda lead aggiornata + elenco campi ancora mancanti + fonti usate",
      example: "Completa la scheda di Marco Bianchi con quello che sai",
    },
    {
      slug: "lead-scoring",
      name: "Scoring Lead",
      description:
        "Assegna un punteggio High/Medium/Low al lead basandosi su engagement, budget e tempistiche. Usare per decidere priorità di follow-up.",
      risk: "low",
      permissions: ["read:contacts"],
      whenNot: [
        "Nessun dato storico di interazione: assegna 'Low (dati insufficienti)'",
        "Decisione commerciale definitiva: lo scoring è un supporto, non un verdetto",
      ],
      procedure: [
        "Raccogli i segnali: visite, email aperte, richieste, ruolo, dimensione azienda",
        "Valuta tre dimensioni: engagement (attività), budget (dimensione/preferenze), timeline (urgenza)",
        "Calcola il punteggio 0-100 e la fascia: High 70+, Medium 40-69, Low <40",
        "Elenca i 3 segnali che hanno pesato di più, con i motivi",
        "Proponi l'azione successiva coerente con la fascia",
      ],
      rules: [
        "Il punteggio è una stima dichiarata: mostra sempre i segnali che lo compongono",
        "Nessun dato protetto (salute, religione, orientamento) entra nello scoring",
        "Ricalcola a ogni interazione: lo scoring non è un'etichetta fissa",
      ],
      output: "Fascia + punteggio + 3 segnali principali + azione successiva consigliata",
      example: "Come classifichiamo Bianchi Srl? Hanno chiesto tre preventivi",
    },
    {
      slug: "team-notification",
      name: "Notifica Team",
      description:
        "Notifica il team vendite su un lead hot con sintesi e azioni suggerite. Usare quando un lead supera la soglia High.",
      risk: "medium",
      permissions: ["send:notifications"],
      whenNot: [
        "Lead non è High: non disturbare il team, si legge nel CRM",
        "Canale Slack non collegato: proponi email o rimanda",
      ],
      procedure: [
        "Verifica che il lead sia High e che il canale sia collegato",
        "Componi il messaggio in massimo 6 righe: chi, cosa chiede, valore, azione, scadenza",
        "Inserisci un link diretto alla scheda CRM",
        "Invia la notifica e conferma l'avvenuta notifica",
        "Registra la notifica sulla scheda lead",
      ],
      rules: [
        "Nessun dato personale sensibile nel messaggio di notifica",
        "Non notificare più di una volta lo stesso lead senza un evento nuovo",
        "Il messaggio deve essere autosufficiente: chi legge solo Slack deve capire",
      ],
      output: "Messaggio di notifica inviato (anteprima 6 righe) + esito",
      example: "Avvisa il team: Bianchi Srl è lead hot, preventivo da 12k",
    },
    {
      slug: "followup-sequence",
      name: "Sequenza Follow-up",
      description:
        "Crea e gestisce sequenze di follow-up personalizzate basate sul punteggio del lead. Usare per chiudere trattative in sospeso.",
      risk: "medium",
      permissions: ["read:contacts", "update:contacts", "send:email"],
      whenNot: [
        "Il lead ha risposto o ha detto 'non interessato': interrompi la sequenza",
        "Sequenza oltre 5 email: richiedi approvazione esplicita",
      ],
      procedure: [
        "Verifica lo stato della trattativa e l'ultimo contatto",
        "Definisci i passi: canale, argomento, data, obiettivo per ogni passo",
        "Scrivi ogni email breve (max 120 parole), tono dell'azienda, un solo CTA",
        "Programma la sequenza e registra la pianificazione sulla scheda",
        "Ogni risposta del lead interrompe automaticamente i passi successivi",
      ],
      rules: [
        "Massimo 5 email per sequenza, distanza minima 2 giorni",
        "Opt-out sempre presente ('se non desideri più ricevere, rispondi ANNULLA')",
        "Nessuna promessa commerciale non confermata internamente",
      ],
      output:
        "Tabella sequenza (passo, data, canale, oggetto email, obiettivo) + testi in bozza",
      example: "Prepara il follow-up per Bianchi: non risponde da 9 giorni",
    },
  ],
  agents: [
    { slug: "lead-capture", fit: "primary", rationale: "Lead Capture è dedicato a cattura e gestione lead" },
    { slug: "crm-agent", fit: "primary", rationale: "CRM Agent gestisce pipeline e lead qualificati" },
    { slug: "whatsapp-agent", fit: "secondary", rationale: "WhatsApp Agent segue i lead via chat" },
    { slug: "calendar-booking", fit: "secondary", rationale: "Calendar Booking chiude il lead con un appuntamento" },
  ],
  integrations: [
    { brand: "hubspot", status: "required", rationale: "HubSpot è la fonte di verità dei contatti" },
    { brand: "slack", status: "optional", rationale: "Slack avvisa in tempo reale sui lead hot" },
    { brand: "gmail", status: "optional", rationale: "Gmail invia il follow-up email" },
    { brand: "googlesheets", status: "optional", rationale: "Sheets traccia la pipeline dei lead" },
    { brand: "googlecalendar", status: "optional", rationale: "Calendar prenota le follow-up call" },
    { brand: "whatsapp", status: "optional", rationale: "WhatsApp segue il lead via chat" },
    { brand: "calendly", status: "optional", rationale: "Calendly prenota il meeting" },
    { brand: "mailchimp", status: "optional", rationale: "Mailchimp gestisce le campagne email" },
  ],
};

/* ------------------------------------------------------------------ *
 * 7.3 Assistenza Clienti & Reputazione
 * ------------------------------------------------------------------ */
const SUPPORT: SkillPlugin = {
  slug: "support-reputation",
  name: "Assistenza & Reputazione",
  tagline: "Supporto clienti e gestione recensioni",
  description:
    "Suite per il customer service: risposta dalla knowledge base con escalation, classificazione dell'urgenza dei ticket, bozza di risposta alle recensioni con analisi del sentiment, gestione reclami e tono di voce del brand.",
  category: "support",
  icon: "💬",
  priceTier: "included",
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [
        "Prima versione: risposta da knowledge base, urgenza ticket, bozza recensione e gestione reclami.",
        "La gestione reclami è ad alto rischio: ogni soluzione proposta va approvata prima dell'invio.",
      ],
    },
  ],
  skills: [
    {
      slug: "kb-response",
      name: "Risposta Knowledge Base",
      description:
        "Risponde alle domande dei clienti basandosi sulla knowledge base aziendale. Usare quando la domanda ha una risposta documentata; scala se incerto.",
      risk: "low",
      permissions: ["read:kb"],
      whenNot: [
        "La knowledge base non contiene la risposta: escala, non improvvisare",
        "Richiesta legale, medica o di sicurezza: escalation immediata a un umano",
      ],
      procedure: [
        " Cerca nella knowledge base (Notion/Drive) i documenti pertinenti",
        "Verifica che il documento copra davvero il caso del cliente",
        "Rispondi in linguaggio semplice, con i passi numerati",
        "Cita la fonte del documento usato",
        "Se la copertura è parziale, dillo e proponi l'escalation",
      ],
      rules: [
        "Mai inventare una procedura: se non è documentata, non esiste",
        "Tono: empatico e concreto, massimo 150 parole",
        "Mai condividere documenti interni sensibili col cliente: solo la risposta",
      ],
      output:
        "Risposta al cliente (max 150 parole) + documento fonte + esito ricerca (completa/parziale)",
      example: "Come si sostituisce un filtro del climatizzatore?",
    },
    {
      slug: "ticket-urgency",
      name: "Classificazione Urgenza",
      description:
        "Classifica i ticket per urgenza (critical, high, medium, low) in base a SLA e impatto sul cliente. Usare a ogni nuovo ticket.",
      risk: "low",
      permissions: ["read:tickets"],
      whenNot: [
        "Il ticket riguarda dati personali cancellati o violazioni di sicurezza: sempre critical",
        "Non è chiaro se il cliente è un cliente pagante: chiedi prima di classificare",
      ],
      procedure: [
        "Leggi il ticket e identifica impatto, cliente e SLA applicabile",
        "Classifica: critical (servizio fermo/sicurezza/SLA rotto), high (blocco operativo), medium (richiesta con workaround), low (informazione)",
        "Assegna la prima risposta attesa secondo lo SLA",
        "Indica il motivo in una riga",
        "Per critical e high, notifica subito il team",
      ],
      rules: [
        "Gli SLA sono quelli aziendali: se non definiti, dichiaralo e usa il default",
        "Non chiudere mai un ticket critical senza risoluzione verificata",
        "La classificazione non è definitiva: può essere rivista con il cliente",
      ],
      output: "Ticket + fascia urgenza + SLA prima risposta + motivo + notifica (se alta)",
      example: "Ho 12 ticket aperti da ieri, dimmi quali gestiamo per primi",
    },
    {
      slug: "review-draft",
      name: "Bozza Recensione",
      description:
        "Genera la bozza di risposta a una recensione analizzando il sentiment. Usare per rispondere a recensioni positive o negative.",
      risk: "medium",
      permissions: ["read:reviews", "update:reviews"],
      whenNot: [
        "Recensione che accusa di dati personali o di frode: escalation prima di rispondere",
        "Richiesta di recensione falsa o di rimozione ingiustificata: mai",
      ],
      procedure: [
        "Analizza il sentiment: positivo, neutro, negativo (e la gravità se negativo)",
        "Per positivo: ringrazia nominalmente e invita al riacquisto",
        "Per negativo: riconosci il problema, scusa senza dare colpa, proponi il contatto diretto, non discutere in pubblico",
        "Mantieni il tono di voce del brand e non citare dati personali del cliente",
        "Prepara la bozza: la pubblicazione resta un'azione che richiede approvazione",
      ],
      rules: [
        "Mai rispondere in modo difensivo o sarcastico",
        "Massimo 100 parole, senza promesse economiche",
        "Nessun dato personale oltre il nome già pubblicato",
      ],
      output: "Bozza risposta + sentiment rilevato + eventuale segnalazione di escalation",
      example: "Questa recensione è negativa sulla consegna, rispondiamo?",
    },
    {
      slug: "complaint-handling",
      name: "Gestione Reclami",
      description:
        "Gestisce i reclami con procedura standard, verifica la fattibilità della soluzione e mantiene il registro. Usare sui reclami formali.",
      risk: "high",
      permissions: ["read:tickets", "update:tickets", "send:email"],
      whenNot: [
        "Reclamo che richiede rimborso o penale: proposta e approvazione umana obbligatoria",
        "Reclamo con dati personali: verifica GDPR prima di condividere qualsiasi documento",
      ],
      procedure: [
        "Raccogli i fatti: cosa è successo, quando, quale ordine, quale impatto",
        "Verifica la fattibilità della soluzione con i dati reali (ordini, spedizioni, policy)",
        "Proponi la soluzione: una sola, concreta, con tempi",
        "Registra il reclamo con esito e data di chiusura",
        "Se l'invio della risposta contiene impegni o rimborsi, chiedi approvazione",
      ],
      rules: [
        "Azione ad alto rischio: la risposta al reclamo va approvata prima dell'invio",
        "Riconoscere un errore è obbligo di buona fede: non negare l'evidenza",
        "Non offrire risarcimenti non previsti dalla policy aziendale",
      ],
      output:
        "Registro reclamo (fatti, soluzione proposta, tempi, esito) + bozza risposta in attesa di approvazione",
      example: "Cliente reclamo ordine #331: arrivato rotto e nessuna risposta da 5 giorni",
    },
  ],
  agents: [
    { slug: "support-agent", fit: "primary", rationale: "Support Agent gestisce ticket e knowledge base" },
    { slug: "reviews-agent", fit: "primary", rationale: "Reviews & Reputation gestisce recensioni e reputazione" },
    { slug: "whatsapp-agent", fit: "secondary", rationale: "WhatsApp Agent supporta i clienti via chat" },
    { slug: "email-manager", fit: "secondary", rationale: "Email Manager gestisce i ticket via email" },
  ],
  integrations: [
    { brand: "slack", status: "required", rationale: "Slack gestisce l'escalation umana" },
    { brand: "notion", status: "required", rationale: "Notion è la knowledge base (RAG)" },
    { brand: "googledrive", status: "optional", rationale: "Drive ospita i documenti della knowledge base" },
    { brand: "gmail", status: "optional", rationale: "Gmail gestisce i ticket via email" },
    { brand: "googlesheets", status: "optional", rationale: "Sheets traccia ticket e SLA" },
    { brand: "zendesk", status: "optional", rationale: "Zendesk gestisce i ticket avanzati" },
    { brand: "whatsapp", status: "optional", rationale: "WhatsApp supporta i clienti in chat" },
    { brand: "googlechat", status: "optional", rationale: "Google Chat gestisce il supporto interno" },
  ],
};

/* ------------------------------------------------------------------ *
 * 7.4 Prenotazioni & Agenda
 * ------------------------------------------------------------------ */
const BOOKINGS: SkillPlugin = {
  slug: "bookings-calendar",
  name: "Prenotazioni & Agenda",
  tagline: "Gestisci appuntamenti e calendario",
  description:
    "Sistema per la gestione dell'agenda: verifica della disponibilità e proposta di slot, prenotazione con link video, promemoria e gestione dei no-show, riprogrammazioni e cancellazioni, pianificazione della giornata e blocchi di deep work.",
  category: "productivity",
  icon: "📅",
  priceTier: "included",
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [
        "Prima versione: disponibilità, prenotazione, promemoria no-show, riprogrammazione e pianificazione giornata.",
        "Google Calendar e Gmail già disponibili; Google Meet, Outlook, Calendly e Tasks in arrivo.",
      ],
    },
  ],
  skills: [
    {
      slug: "availability-check",
      name: "Verifica Disponibilità",
      description:
        "Verifica la disponibilità del calendario e propone slot ottimali rispettando le preferenze. Usare all'inizio di ogni richiesta di appuntamento.",
      risk: "low",
      permissions: ["read:calendar"],
      whenNot: [
        "Richiesta urgente per oggi stesso: proponi comunque, segnalando i vincoli",
        "Il calendario non è collegato: proponi gli orari e chiedi conferma manuale",
      ],
      procedure: [
        "Leggi gli impegni nel periodo richiesto",
        "Applica i vincoli: orario di lavoro, durata minima, pause, fuso orario del cliente",
        "Proponi massimo 3 slot, con data, ora e durata espliciti",
        "Indica il fuso orario per ogni slot",
        "Chiedi quale preferisce; non prenotare ancora",
      ],
      rules: [
        "Mostra sempre il fuso orario: gli errori di fuso sono la causa #1 di no-show",
        "Massimo 3 proposte, non un menu infinito",
        "Non proporre slot fuori orario di lavoro senza segnalarlo",
      ],
      output: "Elenco di massimo 3 slot (data, ora, durata, fuso) + durata standard del servizio",
      example: "Vorrei una call giovedì, durata 45 minuti",
    },
    {
      slug: "booking-creation",
      name: "Creazione Prenotazione",
      description:
        "Crea l'appuntamento nel calendario con link video e invia la conferma. Usare dopo che il cliente ha scelto lo slot.",
      risk: "medium",
      permissions: ["read:calendar", "create:events", "send:email"],
      whenNot: [
        "Slot non ancora confermato dal cliente: non creare l'evento",
        "Richiesta di modifica di un appuntamento esistente: usa Riprogrammazione/Cancellazione",
      ],
      procedure: [
        "Verifica che lo slot sia ancora libero prima di scriverlo",
        "Crea l'evento con titolo comprensibile, orario, durata, partecipanti",
        "Aggiungi il link video se l'integrazione è collegata, altrimenti indicala come da aggiungere",
        "Invia la conferma con: data, ora, fuso, link, cosa portare",
        "Registra l'evento per i promemoria",
      ],
      rules: [
        "Titolo evento leggibile dal cliente, non codici interni",
        "Conferma sempre entro 2 minuti dalla conferma del cliente",
        "Non condividere i dettagli di altri partecipanti",
      ],
      output:
        "Appuntamento creato (data, ora, durata, link video) + conferma inviata + stato promemoria",
      example: "Perfetto, giovedì alle 15:00 va bene per me",
    },
    {
      slug: "reminder-no-show",
      name: "Promemoria No-show",
      description:
        "Gestisce i promemoria pre-appuntamento e il follow-up in caso di no-show. Usare per tutti gli appuntamenti confermati.",
      risk: "low",
      permissions: ["read:calendar", "send:email"],
      whenNot: [
        "Appuntamento non ancora confermato: niente promemoria",
        "C reminder già inviato: non duplicare",
      ],
      procedure: [
        "Prepara il promemoria: data, ora, fuso, link, obiettivo in 2 righe",
        "Invia 24h prima; se la richiesta è entro 24h, invialo subito",
        "Se l'appuntamento passa senza presenza, invia un follow-up gentile entro 2 ore",
        "Proponi una nuova data con 2 slot alternativi",
        "Registra l'evento (promemoria inviato / no-show)",
      ],
      rules: [
        "Un solo promemoria per appuntamento, 24h prima",
        "Tono del follow-up: nessun rimprovo, massimo 2 righe",
        "Non dedurre assenze definitive da un ritardo di pochi minuti",
      ],
      output: "Promemoria inviato (orario) o follow-up no-show (orario) + 2 slot alternativi",
      example: "Il cliente delle 15 non si è connesso, cosa gli scriviamo?",
    },
    {
      slug: "reschedule-cancel",
      name: "Riprogrammazione/Cancellazione",
      description:
        "Gestisce richieste di modifica o cancellazione applicando le politiche aziendali. Usare quando un cliente chiede di spostare o annullare.",
      risk: "medium",
      permissions: ["read:calendar", "update:events", "send:email"],
      whenNot: [
        "Cancellazione con penale oltre la policy: proposta e approvazione umana",
        "Richiesta di terzi per un appuntamento di altri: verificare che siano autorizzati",
      ],
      procedure: [
        "Leggi l'appuntamento e la policy aziendale (es. 24h di preavviso)",
        "Verifica se la richiesta rispetta i termini: no penale o penale da applicare",
        "Se è una modifica, proponi 2 slot dalla stessa logica di Verifica Disponibilità",
        "Aggiorna o annulla l'evento",
        "Invia conferma con la nuova data o con la cancellazione e le eventuali penali",
      ],
      rules: [
        "Le penali si citano dalla policy scritta: mai improvvisate",
        "Cancellazione oltre soglia: sempre conferma umana",
        "Notifica le parti interne solo se la policy lo prevede",
      ],
      output:
        "Esito (spostato/cancellato) + nuova data se riprogrammato + penale applicata (se presente) + conferma inviata",
      example: "Devo spostare l'appuntamento di martedì a giovedì",
    },
    {
      slug: "day-planning",
      name: "Pianificazione Giornata",
      description:
        "Organizza la giornata con blocchi di deep work e gestisce le priorità. Usare la mattina o su richiesta di piano giornaliero.",
      risk: "low",
      permissions: ["read:calendar", "read:tasks"],
      whenNot: [
        "Giornata già piena di impegni fissi: proponi comunque, spostando solo se flessibili",
        "Richiesta di priorità di settimana/sprint: usa Progetti & Task",
      ],
      procedure: [
        "Leggi gli impegni fissi della giornata",
        "Identifica 2-3 task ad alta priorità e d'importanza strategica",
        "Proponi 1-2 blocchi di deep work da 90 minuti in fasce libere",
        "Inserisci buffer da 15 minuti tra i blocchi",
        "Chiudi con l'elenco delle cose che NON faranno oggi, per evitare il senso di colpa",
      ],
      rules: [
        "Massimo 3 task 'del giorno': la lista lunga genera solo ansia",
        "Deep work ≥ 60 minuti: sotto quella soglia non è deep work",
        "Non spostare mai riunioni con altri senza dire che lo stai facendo",
      ],
      output:
        "Piano giornata: task del giorno (3) + blocchi deep work con orario + cosa resta in lista",
      example: "Organizza la mia giornata di giovedì",
    },
  ],
  agents: [
    { slug: "calendar-booking", fit: "primary", rationale: "Calendar Booking gestisce appuntamenti e disponibilità" },
    { slug: "personal-assistant", fit: "primary", rationale: "Personal Assistant pianifica agenda e task" },
    { slug: "hr-recruiter", fit: "secondary", rationale: "HR & Recruiter pianifica i colloqui" },
    { slug: "whatsapp-agent", fit: "secondary", rationale: "WhatsApp Agent conferma gli appuntamenti via chat" },
  ],
  integrations: [
    { brand: "googlecalendar", status: "required", rationale: "Calendar è indispensabile per le prenotazioni" },
    { brand: "gmail", status: "optional", rationale: "Gmail invia conferme e promemoria" },
    { brand: "notion", status: "optional", rationale: "Notion tiene note dei meeting e dei task" },
    { brand: "googlemeet", status: "optional", rationale: "Google Meet genera il link video" },
    { brand: "microsoftoutlook", status: "optional", rationale: "Outlook amplia la copertura del calendario" },
    { brand: "calendly", status: "optional", rationale: "Calendly semplifica la prenotazione" },
    { brand: "googletasks", status: "optional", rationale: "Google Tasks sincronizza i task" },
  ],
};

/* ------------------------------------------------------------------ *
 * 7.5 Preventivi, Fatture & Finanza
 * ------------------------------------------------------------------ */
const QUOTES: SkillPlugin = {
  slug: "quotes-finance",
  name: "Preventivi & Finanza",
  tagline: "Genera preventivi e gestisci contabilità",
  description:
    "Suite finanziaria: raccolta dei requisiti e calcolo del preventivo con IVA, generazione del documento formale, riconciliazione di entrate e uscite, scadenzario fiscale con solleciti ed estrazione dati dalle fatture.",
  category: "finance",
  icon: "💰",
  priceTier: "included",
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [
        "Prima versione: calcolo preventivo con IVA 22%, documento formale, riconciliazione e scadenzario fiscale.",
        "Riconciliazione e solleciti sono ad alto rischio: le registrazioni e gli invii chiedono approvazione.",
      ],
    },
  ],
  skills: [
    {
      slug: "quote-calculation",
      name: "Calcolo Preventivo",
      description:
        "Raccoglie i requisiti e calcola il preventivo con imponibile, IVA 22% e sconti. Usare quando il cliente chiede un preventivo.",
      risk: "medium",
      permissions: ["read:products", "read:services"],
      whenNot: [
        "Preventivi con aliquota IVA diversa: chiedi e usa l'aliquota indicata",
        "Listino prezzi non disponibile: chiedi i prezzi, non inventarli",
      ],
      procedure: [
        "Raccogli i requisiti: cosa serve, quantità, tempi, esigenze particolari",
        "Applica i prezzi di listino alle voci, una riga per voce",
        "Calcola imponibile = Σ voci − sconti; IVA = imponibile × 22%; totale = imponibile + IVA",
        "Mostra ogni riga con quantità, prezzo unitario, importo e IVA",
        "Indica validità del preventivo (default 30 giorni) e condizioni di pagamento",
      ],
      rules: [
        "IVA: usa l'aliquota corretta (default 22%) e mostrala in chiaro",
        "Arrotonda a 2 decimali, mai a caso",
        "Nessun costo non preventivato: le voci extra vanno dette subito",
      ],
      output:
        "Tabella voci + imponibile, IVA 22%, totale; condizioni di pagamento e validità",
      example: "Preventivo per 300 sedie, 12 tavoli e montaggio, consegna a Milano",
    },
    {
      slug: "document-generation",
      name: "Generazione Documento",
      description:
        "Genera il documento formale (Word/PDF) a partire dal template aziendale. Usare dopo il calcolo del preventivo.",
      risk: "medium",
      permissions: ["create:documents"],
      whenNot: [
        "Documento con dati fiscali non verificati: blocca e chiedi conferma",
        "Invio del documento al cliente: azione ad alto rischio, serve approvazione",
      ],
      procedure: [
        "Prendi l'ultimo preventivo calcolato e i dati del cliente",
        "Compila il template aziendale: intestazione, cliente, voci, totali, condizioni",
        "Verifica i campi obbligatori: ragione sociale, P.IVA/CF, data, firme",
        "Genera il documento e riporta il nome file",
        "L'invio resta un'azione che richiede approvazione umana",
      ],
      rules: [
        "P.IVA e codice fiscale obbligatori: documento senza dati fiscali completi non si genera",
        "Non inserire dati bancari se non presenti nel template",
        "Nome file: `preventivo-<cliente>-<data>.docx`",
      ],
      output:
        "Documento generato (nome file) + elenco campi verificati + stato invio (in attesa di approvazione)",
      example: "Genera il documento del preventivo per Bianchi Srl",
    },
    {
      slug: "reconciliation",
      name: "Riconciliazione",
      description:
        "Riconcilia entrate e uscite confrontando fatture e movimenti bancari. Usare a fine mese o su richiesta di quadratura.",
      risk: "high",
      permissions: ["read:transactions", "read:invoices"],
      whenNot: [
        "Movimenti bancari non accessibili: la riconciliazione va fatta a mano",
        "Dati fiscali in scrittura: questa skill solo segnala, non registra",
      ],
      procedure: [
        "Carica l'estratto conto del periodo e l'elenco fatture",
        "Abbina per importo, data e causale; segna i match certi",
        "Elenca i non abbinati in due gruppi: mancanti e doppioni",
        "Per ogni non abbinato indica l'ipotesi più probabile e cosa serve per confermarla",
        "Proponi le registrazioni, senza applicarle",
      ],
      rules: [
        "Azione ad alto rischio: nessuna registrazione contabile senza approvazione",
        "Non modificare mai i dati sorgente (fatture o estratto conto)",
        "Ogni proposta deve citare almeno due dati che la sostengono",
      ],
      output:
        "Riepilogo: abbinati (conteggio e totale), mancanti, doppioni, proposte di registrazione da approvare",
      example: "Riconciliamo il mese di settembre",
    },
    {
      slug: "fiscal-deadlines",
      name: "Scadenzario Fiscale",
      description:
        "Gestisce le scadenze fiscali e prepara i solleciti. Usare per il monitoraggio periodico delle scadenze.",
      risk: "high",
      permissions: ["read:invoices", "send:email"],
      whenNot: [
        "Solleciti automatici a clienti: richiedono approvazione, sempre",
        "Dichiarazioni o adempimenti fiscali: questa skill traccia, non calcola",
      ],
      procedure: [
        "Elenca le scadenze del periodo con importo, cliente e data",
        "Separa: scadute, in scadenza nei prossimi 7 giorni, successive",
        "Per le scadute, prepara la bozza di sollecito (max 100 parole, tono cordiale ma deciso)",
        "Segnala le scadenze fiscali interne con giorni di anticipo",
        "Ogni sollecito resta in attesa di approvazione prima dell'invio",
      ],
      rules: [
        "Invio di solleciti = azione ad alto rischio: mai senza approvazione",
        "Nessun dato fiscale calcolato da questa skill: si traccia e si segnala",
        "Citare la scadenza con data e importo esatti",
      ],
      output:
        "Scadenzario: scadute / prossimi 7 giorni / successive + bozze solleciti in attesa di approvazione",
      example: "Quali fatture sono scadute e a chi scrivo?",
    },
  ],
  agents: [
    { slug: "quote-agent", fit: "primary", rationale: "Quotes & Estimates genera preventivi professionali" },
    { slug: "finance-manager", fit: "primary", rationale: "Finance Manager gestisce contabilità e fatture" },
    { slug: "invoice-agent", fit: "secondary", rationale: "Invoice Agent gestisce la fatturazione" },
    { slug: "business-manager", fit: "secondary", rationale: "Business Manager analizza le metriche finanziarie" },
  ],
  integrations: [
    { brand: "gmail", status: "required", rationale: "Gmail invia preventivi e solleciti" },
    { brand: "googlesheets", status: "required", rationale: "Sheets tiene lo scadenzario fiscale" },
    { brand: "microsoftexcel", status: "optional", rationale: "Excel crea i documenti finanziari" },
    { brand: "microsoftword", status: "optional", rationale: "Word genera i documenti formali" },
    { brand: "googledrive", status: "optional", rationale: "Drive ospita i documenti fiscali" },
    { brand: "paypal", status: "optional", rationale: "PayPal processa i pagamenti" },
  ],
};

/* ------------------------------------------------------------------ *
 * 7.6 Contenuti & SEO
 * ------------------------------------------------------------------ */
const CONTENT_SEO: SkillPlugin = {
  slug: "content-seo",
  name: "Contenuti & SEO",
  tagline: "Crea contenuti ottimizzati SEO",
  description:
    "Tool per il content marketing: keyword research con intento di ricerca, analisi dei contenuti competitor, articoli SEO strutturati, copy per landing e ads con varianti A/B, sequenze email e newsletter.",
  category: "marketing",
  icon: "✍️",
  priceTier: "included",
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [
        "Prima versione: keyword research, analisi competitor, articolo SEO e copy per ads con varianti A/B.",
        "Notion, Sheets, Word e Drive già disponibili; Analytics, Docs, Mailchimp e Ads in arrivo.",
      ],
    },
  ],
  skills: [
    {
      slug: "keyword-research",
      name: "Keyword Research",
      description:
        "Ricerca keyword con analisi di volume, difficoltà e intento di ricerca. Usare prima di scrivere qualsiasi contenuto SEO.",
      risk: "low",
      permissions: ["read:analytics"],
      whenNot: [
        "Nessuna fonte di dati SEO collegata: proponi keyword da ragionamento e dichiaralo",
        "Argomento non pertinente al business: segnalalo e proponi alternative",
      ],
      procedure: [
        "Raccogli il tema, il pubblico e l'obiettivo del contenuto",
        "Ricava keyword long-tail correlate all'intento reale (informativo, commerciale, transazionale)",
        "Raggruppa per intento e per difficoltà",
        "Seleziona 1 keyword principale e 5-8 secondarie",
        "Indica la fonte di ogni dato: se è una stima, dillo",
      ],
      rules: [
        "Nessun volume di ricerca inventato: se non è disponibile, si indica 'da verificare'",
        "Priorità alla keyword long-tail di bassa difficoltà per le PMI",
        "Nessun keyword stuffing: la densità naturale va bene",
      ],
      output: "Tabella keyword (keyword, intento, difficoltà, ruolo) + keyword principale consigliata",
      example: "Che keyword insegno per 'come scegliere sedie ufficio'?",
    },
    {
      slug: "competitor-analysis",
      name: "Analisi Competitor",
      description:
        "Analizza i contenuti dei competitor per individuare gap e opportunità. Usare prima di definire il piano editoriale.",
      risk: "low",
      permissions: ["read:web"],
      whenNot: [
        "Competitor non identificati: chiedi i nomi, non indovinarli",
        "Richiesta di copia pedissequa: mai, solo analisi strutturale",
      ],
      procedure: [
        "Elenca i competitor forniti o già noti",
        "Per ciascuno: temi coperti, formato dei contenuti, lunghezza, tono",
        "Individua i gap: domande senza risposta, formati assenti, angle non coperti",
        "Proponi 3 angle di contenuto non coperti da nessuno",
        "Riporta sempre le fonti (URL) usate",
      ],
      rules: [
        "Nessuna riproduzione di testi altrui: solo analisi",
        "Ogni affermazione sui competitor porta l'URL",
        "Non si attribuiscono volumi di traffico se non disponibili",
      ],
      output:
        "Tabella competitor (temi, formati, gap) + 3 angle proposti + fonti",
      example: "Analizza i contenuti dei miei 3 competitor principali",
    },
    {
      slug: "seo-article",
      name: "Articolo SEO",
      description:
        "Genera un articolo SEO strutturato con heading, meta description e ottimizzazione on-page. Usare quando la keyword è già definita.",
      risk: "low",
      permissions: ["create:content"],
      whenNot: [
        "Keyword non ancora definita: passa da Keyword Research",
        "Articolo che richiede dati proprietari non disponibili: segnalalo",
      ],
      procedure: [
        "Prendi la keyword principale e il pubblico di riferimento",
        "Struttura: H1 unico, H2/H3 logici, risposta alla domanda nei primi 100 parole",
        "Scrivi 800-1500 parole, paragrafi brevi, elenchi dove servono",
        "Aggiungi meta title (max 60 caratteri) e meta description (max 155)",
        "Inserisci 2-3 link interni suggeriti e le FAQ",
      ],
      rules: [
        "Un solo H1, meta title ≤ 60 caratteri, meta description ≤ 155",
        "Nessun fatto o dato inventato: i numeri vengono dalle fonti",
        "Italiano chiaro, frasi brevi, niente gergo di settore",
      ],
      output:
        "Articolo completo con struttura di heading + meta title + meta description + link interni suggeriti",
      example: "Scrivi l'articolo su 'come scegliere sedie ufficio'",
    },
    {
      slug: "copy-ads",
      name: "Copy per Ads",
      description:
        "Crea copy per landing page e ads con varianti A/B test. Usare per campagne e pagine di destinazione.",
      risk: "low",
      permissions: ["create:content"],
      whenNot: [
        "Claim regolamentati (salute, finanza): le dichiarazioni vanno verificate",
        "Testo senza offerta chiara: prima definire cosa si vende e a quanto",
      ],
      procedure: [
        "Chiedi obiettivo, offerta, pubblico e tono di voce",
        "Scrivi headline 3 varianti (max 8 parole), subheadline 3 varianti, CTA 3 varianti",
        "Indica quale variante è per A, B, C e perché",
        "Aggiungi il claim di prova sociale solo se esiste un dato reale",
        "Chiudi con il testo completo di ogni variante assemblata",
      ],
      rules: [
        "Le varianti devono cambiare l'angolo, non solo i sinonimi",
        "Nessuna promessa insostenibile ('guarante al 100%')",
        "CTA singola e ripetibile per ogni variante",
      ],
      output:
        "3 varianti complete (headline, subheadline, CTA, angolo) con testi assemblati",
      example: "Scrivi la copy per la landing del nostro servizio di pulizie",
    },
  ],
  agents: [
    { slug: "seo-agent", fit: "primary", rationale: "SEO Content Agent ottimizza i contenuti per la ricerca" },
    { slug: "copywriter", fit: "primary", rationale: "Copywriter crea copy persuasivi" },
    { slug: "social-media-agent", fit: "secondary", rationale: "Social Media usa i contenuti per i post" },
    { slug: "research-agent", fit: "secondary", rationale: "Research Agent fornisce i dati per i contenuti" },
  ],
  integrations: [
    { brand: "notion", status: "required", rationale: "Notion per bozze e revisione dei contenuti" },
    { brand: "googlesheets", status: "optional", rationale: "Sheets per il piano editoriale e le keyword" },
    { brand: "microsoftword", status: "optional", rationale: "Word per le revisioni finali" },
    { brand: "googledrive", status: "optional", rationale: "Drive ospita i contenuti" },
    { brand: "googleanalytics", status: "optional", rationale: "Analytics misura la performance dei contenuti" },
    { brand: "googledocs", status: "optional", rationale: "Docs per la collaborazione sui contenuti" },
    { brand: "mailchimp", status: "optional", rationale: "Mailchimp gestisce le campagne" },
    { brand: "googleads", status: "optional", rationale: "Google Ads misura la performance delle ads" },
  ],
};

/* ------------------------------------------------------------------ *
 * 7.7 Social Media
 * ------------------------------------------------------------------ */
const SOCIAL: SkillPlugin = {
  slug: "social-media",
  name: "Social Media",
  tagline: "Gestisci presenza sui social",
  description:
    "Suite social media: calendario editoriale settimanale, caption per canale (Instagram, LinkedIn, TikTok, Facebook), ricerca hashtag e trend, riuso di un contenuto su più canali e report di performance.",
  category: "marketing",
  icon: "📱",
  priceTier: "included",
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [
        "Prima versione: calendario editoriale, caption per canale, hashtag, riuso contenuti e report performance.",
        "Finché i canali non sono collegabili le competenze producono piani e copy esportabili in Sheets e Notion.",
      ],
    },
  ],
  skills: [
    {
      slug: "editorial-calendar",
      name: "Calendario Editoriale",
      description:
        "Pianifica il calendario editoriale settimanale con temi, formati e deadline. Usare all'inizio della settimana.",
      risk: "low",
      permissions: ["read:calendar", "create:tasks"],
      whenNot: [
        "Non è chiaro il tono di voce del brand: chiedi prima di pianificare",
        "Richiesta di un piano annuale: procedi per trimestri, con priorità",
      ],
      procedure: [
        "Raccogli obiettivi del mese (visibilità, lead, vendite) e promozioni in corso",
        "Distribuisci i post: 60%-education, 30% social proof, 10% promozione",
        "Assegna formato e canale a ogni post",
        "Definisci una deadline interna di 2 giorni per l'approvazione",
        "Esporta il piano in Sheets con owner e stato",
      ],
      rules: [
        "Massimo 3 post a settimana per canale: qualità, non quantità",
        "Ogni post ha un obiettivo unico e dichiarato",
        "Nessuna pubblicazione senza approvazione (stato 'in attesa')",
      ],
      output:
        "Tabella piano settimanale (giorno, canale, formato, tema, obiettivo, stato, deadline)",
      example: "Prepara il piano editoriale di questa settimana",
    },
    {
      slug: "caption-generation",
      name: "Generazione Caption",
      description:
        "Genera caption ottimizzate per Instagram, LinkedIn, TikTok e Facebook. Usare per scrivere il testo di un post già pianificato.",
      risk: "low",
      permissions: ["create:content"],
      whenNot: [
        "Contenuti che richiedono dati non disponibili (numeri, date): segnalali",
        "Richiesta di moderazione o di risposte a commenti negativi: passa a Support",
      ],
      procedure: [
        "Adatta il tono al canale: professionale per LinkedIn, informale per Instagram/TikTok",
        "Prima riga = gancio (max 125 caratteri, anche con emoji se il tono lo prevede)",
        "Sviluppa in 3-6 righe brevi",
        "Chiudi con una CTA singola",
        "Adatta la lunghezza al canale (TikTok e Instagram brevi, LinkedIn più discorsivo)",
      ],
      rules: [
        "Nessun tag o hashtag non pertinente: il commento non è una lista",
        "Nessuna promessa non verificabile",
        "Tono del brand, mai «parola spam» o mai eccessivamente formale",
      ],
      output: "Caption per il canale richiesto (gancio, corpo, CTA) + lunghezza suggerita",
      example: "Scrivi la caption per il post LinkedIn di oggi",
    },
    {
      slug: "hashtag-research",
      name: "Ricerca Hashtag",
      description:
        "Ricerca hashtag e trend per piattaforma con analisi dell'engagement. Usare prima della pubblicazione.",
      risk: "low",
      permissions: ["read:social"],
      whenNot: [
        "Hashtag vietati dalla piattaforma: mai, nemmeno se performano",
        "Nessun dato di trend disponibile: si segnala, non si inventa",
      ],
      procedure: [
        "Separa hashtag per ruolo: settore (5-8), locali (3-5), branded (2-3)",
        "Per gli hashtag locali usa il nome della città o del quartiere",
        "Seleziona 10-15 hashtag per Instagram, 3-5 per TikTok, 2-3 per LinkedIn",
        "Elimina gli hashtag con trend negativo o non pertinenti",
        "Annota la motivazione di ogni gruppo",
      ],
      rules: [
        "Massimo 15 hashtag: oltre è spam",
        "Nessun hashtag che possa essere letto come'offesa o pregiudizio",
        "Gli hashtag branded devono essere verificati nella policy del brand",
      ],
      output: "Elenco hashtag per gruppo (settore, locali, branded) con conteggio e motivazione",
      example: "Che hashtag usiamo per il nostro ristorante a Bologna?",
    },
    {
      slug: "content-repurposing",
      name: "Riuso Contenuti",
      description:
        "Adatta un contenuto esistente a più canali mantenendo la coerenza di tono. Usare per massimizzare un contenuto già prodotto.",
      risk: "low",
      permissions: ["create:content"],
      whenNot: [
        "Contenuto originale non disponibile: chiedilo, non ricrearlo da zero",
        "Contenuto da adattare con dati temporali: aggiornare sempre le date",
      ],
      procedure: [
        "Leggi il contenuto originale ed estrai i 3 messaggi chiave",
        "Decidi il taglio per canale: un messaggio per canale, mai copia-incolla",
        "Adatta formato (video, carousel, testo) e lunghezza",
        "Riadatta gli hashtag al canale",
        "Consegna 3 versioni pronte all'approvazione",
      ],
      rules: [
        "Nessun contenuto identico su due canali",
        "Aggiornare sempre date, numeri e riferimenti prima del riuso",
        "Ogni versione mantiene il tono del brand",
      ],
      output: "3 versioni adattate per canale (formato, lunghezza, testo, hashtag)",
      example: "Prendi l'articolo SEO del mese scorso e tira fuori 3 post",
    },
    {
      slug: "social-performance-report",
      name: "Report Performance",
      description:
        "Genera il report di performance dei canali social con trend e azioni. Usare a fine mese o settimana.",
      risk: "low",
      permissions: ["read:social", "read:analytics"],
      whenNot: [
        "Canali non pubblicati direttamente: il report si basa su dati manuali",
        "Dati non disponibili: non estrapolare trend da un solo post",
      ],
      procedure: [
        "Raccogli i dati per canale: reach, engagement, visite, follower",
        "Calcola engagement rate = interazioni / reach",
        "Confronta con il periodo precedente e con il benchmark del settore",
        "Evidenzia i 2 contenuti migliori e i 2 peggiori con le ipotesi",
        "Proponi 2 azioni per il mese successivo",
      ],
      rules: [
        "Nessun dato aggregato senza fonte e periodo",
        'Il benchmark di settore, se non disponibile, si dichiara "non disponibile"',
        "Il report non giudica i dipendenti: guarda i contenuti",
      ],
      output:
        "Tabella KPI per canale + confronto periodo + 2 highlight + 2 azioni",
      example: "Come sono andati i social questo mese?",
    },
  ],
  agents: [
    { slug: "social-media-agent", fit: "primary", rationale: "Social Media gestisce la presenza sui social" },
    { slug: "copywriter", fit: "secondary", rationale: "Copywriter crea caption e copy" },
    { slug: "reviews-agent", fit: "secondary", rationale: "Reviews & Reputation gestisce le recensioni social" },
  ],
  integrations: [
    { brand: "googlesheets", status: "required", rationale: "Sheets per il calendario editoriale" },
    { brand: "notion", status: "optional", rationale: "Notion per le bozze dei contenuti" },
    { brand: "googledrive", status: "optional", rationale: "Drive ospita gli asset e i contenuti" },
    { brand: "slack", status: "optional", rationale: "Slack notifica il team per l'approvazione" },
    { brand: "instagram", status: "optional", rationale: "Instagram per la pubblicazione diretta" },
    { brand: "facebook", status: "optional", rationale: "Facebook per la pubblicazione diretta" },
    { brand: "tiktok", status: "optional", rationale: "TikTok per la pubblicazione diretta" },
    { brand: "figma", status: "optional", rationale: "Figma per i creativi social" },
  ],
};

/* ------------------------------------------------------------------ *
 * 7.8 Inbox & Produttività Esecutiva
 * ------------------------------------------------------------------ */
const INBOX: SkillPlugin = {
  slug: "inbox-productivity",
  name: "Inbox & Produttività",
  tagline: "Triage email e gestione task",
  description:
    "Sistema di produttività: triage delle email per priorità, bozze di risposta, tracciamento di scadenze e impegni, riepilogo giornaliero, verbali di riunione e metodo inbox zero.",
  category: "productivity",
  icon: "📧",
  priceTier: "included",
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [
        "Prima versione: triage email, bozza di risposta, scadenze, verbali di riunione e metodo inbox zero.",
        "Gmail, Calendar, Notion e OneNote già disponibili; Outlook, Tasks e Keep in arrivo.",
      ],
    },
  ],
  skills: [
    {
      slug: "email-triage",
      name: "Triage Email",
      description:
        "Classifica le email per priorità (urgent, important, normal) in base a contenuto, mittente e scadenze. Usare a inizio giornata.",
      risk: "low",
      permissions: ["read:email"],
      whenNot: [
        "Caselle di altri utenti: mai, solo la casella autorizzata",
        "Email da indirizzi sconosciuti con richieste di pagamento: verifica sempre",
      ],
      procedure: [
        "Leggi le email non lette degli ultimi 3 giorni",
        "Classifica: urgent (entro 24h o blocco operativo), important (entro la settimana), normal ( informative)",
        "Segnala le email che contengono richieste di pagamento o dati sensibili",
        "Propone etichette/folder per ogni gruppo",
        "Restituisci un riepilogo: 3 email da fare oggi",
      ],
      rules: [
        "La priorità è dichiarata con il motivo, non è un fatto assoluto",
        "Nessuna email archiviata o eliminata: solo proposta",
        "Le richieste di pagamento vanno sempre segnalate separatamente",
      ],
      output:
        "Tre gruppi (urgent/important/normal) con le 3 email 'da fare oggi' e le richieste di pagamento",
      example: "Fammi il triage delle email non lette",
    },
    {
      slug: "email-draft",
      name: "Bozza Risposta",
      description:
        "Genera la bozza di risposta email basandosi sul contesto e sulle preferenze del mittente. Usare su richieste che richiedono risposta.",
      risk: "medium",
      permissions: ["read:email", "create:email"],
      whenNot: [
        "Email che richiede un impegno economico o legale: bozza solo, con approvazione",
        "Contenuto che richiede dati non disponibili: segnalare il buco",
      ],
      procedure: [
        "Leggi l'email originale e la cronologia del thread",
        "Individua le domande a cui rispondere e le informazioni mancanti",
        "Scrivi la bozza: oggetto, apertura, risposte numerate, chiusura",
        "Tono coerente con gli scambi precedenti del cliente",
        "L'INVIO è un'azione che richiede approvazione esplicita",
      ],
      rules: [
        "L'invio richiede sempre approvazione: questa skill prepara solo",
        "Massimo 150 parole, un tema per email",
        "Nessuna promise di consegna o prezzo non confermata",
      ],
      output: "Bozza (oggetto, corpo) + elenco delle informazioni mancanti + stato invio (da approvare)",
      example: "Rispondi all'email di ieri chiedendoci i tempi di consegna",
    },
    {
      slug: "deadline-tracking",
      name: "Tracciamento Scadenze",
      description:
        "Traccia scadenze e impegni con notifiche a priorità. Usare per non perdere gli impegni presi nelle email.",
      risk: "low",
      permissions: ["read:tasks", "create:tasks"],
      whenNot: [
        "Scadenze aziendali formali (contratti, fiscali): tracciate da Preventivi & Finanza",
        "Impegni già scaduti da segnalare in blocco: elencane prima per data",
      ],
      procedure: [
        "Estrai dalle email gli impegni con data",
        "Assegna priorità in base a impatto e scadenza",
        "Crea un task per ogni impegno con data e owner",
        "Segnala oggi gli impegni che scadono nei prossimi 3 giorni",
        "Aggiorna lo stato dei task già in corso",
      ],
      rules: [
        "Ogni scadenza ha data e owner: senza owner non entra nel tracking",
        "Nessuna scadenza inventata: solo quella dichiarata o deducibile",
        "Usa il fuso orario dell'utente per le scadenze",
      ],
      output:
        "Elenco impegni (cosa, data, owner, priorità) + highlight dei prossimi 3 giorni",
      example: "Che scadenze ho nei prossimi 3 giorni?",
    },
    {
      slug: "meeting-notes",
      name: "Verbali Riunione",
      description:
        "Genera i verbali di riunione con action item e responsabili. Usare dopo ogni riunione con note o trascrizione.",
      risk: "low",
      permissions: ["read:meetings", "create:documents"],
      whenNot: [
        "Riunioni riservate senza autorizzazione a condividere il verbale: chiedi",
        "Riunioni senza contenuto su cui scrivere: meglio nessun verbale",
      ],
      procedure: [
        "Raccogli gli appunti o la trascrizione",
        "Separa: decisioni, action item, punti aperti",
        "Assegna a ogni action item un responsabile e una data",
        "Riassumi in massimo una pagina: nessun verbale-fiume",
        "Esporta il verbale nel documento aziendale",
      ],
      rules: [
        "Ogni action item ha responsabile e data: se assenti, si segnala come 'da assegnare'",
        "Riassumi fedele: nessuna interpretazione delle decisioni",
        "Dati personali dei partecipanti: solo nome e ruolo",
      ],
      output:
        "Verbale: decisioni, action item (cosa, chi, entro quando), punti aperti",
      example: "Fai il verbale della riunione di stamattina",
    },
  ],
  agents: [
    { slug: "email-manager", fit: "primary", rationale: "Email Manager gestisce inbox ed email" },
    { slug: "email-agent", fit: "primary", rationale: "Email Agent fa triage e risponde alle email" },
    { slug: "personal-assistant", fit: "primary", rationale: "Personal Assistant gestisce la produttività" },
    { slug: "business-manager", fit: "secondary", rationale: "Business Manager usa le sintesi di produttività" },
  ],
  integrations: [
    { brand: "gmail", status: "required", rationale: "Gmail è la fonte email principale" },
    { brand: "googlecalendar", status: "optional", rationale: "Calendar traccia scadenze e impegni" },
    { brand: "notion", status: "optional", rationale: "Notion ospita note e task" },
    { brand: "microsoftonenote", status: "optional", rationale: "OneNote ospita note e documenti" },
    { brand: "microsoftoutlook", status: "optional", rationale: "Outlook amplia la copertura email" },
    { brand: "googletasks", status: "optional", rationale: "Google Tasks gestisce i task" },
    { brand: "googlekeep", status: "optional", rationale: "Google Keep ospita note rapide" },
  ],
};

/* ------------------------------------------------------------------ *
 * 7.9 Report & Decisioni
 * ------------------------------------------------------------------ */
const REPORTS: SkillPlugin = {
  slug: "reports-bi",
  name: "Report & Decisioni",
  tagline: "Analisi dati e decisioni strategiche",
  description:
    "Business intelligence: report KPI settimanali e mensili, confronto periodo su periodo, rilevamento anomalie, priorità strategiche e sintesi per il titolare in linguaggio semplice.",
  category: "analytics",
  icon: "📊",
  priceTier: "included",
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [
        "Prima versione: report KPI, confronto periodi, anomalie, priorità strategiche e sintesi executive.",
        "Sheets, Excel, Airtable, HubSpot e PowerPoint già disponibili; Analytics e Ads in arrivo.",
      ],
    },
  ],
  skills: [
    {
      slug: "kpi-report",
      name: "Report KPI",
      description:
        "Genera il report dei KPI settimanali o mensili con metriche chiave e trend. Usare per il ritmo settimanale o mensile.",
      risk: "low",
      permissions: ["read:analytics", "read:data"],
      whenNot: [
        "KPI non definiti dal titolare: proponi un set standard e chiedi conferma",
        "Dati di un solo giorno dichiarati come trend: non è un trend",
      ],
      procedure: [
        "Conferma il periodo e la lista dei KPI con il titolare (o usa il default: fatturato, ordini, costo, margine)",
        "Leggi i dati dalle fonti collegate",
        "Calcola ogni KPI sul periodo e la variazione sul precedente",
        "Segnala i KPI fuori target",
        "Chiudi con 3 azioni, non con la ripetizione dei numeri",
      ],
      rules: [
        "Citare sempre fonte e periodo di ogni cifra",
        "Nessun KPI calcolato su dati incompleti senza avviso",
        "Il report non interpreta le cause: constata e propone",
      ],
      output:
        "Tabella KPI (valore, variazione, stato) + 3 fuori target + 3 azioni + fonti",
      example: "Fammi il report KPI di questa settimana",
    },
    {
      slug: "period-comparison",
      name: "Confronto Periodi",
      description:
        "Confronta i dati di un periodo con il precedente analizzando variazioni e anomalie. Usare per capire cosa è cambiato.",
      risk: "low",
      permissions: ["read:data"],
      whenNot: [
        "Periodi di durata diversa: normalizza per giorno prima di confrontare",
        "Dati con meno di 2 periodi: il confronto non ha senso",
      ],
      procedure: [
        "Definisci i due periodi, stessa lunghezza",
        "Confronta le metriche e calcola la variazione assoluta e percentuale",
        "Segnala le anomalie: variazioni oltre la soglia tipica del dato",
        "Per ogni anomalia, elenca 3 ipotesi verificabili (non una spiegazione)",
        "Indica quali dati servirebbero per confermare",
      ],
      rules: [
        "Mai più fatturato = successo: guarda il margine insieme al fatturato",
        "Le anomalie sono segnalate, non spiegate con certezza",
        "Ogni variazione va accompagnata dalla variazione in valore assoluto",
      ],
      output:
        "Tabella confronto (periodo A, periodo B, delta, delta %) + anomalie + ipotesi verificabili",
      example: "Confronta questo trimestre con il precedente",
    },
    {
      slug: "anomaly-detection",
      name: "Rilevamento Anomalie",
      description:
        "Rileva anomalie nei dati e propone le verifiche. Usare quando un numero si discosta dalla norma.",
      risk: "low",
      permissions: ["read:data"],
      whenNot: [
        "Anomalie senza spiegazione: non trattarle come certe",
        "Dati stagionali (feste, saldi): confronta con lo stesso periodo dell'anno precedente",
      ],
      procedure: [
        "Calcola media e deviazione standard dell'ultimo periodo",
        "Segnala i valori oltre 2 deviazioni dalla media",
        "Confronta con lo stesso periodo dell'anno precedente per escludere la stagionalità",
        "Classifica: anomalia di sistema, evento isolato, errore di dato",
        "Proponi la verifica concreta per ciascuna",
      ],
      rules: [
        "Ogni anomalia porta la verifica che la confermerebbe",
        "Nessun allarme senza il valore di confronto",
        "Possibile errore di dato: controllare sempre la fonte",
      ],
      output:
        "Elenco anomalie (metrica, valore, media, scarto, classificazione, verifica proposta)",
      example: "Febbraio è crollato, cosa è successo?",
    },
    {
      slug: "strategic-priorities",
      name: "Priorità Strategiche",
      description:
        "Trasforma i dati in priorità strategiche con impatto e costo stimato. Usare per decidere dove investire il tempo.",
      risk: "low",
      permissions: ["read:data"],
      whenNot: [
        "Priorità che richiedono investimenti finanziari: servono i dati di cassa",
        "Decisioni già prese: questa skill aiuta a scegliere, non a ratificare",
      ],
      procedure: [
        "Elenca i candidati (azioni, progetti, canali) emersi dai dati",
        "Valuta per ogni candidato: impatto atteso, effort, costo, tempo di rientro",
        "Ordina per rapporto impotto/effort",
        "Proponi il massimo 3 priorità con una linea di verifica per ciascuna",
        "Indica cosa NON fare per liberare tempo",
      ],
      rules: [
        "Massimo 3 priorità: una lista lunga non è una priorità",
        "L'impatto è dichiarato come stima con il ragionamento",
        "Nessuna raccomandazione basata solo su un dato",
      ],
      output:
        "Tabella candidati (impatto, effort, costo, rientro) + 3 priorità + cosa no",
      example: "Cosa facciamo per primo il prossimo trimestre?",
    },
    {
      slug: "executive-summary",
      name: "Sintesi Executive",
      description:
        "Riassume i dati per il titolare in linguaggio semplice, senza gergo. Usare per il briefing settimanale.",
      risk: "low",
      permissions: ["read:data", "create:reports"],
      whenNot: [
        "Dati non consolidati: segnalare che la sintesi è provvisoria",
        "Richiesta di un documento formale: serve Documentazione, non una sintesi",
      ],
      procedure: [
        "Prendi i 5 dati più rilevanti del periodo",
        "Traducili in linguaggio di business: cosa è successo, cosa significa",
        "Separa: buono, da tenere d'occhio, da risolvere",
        "Chiudi con 3 decisioni richieste al titolare",
        "Tieni massimo 200 parole",
      ],
      rules: [
        "Nessun gergo tecnico e nessuna formula di BI non spiegata",
        "Ogni numero deve stare in una frase",
        "La sintesi non nasconde i dati negativi",
      ],
      output:
        "Briefing (buono / da tenere d'occhio / da risolvere) + 3 decisioni richieste",
      example: "Scrivi il briefing per il titolare di questa settimana",
    },
  ],
  agents: [
    { slug: "business-manager", fit: "primary", rationale: "Business Manager analizza dati e decisioni" },
    { slug: "analytics-agent", fit: "primary", rationale: "Analytics Agent genera report dettagliati" },
    { slug: "finance-manager", fit: "secondary", rationale: "Finance Manager usa i dati finanziari" },
    { slug: "shopify-agent", fit: "secondary", rationale: "Shopify Agent fornisce i dati e-commerce" },
  ],
  integrations: [
    { brand: "googlesheets", status: "required", rationale: "Sheets è la fonte dati principale" },
    { brand: "microsoftexcel", status: "optional", rationale: "Excel per le analisi avanzate" },
    { brand: "airtable", status: "optional", rationale: "Airtable per il database business" },
    { brand: "hubspot", status: "optional", rationale: "HubSpot per i dati CRM" },
    { brand: "microsoftpowerpoint", status: "optional", rationale: "PowerPoint per il report al management" },
    { brand: "googleanalytics", status: "optional", rationale: "Analytics per le metriche web" },
    { brand: "googleads", status: "optional", rationale: "Google Ads per le metriche di marketing" },
  ],
};

/* ------------------------------------------------------------------ *
 * 7.10 Risorse Umane & Selezione
 * ------------------------------------------------------------------ */
const HR: SkillPlugin = {
  slug: "hr-recruiting",
  name: "HR & Selezione",
  tagline: "Gestisci candidature e reclutamento",
  description:
    "Suite HR: screening dei CV rispetto alla job description, matching delle competenze, domande di pre-qualifica, feedback strutturato ai candidati, pianificazione dei colloqui e scheda candidato.",
  category: "hr",
  icon: "👥",
  priceTier: "included",
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [
        "Prima versione: screening CV, matching candidati, domande di colloquio, feedback e pianificazione colloqui.",
        "Nessun punteggio usa dati personali protetti: valutiamo solo competenze ed esperienze documentate.",
      ],
    },
  ],
  skills: [
    {
      slug: "cv-screening",
      name: "Screening CV",
      description:
        "Confronta i CV con la job description e genera il matching delle competenze. Usare su nuove candidature.",
      risk: "low",
      permissions: ["read:documents"],
      whenNot: [
        "Candidature per ruoli soggetti a criteri di diversity: i criteri restano quelli dell'azienda",
        "CV illeggibili o in formato non supportato: chiedi una versione alternativa",
      ],
      procedure: [
        "Estrai dalla job description i requisiti obbligatori e quelli desiderabili",
        "Dal CV estrai: esperienza, ruoli, settore, risultati, lingue",
        "Confronta per requisito: soddisfatto, parziale, assente",
        "Calcola la copertura dei requisiti e produci il giudizio motivato",
        "Elenca i punti da verificare in colloquio",
      ],
      rules: [
        "Nessun giudizio basato su dati personali (età, genere, nazionalità, fotografia)",
        "Valuta solo competenze ed esperienze documentate",
        "Il punteggio è un supporto alla decisione umana, mai una decisione",
      ],
      output:
        "Tabella requisiti (obbligatorio/desiderabile, esito, evidenza dal CV) + copertura % + punti da verificare",
      example: "Valuta i CV arrivati per l'annuncio di addetto vendite",
    },
    {
      slug: "candidate-matching",
      name: "Matching Candidati",
      description:
        "Confronta le competenze del candidato con i requisiti del ruolo e genera una graduatoria. Usare dopo lo screening di più candidature.",
      risk: "low",
      permissions: ["read:candidates", "update:candidates"],
      whenNot: [
        "Una sola candidatura: il matching non serve, usa Screening CV",
        "Graduatoria da usare come esito definitivo: la decisione resta umana",
      ],
      procedure: [
        "Raccogli le schede dei candidati già filtrate",
        "Confronta ogni candidato sui requisiti obbligatori, in ordine di peso",
        "Assegna un punteggio 0-100 e la motivazione in 2 righe",
        "Ordina per punteggio e segnala i candidati 'in discussione'",
        "Aggiorna il tracker candidati",
      ],
      rules: [
        "Nessun dato personale nel punteggio",
        "La motivazione per candidato deve essere specifica, non generica",
        "Prima valutazione, non esito: la selezione la fa una persona",
      ],
      output:
        "Graduatoria (candidato, punteggio, requisiti coperti, motivazione) + nota 'da valutare con HR'",
      example: "Ordina i 6 candidati per il ruolo di addetto vendite",
    },
    {
      slug: "interview-questions",
      name: "Domande Colloquio",
      description:
        "Genera le domande di pre-qualifica basate sul ruolo e sul livello di esperienza. Usare prima del colloquio.",
      risk: "low",
      permissions: ["read:roles"],
      whenNot: [
        "Ruolo non definito: chiedi job description e livello",
        "Domande che richiedono dati personali protetti: escluse",
      ],
      procedure: [
        "Prendi la job description e il livello del ruolo",
        "Genera 6-8 domande: 3 comportamentali, 3 tecniche, 1-2 di verifica",
        "Per ogni domanda indica cosa si vuole osservare",
        "Aggiungi 2-3 domande finali per il candidato",
        "Evita qualsiasi domanda su età, stato civile, salute, religione, orientamento",
      ],
      rules: [
        "Zero domande discriminate: solo competenze ed esperienze",
        "Le domande comportamentali partono da 'Raccontami una volta in cui...'",
        "Massimo 10 domande: un colloquio lungo non è un colloquio",
      ],
      output:
        "Elenco domande per tipo con l'obiettivo osservato + domande finali",
      example: "Prepara le domande per il colloquio del commerciale",
    },
    {
      slug: "candidate-feedback",
      name: "Feedback Candidati",
      description:
        "Genera il feedback strutturato per i candidati dopo il colloquio. Usare per comunicare esito e feedback.",
      risk: "medium",
      permissions: ["read:candidates", "update:candidates", "send:email"],
      whenNot: [
        "Feedback che annuncia una decisione non ancora presa internamente: attendere l'esito",
        "Feedback che richiede di discutere la retribuzione: solo se autorizzato",
      ],
      procedure: [
        "Conferma l'esito del processo con chi ha deciso",
        "Prepara il feedback: esito, motivi, 2 punti di forza, 1 area di crescita",
        "Tono: rispetto e specificità, mai generico",
        "L'invio al candidato richiede approvazione",
        "Registra l'esito sulla scheda candidato",
      ],
      rules: [
        "Invio email = azione che richiede approvazione",
        "Nessun feedback discriminante o riferimenti a dati personali",
        "Un candidato ha diritto a un feedback utile: non a un 'non è il profilo'",
      ],
      output:
        "Bozza feedback (esito, 2 punti di forza, 1 area di crescita) + stato invio (da approvare)",
      example: "Scrivi il feedback alla candidata per il ruolo di contabile",
    },
    {
      slug: "interview-planning",
      name: "Pianificazione Colloqui",
      description:
        "Pianifica i colloqui (chi intervista, quando, con quali domande) e prepara la scheda candidato. Usare per organizzare le giornate di colloquio.",
      risk: "low",
      permissions: ["read:calendar", "create:events"],
      whenNot: [
        "Colloqui oltre la disponibilità dei partecipanti: proporre alternative",
        "Coinvolgere il candidato solo dopo conferma interna",
      ],
      procedure: [
        "Raccogli disponibilità di intervistatore, candidato e panel",
        "Proponi 2-3 slot, con durata e partecipanti",
        "Assegna a ogni intervistatore un focus diverso, senza sovrapposizioni",
        "Crea l'evento solo dopo la conferma del candidato",
        "Prepara la scheda candidato con CV, requisiti e domande assegnate",
      ],
      rules: [
        "Il fuso orario e la durata vanno sempre indicati nella proposta",
        "Nessun calendario personale dei partecipanti oltre l'agenda condivisa",
        "La scheda candidato contiene solo dati di selezione, non note private",
      ],
      output:
        "Piano colloqui (slot, partecipanti, focus, durata) + scheda candidato pronta per ogni intervista",
      example: "Organizza i colloqui di martedì per i 3 candidati finali",
    },
  ],
  agents: [
    { slug: "hr-recruiter", fit: "primary", rationale: "HR & Recruiter gestisce la selezione del personale" },
    { slug: "calendar-booking", fit: "secondary", rationale: "Calendar Booking pianifica i colloqui" },
    { slug: "email-manager", fit: "secondary", rationale: "Email Manager comunica con i candidati" },
  ],
  integrations: [
    { brand: "gmail", status: "required", rationale: "Gmail comunica con i candidati" },
    { brand: "googlecalendar", status: "required", rationale: "Calendar pianifica i colloqui" },
    { brand: "googledrive", status: "optional", rationale: "Drive ospita i CV e i documenti" },
    { brand: "microsoftword", status: "optional", rationale: "Word genera i documenti HR" },
    { brand: "airtable", status: "optional", rationale: "Airtable traccia i candidati" },
    { brand: "notion", status: "optional", rationale: "Notion ospita le note dei colloqui" },
    { brand: "googlemeet", status: "optional", rationale: "Google Meet per i colloqui video" },
    { brand: "microsoftoutlook", status: "optional", rationale: "Outlook amplia la copertura del calendario" },
  ],
};

/* ------------------------------------------------------------------ *
 * 7.11 Documenti & Ufficio
 * ------------------------------------------------------------------ */
const DOCUMENTS: SkillPlugin = {
  slug: "documents-office",
  name: "Documenti & Ufficio",
  tagline: "Gestisci documenti e ufficio",
  description:
    "Suite documentale: lettura e riassunto di PDF, estrazione di dati strutturati, confronto tra versioni di contratto, creazione e modifica di documenti Word, Excel e PowerPoint, risposte a domande sul contenuto del documento.",
  category: "productivity",
  icon: "📄",
  priceTier: "included",
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [
        "Prima versione: riassunto PDF, estrazione dati, Q&A con citazioni, creazione documenti e confronto versioni.",
        "Word, Excel, PowerPoint, Drive e OneNote già disponibili; OneDrive, SharePoint, Dropbox e Docs in arrivo.",
      ],
    },
  ],
  skills: [
    {
      slug: "pdf-summary",
      name: "Riassunto PDF",
      description:
        "Legge e riassume un documento PDF estraendo i punti chiave. Usare su contratti, fatture, manuali e report lunghi.",
      risk: "low",
      permissions: ["read:documents"],
      whenNot: [
        "PDF scansionato come immagine senza OCR: segnalare il limite",
        "Documento con dati personali di terzi: verifica la base giuridica prima di condividerne il contenuto",
      ],
      procedure: [
        "Leggi il documento per intero prima di riassumere",
        "Estrai: oggetto, soggetti, date, importi, obblighi, scadenze",
        "Riassumi in 3 blocchi: in sintesi, punti chiave, da verificare",
        "Chiudi con le domande che il documento non risponde",
        "Se le pagine sono molte, cita i riferimenti di pagina",
      ],
      rules: [
        "Massimo 250 parole: se serve di più, è un riassunto a blocchi",
        "Citare la pagina quando il documento supera le 5 pagine",
        "Nessun dato inventato: se non c'è nel documento, si scrive 'non presente'",
      ],
      output:
        "Riassunto: in sintesi (3 righe) + punti chiave con riferimenti + domande aperte",
      example: "Riassumi questo contratto di fornitura allegato",
    },
    {
      slug: "data-extraction",
      name: "Estrazione Dati",
      description:
        "Estrae dati strutturati da documenti (tabelle, date, importi). Usare per popolare fogli di calcolo o report.",
      risk: "low",
      permissions: ["read:documents"],
      whenNot: [
        "Tabelle con più interpretazioni possibili: segnala l'ambiguità",
        "Estrazione di dati personali non necessari: solo i campi necessari",
      ],
      procedure: [
        "Individua la struttura del documento (tabelle, elenchi, sezioni)",
        "Definisci i campi da estrarre prima di iniziare",
        "Estrai riga per riga, senza interpretare",
        "Segnala i valori illeggibili come 'da verificare', non come stime",
        "Esporta in formato tabellare pronto per Excel/Sheets",
      ],
      rules: [
        "Nessuna interpretazione: si estrae, non si deduce",
        "I valori non leggibili si marcano, non si inventano",
        "Date in formato ISO (YYYY-MM-DD) per evitare ambiguità",
      ],
      output:
        "Tabella estratta (campi in colonna) + conteggio righe + elenco dei valori da verificare",
      example: "Estrai la tabella delle spese dal PDF della nota spese",
    },
    {
      slug: "document-qa",
      name: "Q&A Documenti",
      description:
        "Risponde a domande sul contenuto dei documenti con citazioni. Usare quando l'utente chiede informazioni su un documento caricato.",
      risk: "low",
      permissions: ["read:documents"],
      whenNot: [
        "Domanda che il documento non copre: dillo, non estendere il documento",
        "Richiesta di interpretazione legale: riporta il testo, l'interpretazione resta di un professionista",
      ],
      procedure: [
        "Cerca nel documento il passaggio pertinente",
        "Rispondi in 2-4 righe, con la citazione del testo",
        "Indica pagina o sezione",
        "Se ci sono più risposte plausibili, presentale entrambe",
        "Se la risposta non c'è, proponi dove cercare",
      ],
      rules: [
        "Ogni risposta porta la citazione del documento",
        "Nessuna inferenza non supportata dal testo",
        "Tono: diretto, con la fonte subito sotto la risposta",
      ],
      output: "Risposta breve + citazione (tra parentesi) + riferimento di pagina",
      example: "Nel contratto c'è una clausola di penale per ritardo?",
    },
    {
      slug: "document-creation",
      name: "Creazione Documenti",
      description:
        "Crea e modifica documenti Word, Excel e PowerPoint. Usare quando serve un documento nuovo o aggiornare uno esistente.",
      risk: "medium",
      permissions: ["create:documents"],
      whenNot: [
        "Documento da usare come fonte autorevole (contratti, bilanci): revisione umana obbligatoria",
        "Condivisione col cliente del documento: azione che richiede approvazione",
      ],
      procedure: [
        "Chiedi o usa il template aziendale esistente",
        "Compila i campi con i dati verificati",
        "Per Excel: una tabella, intestazioni congelate, formule se servono",
        "Per PowerPoint: max 1 messaggio per slide, titoli come affermazioni",
        "Genera il file e restituisci il nome file",
      ],
      rules: [
        "Non creare documenti che imitano l'aspetto di terzi",
        "Per Excel: nessun dato hard-coded dentro le formule",
        "Documenti con dati personali: verifica il consenso",
      ],
      output:
        "File generato (nome, formato) + elenco dei campi compilati + eventuali revisioni richieste",
      example: "Crea il report in Word con i dati di questa settimana",
    },
    {
      slug: "version-comparison",
      name: "Confronto Versioni",
      description:
        "Confronta due versioni di un documento e elenca le differenze. Usare su revisioni di contratto o bozze.",
      risk: "low",
      permissions: ["read:documents"],
      whenNot: [
        "Documenti in formati non confrontabili (PDF scansionato): segnalare il limite",
        "Versioni non datate: chiedi quale è la più recente",
      ],
      procedure: [
        "Confronta i due documenti sezione per sezione",
        "Classifica ogni differenza: aggiunta, rimosso, modificato",
        "Per ogni modifica, valuta l'impatto (sostanziale o formale)",
        "Segnala le modifiche che richiedono attenzione (importi, date, obblighi)",
        "Non dare pareri legali: riporta le differenze",
      ],
      rules: [
        "Nessun parere legale sulle modifiche: solo constatazione",
        "Le modifiche a importi e scadenze vanno sempre evidenziate",
        "Ordina per impatto decrescente",
      ],
      output:
        "Elenco differenze (sezione, tipo, impatto, testo prima/dopo) + sintesi delle modifiche sostanziali",
      example: "Confronta la v2 del contratto con la v1",
    },
  ],
  agents: [
    { slug: "document-agent", fit: "primary", rationale: "Document Agent gestisce i documenti" },
    { slug: "quote-agent", fit: "primary", rationale: "Quotes & Estimates genera i documenti formali" },
    { slug: "business-manager", fit: "secondary", rationale: "Business Manager analizza i documenti" },
    { slug: "support-agent", fit: "secondary", rationale: "Support Agent risponde sulle domande dei clienti" },
  ],
  integrations: [
    { brand: "microsoftword", status: "required", rationale: "Word per la creazione dei documenti" },
    { brand: "microsoftexcel", status: "optional", rationale: "Excel per l'analisi dei dati" },
    { brand: "microsoftpowerpoint", status: "optional", rationale: "PowerPoint per le presentazioni" },
    { brand: "googledrive", status: "optional", rationale: "Drive ospita i documenti" },
    { brand: "microsoftonenote", status: "optional", rationale: "OneNote ospita le note" },
    { brand: "microsoftonedrive", status: "optional", rationale: "OneDrive sincronizza i documenti" },
    { brand: "microsoftsharepoint", status: "optional", rationale: "SharePoint per i documenti enterprise" },
    { brand: "dropbox", status: "optional", rationale: "Dropbox per lo storage dei documenti" },
    { brand: "googledocs", status: "optional", rationale: "Docs per la collaborazione sui documenti" },
  ],
};

/* ------------------------------------------------------------------ *
 * 7.12 Ricerca & Analisi Competitor
 * ------------------------------------------------------------------ */
const RESEARCH: SkillPlugin = {
  slug: "research-competitor",
  name: "Ricerca Competitor",
  tagline: "Analizza mercato e competitor",
  description:
    "Tool di market research: ricerca di mercato con fonti verificabili, confronto di prezzi e recensioni, scheda competitor completa e sintesi con citazioni e livello di confidenza.",
  category: "research",
  icon: "🔍",
  priceTier: "included",
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [
        "Prima versione: ricerca di mercato, confronto prezzi, scheda competitor e sintesi con livello di confidenza.",
        "Ogni dato porta la fonte: se la ricerca non trova un valore, la competenza lo dichiara invece di stimarlo.",
      ],
    },
  ],
  skills: [
    {
      slug: "market-research",
      name: "Ricerca Mercato",
      description:
        "Ricerca il mercato di riferimento con fonti verificabili e analisi dei trend. Usare all'inizio di un'analisi.",
      risk: "low",
      permissions: ["read:web"],
      whenNot: [
        "Dati di mercato non verificabili: si dichiara il limite, non si stima",
        "Richiesta di previsioni a lungo termine: solo trend documentati",
      ],
      procedure: [
        "Definisci il mercato: settore, area geografica, segmento clienti",
        "Raccogli dati da fonti pubbliche e verificabili",
        "Separa i dati verificati dalle opinioni",
        "Identifica i trend con la fonte che li sostiene",
        "Ogni dato porta la fonte (URL o nome documento) e la data",
      ],
      rules: [
        "Nessun dato di mercato senza fonte citata",
        "Le stime di terzi sono stime: attribuiscile",
        "Nessun dato inventato quando la ricerca fallisce: dillo",
      ],
      output:
        "Sintesi di mercato + trend (con fonte e data) + dati verificati vs stime",
      example: "Quanto cresce il settore delle sedie da ufficio in Italia?",
    },
    {
      slug: "price-comparison",
      name: "Confronto Prezzi",
      description:
        "Confronta i prezzi dei competitor con la nostra offerta. Usare per decidere il posizionamento.",
      risk: "low",
      permissions: ["read:web"],
      whenNot: [
        "Prezzi non pubblicati: si dichiara 'non pubblicato', non si stima",
        "Prodotti non confrontabili: prima allinea le specifiche",
      ],
      procedure: [
        "Allinea le specifiche: modelli, dimensioni, materiali, servizi inclusi",
        "Raccogli i prezzi pubblicati, con la data",
        "Confronta a parità di specifiche",
        "Calcola il posizionamento rispetto al mercato",
        "Segnala dove la nostra offerta è più cara e dove è più conveniente",
      ],
      rules: [
        "Confronta solo prodotti equivalenti: diversità di specifiche = confronto inutile",
        "Ogni prezzo con la fonte e la data",
        "Nessun dato di prezzo non pubblicato",
      ],
      output:
        "Tabella prezzi (competitor, specifiche, prezzo, fonte, data) + posizionamento",
      example: "Confrontiamo i prezzi dei nostri competitor diretti",
    },
    {
      slug: "competitor-profile",
      name: "Scheda Competitor",
      description:
        "Genera la scheda competitor completa con prezzi, recensioni e posizionamento. Usare per le analisi periodiche.",
      risk: "low",
      permissions: ["read:web"],
      whenNot: [
        "Competitor senza attività verificabile: si dichiara, non si inventa",
        "Scheda usata per decisioni di prezzo: serve una decisione umana",
      ],
      procedure: [
        "Raccogli le informazioni pubbliche sul competitor",
        "Organizza: posizionamento, offerta, prezzi, canali, recensioni",
        "Calcola il sentiment delle recensioni (positive/negative) se disponibili",
        "Indica i punti di forza e di debolezza osservabili",
        "Chiudi con 3 spunti di differenziazione per noi",
      ],
      rules: [
        "Solo dati pubblici: niente informazioni non pubbliche",
        "Ogni affermazione porta la fonte",
        "Nessun giudizio morale sull'azienda competitor",
      ],
      output:
        "Scheda competitor (posizionamento, offerta, prezzi, recensioni, forza/debolezze) + 3 spunti di differenziazione",
      example: "Fammi la scheda competitor di Bianchi Srl",
    },
    {
      slug: "insight-synthesis",
      name: "Sintesi con Citazioni",
      description:
        "Sintetizza le ricerche in un documento con citazioni e livello di confidenza. Usare per chiudere un'analisi.",
      risk: "low",
      permissions: ["read:web", "create:documents"],
      whenNot: [
        "Fonti insufficienti: la sintesi dichiara il livello di confidenza basso",
        "Documento da condividere esternamente: azione che richiede approvazione",
      ],
      procedure: [
        "Raccogli i risultati delle ricerche precedenti",
        "Separa: confermato (più fonti), probabile (una fonte forte), da verificare",
        "Assegna un livello di confidenza: alto, medio, basso",
        "Cita ogni affermazione con la fonte tra parentesi",
        "Elenca le verifiche ancora da fare",
      ],
      rules: [
        "Ogni affermazione con la sua fonte; nessuna sintesi senza citazioni",
        "Il livello di confidenza è obbligatorio",
        "Le informazioni non verificate restano marcate come tali",
      ],
      output:
        "Documento di sintesi: confermato / probabile / da verificare + fonti + livello di confidenza",
      example: "Chiudiamo la ricerca di mercato con una sintesi citata",
    },
  ],
  agents: [
    { slug: "research-agent", fit: "primary", rationale: "Research Agent analizza mercato e competitor" },
    { slug: "seo-agent", fit: "secondary", rationale: "SEO Content usa i dati dei competitor" },
    { slug: "business-manager", fit: "secondary", rationale: "Business Manager usa le analisi" },
    { slug: "social-media-agent", fit: "secondary", rationale: "Social Media monitora i competitor" },
  ],
  integrations: [
    { brand: "notion", status: "required", rationale: "Notion ospita le ricerche" },
    { brand: "googlesheets", status: "optional", rationale: "Sheets per i dati dei competitor" },
    { brand: "microsoftpowerpoint", status: "optional", rationale: "PowerPoint per le presentazioni" },
    { brand: "googledrive", status: "optional", rationale: "Drive ospita i documenti di ricerca" },
  ],
};

/* ------------------------------------------------------------------ *
 * 7.13 Progetti & Task
 * ------------------------------------------------------------------ */
const PROJECTS: SkillPlugin = {
  slug: "projects-tasks",
  name: "Progetti & Task",
  tagline: "Gestisci progetti e task",
  description:
    "Project management: trasformare le richieste in task, aggiornare le board, report di avanzamento, standup automatico e promemoria delle scadenze.",
  category: "productivity",
  icon: "✅",
  priceTier: "included",
  version: "1.0.0",
  changelog: [
    {
      version: "1.0.0",
      date: "2026-01-15",
      changes: [
        "Prima versione: richiesta che diventa task, aggiornamento board, report avanzamento, standup e promemoria.",
        "Trello, Asana, ClickUp, Notion, Slack e GitHub già disponibili; Jira e Teams in arrivo.",
      ],
    },
  ],
  skills: [
    {
      slug: "request-to-task",
      name: "Richiesta a Task",
      description:
        "Trasforma una richiesta verbale in task strutturati con priorità e deadline. Usare su richieste da smistare.",
      risk: "low",
      permissions: ["read:requests", "create:tasks"],
      whenNot: [
        "Richiesta che non è un task (informazione, domanda): non creare task",
        "Progetto senza obiettivo definito: prima chiarire l'obiettivo",
      ],
      procedure: [
        "Chiedi l'obiettivo della richiesta in una frase",
        "Spezza in 3-7 task con un risultato verificabile ciascuno",
        "Assegna priorità (P1/P2/P3) e stima in ore",
        "Definisci la deadline o chiedila",
        "Crea i task sulla board e restituisci l'elenco",
      ],
      rules: [
        "Un task = un risultato verificabile, non una serie di azioni",
        "Ogni task ha priorità e deadline, altrimenti è una desiderata",
        "Nessun task senza owner: chiedi chi se ne occupa",
      ],
      output:
        "Elenco task (titolo, risultato, priorità, stima, deadline, owner) + conferma di creazione",
      example: "Il cliente vuole il nuovo catalogo entro fine mese: che task creo?",
    },
    {
      slug: "board-update",
      name: "Aggiornamento Board",
      description:
        "Aggiorna la project board (Trello, Asana, ClickUp) con lo stato dei task. Usare a fine giornata.",
      risk: "medium",
      permissions: ["read:tasks", "update:tasks"],
      whenNot: [
        "Stato non confermato dal team: non spostare i task per deduzione",
        "Board non collegata: produrre l'elenco delle modifiche da applicare",
      ],
      procedure: [
        "Leggi la board e confronta con gli impegni noti",
        "Sposta solo i task con stato confermato",
        "Aggiungi i commenti di stato ai task in lavorazione",
        "Non chiudere i task: spetta a chi li ha svolti",
        "Restituisci l'elenco delle modifiche applicate",
      ],
      rules: [
        "Nessun task spostato in 'fatto' senza conferma",
        "Le priorità esistenti non si cambiano senza motivo dichiarato",
        "Ogni modifica è reversibile: niente eliminazioni",
      ],
      output: "Elenco modifiche applicate + task rimasti invariati per dubbio",
      example: "Aggiorna la board con lo stato di oggi",
    },
    {
      slug: "progress-report",
      name: "Report Avanzamento",
      description:
        "Genera il report di avanzamento del progetto con bloccanti e prossimi passi. Usare per il cliente o per la direzione.",
      risk: "low",
      permissions: ["read:tasks", "read:projects"],
      whenNot: [
        "Progetto senza task tracciati: il report sarebbe inventato",
        "Report per uso interno ed esterno insieme: chiedere quale",
      ],
      procedure: [
        "Raccogli i task per stato: completati, in corso, da iniziare",
        "Calcola l'avanzamento percentuale sui task completati",
        "Elenca i bloccanti con la causa e chi deve sbloccarlo",
        "Definisci i 3 prossimi passi con owner e data",
        "Segnala gli scostamenti rispetto alla pianificazione",
      ],
      rules: [
        "L'avanzamento si calcola sui task, non sulle stime di effort",
        "Nessun bloccante senza owner assegnato",
        "Se un project's date slip, si dichiara: mai 'in linea' se non lo è",
      ],
      output:
        "Report: avanzamento % + completati/in corso/da iniziare + bloccanti (causa, owner) + 3 prossimi passi",
      example: "A che punto siamo col progetto catalogo?",
    },
    {
      slug: "auto-standup",
      name: "Standup Automatico",
      description:
        "Genera il riepilogo giornaliero di standup dai task del team. Usare la mattina o su richiesta.",
      risk: "low",
      permissions: ["read:tasks"],
      whenNot: [
        "Team senza task tracciati: lo standup non è ricostruibile",
        "Standup con dati personali: niente note private dei membri del team",
      ],
      procedure: [
        "Raccogli per ogni membro: task in corso, completati ieri, bloccanti",
        "Raggruppa in tre colonne: ieri, oggi, bloccanti",
        "Segnala i membri senza aggiornamenti",
        "Chiudi con le decisioni necessarie oggi",
        "Massimo 15 righe: uno standup non è una relazione",
      ],
      rules: [
        "Nessuna valutazione delle persone: solo fatti sui task",
        "Niente note private dei membri del team",
        "Chi non ha aggiornato si segnala, non si deduce",
      ],
      output: "Standup: ieri / oggi / bloccanti (per task, non per persona) + decisioni richieste",
      example: "Prepara lo standup di oggi",
    },
    {
      slug: "deadline-reminder",
      name: "Promemoria Scadenze",
      description:
        "Ricorda le scadenze in avvicinamento con il margine necessario per agire. Usare in modo programmato o giornaliero.",
      risk: "low",
      permissions: ["read:tasks", "send:email"],
      whenNot: [
        "Promemoria già inviato oggi per la stessa scadenza: non duplicare",
        "Scadenze aziendali formali: tracciate da Preventivi & Finanza",
      ],
      procedure: [
        "Elenca le scadenze entro 3 giorni",
        "Per ciascuna indica il margine residuo e se è già in ritardo",
        "Segnala quelle in ritardo con la nuova data proposta",
        "Invia un promemoria sintetico (max 5 righe)",
        "Propone l'aggiornamento delle date se il margine è irrecuperabile",
      ],
      rules: [
        "Un promemoria per scadenza al giorno",
        "Le scadenze in ritardo si dicono apertamente: niente allarmi impliciti",
        "Nessun invio automatico a terzi: solo al responsabile interno",
      ],
      output:
        "Promemoria inviato con elenco scadenze (scadenza, margine, stato) + proposta per le date scadute",
      example: "Cosa scade nei prossimi 3 giorni?",
    },
  ],
  agents: [
    { slug: "personal-assistant", fit: "primary", rationale: "Personal Assistant gestisce task e progetti" },
    { slug: "business-manager", fit: "primary", rationale: "Business Manager traccia l'avanzamento dei progetti" },
    { slug: "email-manager", fit: "secondary", rationale: "Email Manager comunica task e scadenze" },
  ],
  integrations: [
    { brand: "trello", status: "optional", rationale: "Trello per il project management" },
    { brand: "asana", status: "optional", rationale: "Asana per la gestione dei task" },
    { brand: "clickup", status: "optional", rationale: "ClickUp per la gestione dei progetti" },
    { brand: "notion", status: "optional", rationale: "Notion per task e documenti" },
    { brand: "slack", status: "optional", rationale: "Slack per le notifiche al team" },
    { brand: "github", status: "optional", rationale: "GitHub per i team tecnici" },
    { brand: "jira", status: "optional", rationale: "Jira per i project enterprise" },
    { brand: "microsoftteams", status: "optional", rationale: "Teams per la collaborazione" },
  ],
};

/** Catalogo completo dei plugin ufficiali. */
export const SKILL_PLUGINS: SkillPlugin[] = [
  ECOMMERCE,
  LEAD_SALES,
  SUPPORT,
  BOOKINGS,
  QUOTES,
  CONTENT_SEO,
  SOCIAL,
  INBOX,
  REPORTS,
  HR,
  DOCUMENTS,
  RESEARCH,
  PROJECTS,
];

/** Tutte le skill del catalogo, con il plugin di appartenenza. */
export function allCatalogSkills(): (SkillEntry & { pluginSlug: string })[] {
  return SKILL_PLUGINS.flatMap((p) => p.skills.map((s) => ({ ...s, pluginSlug: p.slug })));
}

export function getCatalogPlugin(slug: string): SkillPlugin | undefined {
  return SKILL_PLUGINS.find((p) => p.slug === slug);
}

export function getCatalogSkill(slug: string): (SkillEntry & { pluginSlug: string }) | undefined {
  return allCatalogSkills().find((s) => s.slug === slug);
}

/** Plugin consigliati per un agente (primary prima, poi secondary). */
export function catalogPluginsForAgent(agentSlug: string): SkillPlugin[] {
  return SKILL_PLUGINS.filter((p) => p.agents.some((a) => a.slug === agentSlug)).sort((a, b) => {
    const rank = (p: SkillPlugin) =>
      p.agents.find((x) => x.slug === agentSlug)?.fit === "primary" ? 0 : 1;
    return rank(a) - rank(b);
  });
}

/* ------------------------------------------------------------------ *
 * Integrazioni: un solo interruttore `available` per tutto il sito
 * ------------------------------------------------------------------ */

/** Voce del catalogo integrazioni (brand, nome, disponibilità reale). */
export type ResolvedIntegration = PluginIntegration & {
  name: string;
  brand: string;
  available: boolean;
  category: string;
};

/**
 * Risolve gli slug di integrazione del plugin contro il catalogo ufficiale.
 *
 * Perché: il catalogo plugin scrive gli slug in forma leggibile
 * (`google-sheets`), mentre la UI usa il brand (`googlesheets`). Qui le due
 * forme si incontrano e la disponibilità resta quella dichiarata da
 * `INTEGRATIONS`, così "in arrivo" è detto in un posto solo.
 */
export function resolveIntegration(integration: PluginIntegration): ResolvedIntegration | null {
  const key = integration.brand.toLowerCase();
  const entry = INTEGRATIONS.find(
    (i) => i.brand === key || i.name.toLowerCase().replace(/\s+/g, "-") === key,
  );
  if (!entry) return null;
  return {
    ...integration,
    brand: entry.brand,
    name: entry.name,
    available: entry.available,
    category: entry.category,
  };
}

/** Integrazioni del plugin già risolte (quelle ignote vengono escluse). */
export function resolvePluginIntegrations(plugin: SkillPlugin): ResolvedIntegration[] {
  return plugin.integrations
    .map(resolveIntegration)
    .filter((i): i is ResolvedIntegration => i !== null);
}

/**
 * Integrazioni MANCANTI per usare il plugin: obbligatorie e disponibili oggi.
 *
 * Regola di prodotto: un'integrazione "in arrivo" non blocca mai
 * l'installazione — il prompt lo dice esplicitamente — quindi qui filtriamo
 * per `available && status === "required"`.
 */
export function missingRequiredIntegrations(plugin: SkillPlugin): ResolvedIntegration[] {
  return resolvePluginIntegrations(plugin).filter((i) => i.status === "required" && i.available);
}

/** Numero di integrazioni live del plugin (per il badge sulla card). */
export function countLiveIntegrations(plugin: SkillPlugin): number {
  return resolvePluginIntegrations(plugin).filter((i) => i.available).length;
}

/**
 * Quante competenze del catalogo usano ciascuna integrazione, per brand.
 *
 * Serve alla pagina Integrazioni per la riga "Usata da N competenze". Il
 * conteggio è sulle SKILL (non sui plugin): è la domanda che si pone l'utente
 * guardando una card ("cosa posso farci?"). Le integrazioni "in arrivo"
 * contano, perché le competenze le usano in modalità manuale.
 */
export function skillUsageCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const plugin of SKILL_PLUGINS) {
    for (const integration of plugin.integrations) {
      const resolved = resolveIntegration(integration);
      if (!resolved) continue;
      counts[resolved.brand] = (counts[resolved.brand] ?? 0) + 1;
    }
  }
  return counts;
}
