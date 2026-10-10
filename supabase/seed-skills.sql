-- Skills & Plugins — seed del catalogo ufficiale
--
-- GENERATO a partire da src/lib/skills/catalog.ts. Non modificarlo a
-- mano: modifica il catalogo e rigenera questo file.
--
-- 13 plugin, 60 skill, tutte in italiano.
--
-- Gli slug di agenti e integrazioni sono quelli REALI del marketplace
-- (src/lib/agents.ts) e del catalogo integrazioni (src/lib/integrations.ts):
-- è ciò che permette a /skills e alle card agente di linkare senza
-- traduzioni intermedie.

-- Idempotente: ogni INSERT usa `ON CONFLICT ... DO UPDATE` sulla chiave
-- naturale (slug), quindi rieseguire il file aggiorna le righe senza
-- duplicarle.

-- === PLUGINS ===

-- 🛒 Operazioni E-commerce · Gestisci catalogo, ordini e magazzino
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version)
VALUES ('ecommerce-operations', 'Operazioni E-commerce', 'Gestisci catalogo, ordini e magazzino', 'Suite completa per gestire le operazioni e-commerce: ricerca prodotti con link carrello, stato ordine e tracking, gestione sconti, allerta scorte con previsione di riordino e riepilogo vendite.', 'ecommerce', 'shopping-cart', 'included', '1.0.0')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  price_tier = EXCLUDED.price_tier,
  version = EXCLUDED.version;

-- 🎯 Lead & Vendite · Cattura, qualifica e converte lead
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version)
VALUES ('lead-sales', 'Lead & Vendite', 'Cattura, qualifica e converte lead', 'Sistema per il lead management: cattura e validazione dei contatti, arricchimento del profilo, scoring High/Medium/Low, notifica al team, sequenza di follow-up e aggiornamento della pipeline.', 'sales', 'target', 'included', '1.0.0')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  price_tier = EXCLUDED.price_tier,
  version = EXCLUDED.version;

-- 💬 Assistenza & Reputazione · Supporto clienti e gestione recensioni
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version)
VALUES ('support-reputation', 'Assistenza & Reputazione', 'Supporto clienti e gestione recensioni', 'Suite per il customer service: risposta dalla knowledge base con escalation, classificazione dell''urgenza dei ticket, bozza di risposta alle recensioni con analisi del sentiment, gestione reclami e tono di voce del brand.', 'support', 'messages-square', 'included', '1.0.0')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  price_tier = EXCLUDED.price_tier,
  version = EXCLUDED.version;

-- 📅 Prenotazioni & Agenda · Gestisci appuntamenti e calendario
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version)
VALUES ('bookings-calendar', 'Prenotazioni & Agenda', 'Gestisci appuntamenti e calendario', 'Sistema per la gestione dell''agenda: verifica della disponibilità e proposta di slot, prenotazione con link video, promemoria e gestione dei no-show, riprogrammazioni e cancellazioni, pianificazione della giornata e blocchi di deep work.', 'productivity', 'calendar-days', 'included', '1.0.0')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  price_tier = EXCLUDED.price_tier,
  version = EXCLUDED.version;

-- 💰 Preventivi & Finanza · Genera preventivi e gestisci contabilità
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version)
VALUES ('quotes-finance', 'Preventivi & Finanza', 'Genera preventivi e gestisci contabilità', 'Suite finanziaria: raccolta dei requisiti e calcolo del preventivo con IVA, generazione del documento formale, riconciliazione di entrate e uscite, scadenzario fiscale con solleciti ed estrazione dati dalle fatture.', 'finance', 'wallet', 'included', '1.0.0')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  price_tier = EXCLUDED.price_tier,
  version = EXCLUDED.version;

-- ✍️ Contenuti & SEO · Crea contenuti ottimizzati SEO
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version)
VALUES ('content-seo', 'Contenuti & SEO', 'Crea contenuti ottimizzati SEO', 'Tool per il content marketing: keyword research con intento di ricerca, analisi dei contenuti competitor, articoli SEO strutturati, copy per landing e ads con varianti A/B, sequenze email e newsletter.', 'marketing', 'pen-line', 'included', '1.0.0')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  price_tier = EXCLUDED.price_tier,
  version = EXCLUDED.version;

-- 📱 Social Media · Gestisci presenza sui social
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version)
VALUES ('social-media', 'Social Media', 'Gestisci presenza sui social', 'Suite social media: calendario editoriale settimanale, caption per canale (Instagram, LinkedIn, TikTok, Facebook), ricerca hashtag e trend, riuso di un contenuto su più canali e report di performance.', 'marketing', 'smartphone', 'included', '1.0.0')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  price_tier = EXCLUDED.price_tier,
  version = EXCLUDED.version;

-- 📧 Inbox & Produttività · Triage email e gestione task
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version)
VALUES ('inbox-productivity', 'Inbox & Produttività', 'Triage email e gestione task', 'Sistema di produttività: triage delle email per priorità, bozze di risposta, tracciamento di scadenze e impegni, riepilogo giornaliero, verbali di riunione e metodo inbox zero.', 'productivity', 'mail', 'included', '1.0.0')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  price_tier = EXCLUDED.price_tier,
  version = EXCLUDED.version;

-- 📊 Report & Decisioni · Analisi dati e decisioni strategiche
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version)
VALUES ('reports-bi', 'Report & Decisioni', 'Analisi dati e decisioni strategiche', 'Business intelligence: report KPI settimanali e mensili, confronto periodo su periodo, rilevamento anomalie, priorità strategiche e sintesi per il titolare in linguaggio semplice.', 'analytics', 'bar-chart-3', 'included', '1.0.0')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  price_tier = EXCLUDED.price_tier,
  version = EXCLUDED.version;

-- 👥 HR & Selezione · Gestisci candidature e reclutamento
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version)
VALUES ('hr-recruiting', 'HR & Selezione', 'Gestisci candidature e reclutamento', 'Suite HR: screening dei CV rispetto alla job description, matching delle competenze, domande di pre-qualifica, feedback strutturato ai candidati, pianificazione dei colloqui e scheda candidato.', 'hr', 'users', 'included', '1.0.0')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  price_tier = EXCLUDED.price_tier,
  version = EXCLUDED.version;

-- 📄 Documenti & Ufficio · Gestisci documenti e ufficio
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version)
VALUES ('documents-office', 'Documenti & Ufficio', 'Gestisci documenti e ufficio', 'Suite documentale: lettura e riassunto di PDF, estrazione di dati strutturati, confronto tra versioni di contratto, creazione e modifica di documenti Word, Excel e PowerPoint, risposte a domande sul contenuto del documento.', 'productivity', 'file-text', 'included', '1.0.0')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  price_tier = EXCLUDED.price_tier,
  version = EXCLUDED.version;

-- 🔍 Ricerca Competitor · Analizza mercato e competitor
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version)
VALUES ('research-competitor', 'Ricerca Competitor', 'Analizza mercato e competitor', 'Tool di market research: ricerca di mercato con fonti verificabili, confronto di prezzi e recensioni, scheda competitor completa e sintesi con citazioni e livello di confidenza.', 'research', 'search', 'included', '1.0.0')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  price_tier = EXCLUDED.price_tier,
  version = EXCLUDED.version;

-- ✅ Progetti & Task · Gestisci progetti e task
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version)
VALUES ('projects-tasks', 'Progetti & Task', 'Gestisci progetti e task', 'Project management: trasformare le richieste in task, aggiornare le board, report di avanzamento, standup automatico e promemoria delle scadenze.', 'productivity', 'list-checks', 'included', '1.0.0')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  price_tier = EXCLUDED.price_tier,
  version = EXCLUDED.version;

-- === SKILLS ===

-- Ogni skill è un file SKILL.md scaricabile: `description` è il testo
-- che l'agente legge per decidere se attivarla (progressive
-- disclosure), `permissions` è il soffitto di ciò che può fare.

-- Operazioni E-commerce (5 skill)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
  ('catalog-search', 'Ricerca Catalogo', 'Cerca prodotti nel catalogo e genera link carrello. Usare quando il cliente chiede informazioni su prodotti, disponibilità o prezzi.', '1.0.0', 'it', 'official', 'low', ARRAY['read:products']),
  ('order-tracking', 'Tracking Ordine', 'Verifica lo stato di un ordine e fornisce il tracking. Usare per richieste tipo ''dove è il mio ordine'' o aggiornamenti sulla spedizione.', '1.0.0', 'it', 'official', 'low', ARRAY['read:orders']),
  ('discount-management', 'Gestione Sconti', 'Gestisce codici sconto e promozioni. Usare su richieste di sconto o promozioni; richiede approvazione per sconti superiori al 20%.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:orders', 'update:orders']),
  ('stock-alert', 'Allerta Scorte', 'Monitora i livelli di scorte e genera previsioni di riordino. Usare per allertare quando un prodotto scende sotto la soglia minima.', '1.0.0', 'it', 'official', 'low', ARRAY['read:inventory']),
  ('sales-summary', 'Riepilogo Vendite', 'Genera un report vendite giornaliero, settimanale o mensile con metriche chiave e variazione sul periodo precedente.', '1.0.0', 'it', 'official', 'low', ARRAY['read:orders', 'read:products'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  risk_level = EXCLUDED.risk_level,
  permissions = EXCLUDED.permissions;

-- Lead & Vendite (5 skill)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
  ('lead-capture', 'Cattura Lead', 'Cattura e valida nuovi lead da varie fonti. Usare quando arriva una richiesta di contatto, una richiesta di preventivo o un form da compilare.', '1.0.0', 'it', 'official', 'low', ARRAY['read:contacts', 'create:contacts']),
  ('lead-enrichment', 'Arricchimento Profilo', 'Arricchisce il profilo del lead con dati aziendali e storicizza le interazioni. Usare dopo la cattura per completare la scheda.', '1.0.0', 'it', 'official', 'low', ARRAY['read:contacts', 'update:contacts']),
  ('lead-scoring', 'Scoring Lead', 'Assegna un punteggio High/Medium/Low al lead basandosi su engagement, budget e tempistiche. Usare per decidere priorità di follow-up.', '1.0.0', 'it', 'official', 'low', ARRAY['read:contacts']),
  ('team-notification', 'Notifica Team', 'Notifica il team vendite su un lead hot con sintesi e azioni suggerite. Usare quando un lead supera la soglia High.', '1.0.0', 'it', 'official', 'medium', ARRAY['send:notifications']),
  ('followup-sequence', 'Sequenza Follow-up', 'Crea e gestisce sequenze di follow-up personalizzate basate sul punteggio del lead. Usare per chiudere trattative in sospeso.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:contacts', 'update:contacts', 'send:email'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  risk_level = EXCLUDED.risk_level,
  permissions = EXCLUDED.permissions;

-- Assistenza & Reputazione (4 skill)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
  ('kb-response', 'Risposta Knowledge Base', 'Risponde alle domande dei clienti basandosi sulla knowledge base aziendale. Usare quando la domanda ha una risposta documentata; scala se incerto.', '1.0.0', 'it', 'official', 'low', ARRAY['read:kb']),
  ('ticket-urgency', 'Classificazione Urgenza', 'Classifica i ticket per urgenza (critical, high, medium, low) in base a SLA e impatto sul cliente. Usare a ogni nuovo ticket.', '1.0.0', 'it', 'official', 'low', ARRAY['read:tickets']),
  ('review-draft', 'Bozza Recensione', 'Genera la bozza di risposta a una recensione analizzando il sentiment. Usare per rispondere a recensioni positive o negative.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:reviews', 'update:reviews']),
  ('complaint-handling', 'Gestione Reclami', 'Gestisce i reclami con procedura standard, verifica la fattibilità della soluzione e mantiene il registro. Usare sui reclami formali.', '1.0.0', 'it', 'official', 'high', ARRAY['read:tickets', 'update:tickets', 'send:email'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  risk_level = EXCLUDED.risk_level,
  permissions = EXCLUDED.permissions;

-- Prenotazioni & Agenda (5 skill)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
  ('availability-check', 'Verifica Disponibilità', 'Verifica la disponibilità del calendario e propone slot ottimali rispettando le preferenze. Usare all''inizio di ogni richiesta di appuntamento.', '1.0.0', 'it', 'official', 'low', ARRAY['read:calendar']),
  ('booking-creation', 'Creazione Prenotazione', 'Crea l''appuntamento nel calendario con link video e invia la conferma. Usare dopo che il cliente ha scelto lo slot.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:calendar', 'create:events', 'send:email']),
  ('reminder-no-show', 'Promemoria No-show', 'Gestisce i promemoria pre-appuntamento e il follow-up in caso di no-show. Usare per tutti gli appuntamenti confermati.', '1.0.0', 'it', 'official', 'low', ARRAY['read:calendar', 'send:email']),
  ('reschedule-cancel', 'Riprogrammazione/Cancellazione', 'Gestisce richieste di modifica o cancellazione applicando le politiche aziendali. Usare quando un cliente chiede di spostare o annullare.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:calendar', 'update:events', 'send:email']),
  ('day-planning', 'Pianificazione Giornata', 'Organizza la giornata con blocchi di deep work e gestisce le priorità. Usare la mattina o su richiesta di piano giornaliero.', '1.0.0', 'it', 'official', 'low', ARRAY['read:calendar', 'read:tasks'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  risk_level = EXCLUDED.risk_level,
  permissions = EXCLUDED.permissions;

-- Preventivi & Finanza (4 skill)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
  ('quote-calculation', 'Calcolo Preventivo', 'Raccoglie i requisiti e calcola il preventivo con imponibile, IVA 22% e sconti. Usare quando il cliente chiede un preventivo.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:products', 'read:services']),
  ('document-generation', 'Generazione Documento', 'Genera il documento formale (Word/PDF) a partire dal template aziendale. Usare dopo il calcolo del preventivo.', '1.0.0', 'it', 'official', 'medium', ARRAY['create:documents']),
  ('reconciliation', 'Riconciliazione', 'Riconcilia entrate e uscite confrontando fatture e movimenti bancari. Usare a fine mese o su richiesta di quadratura.', '1.0.0', 'it', 'official', 'high', ARRAY['read:transactions', 'read:invoices']),
  ('fiscal-deadlines', 'Scadenzario Fiscale', 'Gestisce le scadenze fiscali e prepara i solleciti. Usare per il monitoraggio periodico delle scadenze.', '1.0.0', 'it', 'official', 'high', ARRAY['read:invoices', 'send:email'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  risk_level = EXCLUDED.risk_level,
  permissions = EXCLUDED.permissions;

-- Contenuti & SEO (4 skill)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
  ('keyword-research', 'Keyword Research', 'Ricerca keyword con analisi di volume, difficoltà e intento di ricerca. Usare prima di scrivere qualsiasi contenuto SEO.', '1.0.0', 'it', 'official', 'low', ARRAY['read:analytics']),
  ('competitor-analysis', 'Analisi Competitor', 'Analizza i contenuti dei competitor per individuare gap e opportunità. Usare prima di definire il piano editoriale.', '1.0.0', 'it', 'official', 'low', ARRAY['read:web']),
  ('seo-article', 'Articolo SEO', 'Genera un articolo SEO strutturato con heading, meta description e ottimizzazione on-page. Usare quando la keyword è già definita.', '1.0.0', 'it', 'official', 'low', ARRAY['create:content']),
  ('copy-ads', 'Copy per Ads', 'Crea copy per landing page e ads con varianti A/B test. Usare per campagne e pagine di destinazione.', '1.0.0', 'it', 'official', 'low', ARRAY['create:content'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  risk_level = EXCLUDED.risk_level,
  permissions = EXCLUDED.permissions;

-- Social Media (5 skill)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
  ('editorial-calendar', 'Calendario Editoriale', 'Pianifica il calendario editoriale settimanale con temi, formati e deadline. Usare all''inizio della settimana.', '1.0.0', 'it', 'official', 'low', ARRAY['read:calendar', 'create:tasks']),
  ('caption-generation', 'Generazione Caption', 'Genera caption ottimizzate per Instagram, LinkedIn, TikTok e Facebook. Usare per scrivere il testo di un post già pianificato.', '1.0.0', 'it', 'official', 'low', ARRAY['create:content']),
  ('hashtag-research', 'Ricerca Hashtag', 'Ricerca hashtag e trend per piattaforma con analisi dell''engagement. Usare prima della pubblicazione.', '1.0.0', 'it', 'official', 'low', ARRAY['read:social']),
  ('content-repurposing', 'Riuso Contenuti', 'Adatta un contenuto esistente a più canali mantenendo la coerenza di tono. Usare per massimizzare un contenuto già prodotto.', '1.0.0', 'it', 'official', 'low', ARRAY['create:content']),
  ('social-performance-report', 'Report Performance', 'Genera il report di performance dei canali social con trend e azioni. Usare a fine mese o settimana.', '1.0.0', 'it', 'official', 'low', ARRAY['read:social', 'read:analytics'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  risk_level = EXCLUDED.risk_level,
  permissions = EXCLUDED.permissions;

-- Inbox & Produttività (4 skill)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
  ('email-triage', 'Triage Email', 'Classifica le email per priorità (urgent, important, normal) in base a contenuto, mittente e scadenze. Usare a inizio giornata.', '1.0.0', 'it', 'official', 'low', ARRAY['read:email']),
  ('email-draft', 'Bozza Risposta', 'Genera la bozza di risposta email basandosi sul contesto e sulle preferenze del mittente. Usare su richieste che richiedono risposta.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:email', 'create:email']),
  ('deadline-tracking', 'Tracciamento Scadenze', 'Traccia scadenze e impegni con notifiche a priorità. Usare per non perdere gli impegni presi nelle email.', '1.0.0', 'it', 'official', 'low', ARRAY['read:tasks', 'create:tasks']),
  ('meeting-notes', 'Verbali Riunione', 'Genera i verbali di riunione con action item e responsabili. Usare dopo ogni riunione con note o trascrizione.', '1.0.0', 'it', 'official', 'low', ARRAY['read:meetings', 'create:documents'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  risk_level = EXCLUDED.risk_level,
  permissions = EXCLUDED.permissions;

-- Report & Decisioni (5 skill)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
  ('kpi-report', 'Report KPI', 'Genera il report dei KPI settimanali o mensili con metriche chiave e trend. Usare per il ritmo settimanale o mensile.', '1.0.0', 'it', 'official', 'low', ARRAY['read:analytics', 'read:data']),
  ('period-comparison', 'Confronto Periodi', 'Confronta i dati di un periodo con il precedente analizzando variazioni e anomalie. Usare per capire cosa è cambiato.', '1.0.0', 'it', 'official', 'low', ARRAY['read:data']),
  ('anomaly-detection', 'Rilevamento Anomalie', 'Rileva anomalie nei dati e propone le verifiche. Usare quando un numero si discosta dalla norma.', '1.0.0', 'it', 'official', 'low', ARRAY['read:data']),
  ('strategic-priorities', 'Priorità Strategiche', 'Trasforma i dati in priorità strategiche con impatto e costo stimato. Usare per decidere dove investire il tempo.', '1.0.0', 'it', 'official', 'low', ARRAY['read:data']),
  ('executive-summary', 'Sintesi Executive', 'Riassume i dati per il titolare in linguaggio semplice, senza gergo. Usare per il briefing settimanale.', '1.0.0', 'it', 'official', 'low', ARRAY['read:data', 'create:reports'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  risk_level = EXCLUDED.risk_level,
  permissions = EXCLUDED.permissions;

-- HR & Selezione (5 skill)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
  ('cv-screening', 'Screening CV', 'Confronta i CV con la job description e genera il matching delle competenze. Usare su nuove candidature.', '1.0.0', 'it', 'official', 'low', ARRAY['read:documents']),
  ('candidate-matching', 'Matching Candidati', 'Confronta le competenze del candidato con i requisiti del ruolo e genera una graduatoria. Usare dopo lo screening di più candidature.', '1.0.0', 'it', 'official', 'low', ARRAY['read:candidates', 'update:candidates']),
  ('interview-questions', 'Domande Colloquio', 'Genera le domande di pre-qualifica basate sul ruolo e sul livello di esperienza. Usare prima del colloquio.', '1.0.0', 'it', 'official', 'low', ARRAY['read:roles']),
  ('candidate-feedback', 'Feedback Candidati', 'Genera il feedback strutturato per i candidati dopo il colloquio. Usare per comunicare esito e feedback.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:candidates', 'update:candidates', 'send:email']),
  ('interview-planning', 'Pianificazione Colloqui', 'Pianifica i colloqui (chi intervista, quando, con quali domande) e prepara la scheda candidato. Usare per organizzare le giornate di colloquio.', '1.0.0', 'it', 'official', 'low', ARRAY['read:calendar', 'create:events'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  risk_level = EXCLUDED.risk_level,
  permissions = EXCLUDED.permissions;

-- Documenti & Ufficio (5 skill)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
  ('pdf-summary', 'Riassunto PDF', 'Legge e riassume un documento PDF estraendo i punti chiave. Usare su contratti, fatture, manuali e report lunghi.', '1.0.0', 'it', 'official', 'low', ARRAY['read:documents']),
  ('data-extraction', 'Estrazione Dati', 'Estrae dati strutturati da documenti (tabelle, date, importi). Usare per popolare fogli di calcolo o report.', '1.0.0', 'it', 'official', 'low', ARRAY['read:documents']),
  ('document-qa', 'Q&A Documenti', 'Risponde a domande sul contenuto dei documenti con citazioni. Usare quando l''utente chiede informazioni su un documento caricato.', '1.0.0', 'it', 'official', 'low', ARRAY['read:documents']),
  ('document-creation', 'Creazione Documenti', 'Crea e modifica documenti Word, Excel e PowerPoint. Usare quando serve un documento nuovo o aggiornare uno esistente.', '1.0.0', 'it', 'official', 'medium', ARRAY['create:documents']),
  ('version-comparison', 'Confronto Versioni', 'Confronta due versioni di un documento e elenca le differenze. Usare su revisioni di contratto o bozze.', '1.0.0', 'it', 'official', 'low', ARRAY['read:documents'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  risk_level = EXCLUDED.risk_level,
  permissions = EXCLUDED.permissions;

-- Ricerca Competitor (4 skill)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
  ('market-research', 'Ricerca Mercato', 'Ricerca il mercato di riferimento con fonti verificabili e analisi dei trend. Usare all''inizio di un''analisi.', '1.0.0', 'it', 'official', 'low', ARRAY['read:web']),
  ('price-comparison', 'Confronto Prezzi', 'Confronta i prezzi dei competitor con la nostra offerta. Usare per decidere il posizionamento.', '1.0.0', 'it', 'official', 'low', ARRAY['read:web']),
  ('competitor-profile', 'Scheda Competitor', 'Genera la scheda competitor completa con prezzi, recensioni e posizionamento. Usare per le analisi periodiche.', '1.0.0', 'it', 'official', 'low', ARRAY['read:web']),
  ('insight-synthesis', 'Sintesi con Citazioni', 'Sintetizza le ricerche in un documento con citazioni e livello di confidenza. Usare per chiudere un''analisi.', '1.0.0', 'it', 'official', 'low', ARRAY['read:web', 'create:documents'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  risk_level = EXCLUDED.risk_level,
  permissions = EXCLUDED.permissions;

-- Progetti & Task (5 skill)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
  ('request-to-task', 'Richiesta a Task', 'Trasforma una richiesta verbale in task strutturati con priorità e deadline. Usare su richieste da smistare.', '1.0.0', 'it', 'official', 'low', ARRAY['read:requests', 'create:tasks']),
  ('board-update', 'Aggiornamento Board', 'Aggiorna la project board (Trello, Asana, ClickUp) con lo stato dei task. Usare a fine giornata.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:tasks', 'update:tasks']),
  ('progress-report', 'Report Avanzamento', 'Genera il report di avanzamento del progetto con bloccanti e prossimi passi. Usare per il cliente o per la direzione.', '1.0.0', 'it', 'official', 'low', ARRAY['read:tasks', 'read:projects']),
  ('auto-standup', 'Standup Automatico', 'Genera il riepilogo giornaliero di standup dai task del team. Usare la mattina o su richiesta.', '1.0.0', 'it', 'official', 'low', ARRAY['read:tasks']),
  ('deadline-reminder', 'Promemoria Scadenze', 'Ricorda le scadenze in avvicinamento con il margine necessario per agire. Usare in modo programmato o giornaliero.', '1.0.0', 'it', 'official', 'low', ARRAY['read:tasks', 'send:email'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  risk_level = EXCLUDED.risk_level,
  permissions = EXCLUDED.permissions;

-- === PLUGIN-SKILLS ===

-- Operazioni E-commerce
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'ecommerce-operations' AND s.slug IN ('catalog-search', 'order-tracking', 'discount-management', 'stock-alert', 'sales-summary')
ON CONFLICT (plugin_id, skill_id) DO NOTHING;

-- Lead & Vendite
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'lead-sales' AND s.slug IN ('lead-capture', 'lead-enrichment', 'lead-scoring', 'team-notification', 'followup-sequence')
ON CONFLICT (plugin_id, skill_id) DO NOTHING;

-- Assistenza & Reputazione
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'support-reputation' AND s.slug IN ('kb-response', 'ticket-urgency', 'review-draft', 'complaint-handling')
ON CONFLICT (plugin_id, skill_id) DO NOTHING;

-- Prenotazioni & Agenda
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'bookings-calendar' AND s.slug IN ('availability-check', 'booking-creation', 'reminder-no-show', 'reschedule-cancel', 'day-planning')
ON CONFLICT (plugin_id, skill_id) DO NOTHING;

-- Preventivi & Finanza
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'quotes-finance' AND s.slug IN ('quote-calculation', 'document-generation', 'reconciliation', 'fiscal-deadlines')
ON CONFLICT (plugin_id, skill_id) DO NOTHING;

-- Contenuti & SEO
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'content-seo' AND s.slug IN ('keyword-research', 'competitor-analysis', 'seo-article', 'copy-ads')
ON CONFLICT (plugin_id, skill_id) DO NOTHING;

-- Social Media
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'social-media' AND s.slug IN ('editorial-calendar', 'caption-generation', 'hashtag-research', 'content-repurposing', 'social-performance-report')
ON CONFLICT (plugin_id, skill_id) DO NOTHING;

-- Inbox & Produttività
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'inbox-productivity' AND s.slug IN ('email-triage', 'email-draft', 'deadline-tracking', 'meeting-notes')
ON CONFLICT (plugin_id, skill_id) DO NOTHING;

-- Report & Decisioni
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'reports-bi' AND s.slug IN ('kpi-report', 'period-comparison', 'anomaly-detection', 'strategic-priorities', 'executive-summary')
ON CONFLICT (plugin_id, skill_id) DO NOTHING;

-- HR & Selezione
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'hr-recruiting' AND s.slug IN ('cv-screening', 'candidate-matching', 'interview-questions', 'candidate-feedback', 'interview-planning')
ON CONFLICT (plugin_id, skill_id) DO NOTHING;

-- Documenti & Ufficio
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'documents-office' AND s.slug IN ('pdf-summary', 'data-extraction', 'document-qa', 'document-creation', 'version-comparison')
ON CONFLICT (plugin_id, skill_id) DO NOTHING;

-- Ricerca Competitor
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'research-competitor' AND s.slug IN ('market-research', 'price-comparison', 'competitor-profile', 'insight-synthesis')
ON CONFLICT (plugin_id, skill_id) DO NOTHING;

-- Progetti & Task
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'projects-tasks' AND s.slug IN ('request-to-task', 'board-update', 'progress-report', 'auto-standup', 'deadline-reminder')
ON CONFLICT (plugin_id, skill_id) DO NOTHING;

-- === PLUGIN-AGENTS ===

-- `fit = primary` = l'agente è costruito per questa competenza.
-- `secondary` = funziona bene, ma non è il suo caso d'uso principale.

-- Operazioni E-commerce
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
  SELECT p.id, 'shopify-agent', 'primary', 'Shopify Agent gestisce nativamente catalogo e ordini' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
  SELECT p.id, 'inventory-logistics', 'primary', 'Inventory & Logistics gestisce magazzino e scorte' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
  SELECT p.id, 'finance-manager', 'secondary', 'Finance Manager analizza le metriche vendite' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
  SELECT p.id, 'reviews-agent', 'secondary', 'Reviews & Reputation usa i dati ordini per le recensioni' FROM plugins p WHERE p.slug = 'ecommerce-operations'
ON CONFLICT (plugin_id, agent_slug) DO UPDATE SET
  fit = EXCLUDED.fit,
  rationale = EXCLUDED.rationale;

-- Lead & Vendite
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
  SELECT p.id, 'lead-capture', 'primary', 'Lead Capture è dedicato a cattura e gestione lead' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
  SELECT p.id, 'crm-agent', 'primary', 'CRM Agent gestisce pipeline e lead qualificati' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
  SELECT p.id, 'whatsapp-agent', 'secondary', 'WhatsApp Agent segue i lead via chat' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
  SELECT p.id, 'calendar-booking', 'secondary', 'Calendar Booking chiude il lead con un appuntamento' FROM plugins p WHERE p.slug = 'lead-sales'
ON CONFLICT (plugin_id, agent_slug) DO UPDATE SET
  fit = EXCLUDED.fit,
  rationale = EXCLUDED.rationale;

-- Assistenza & Reputazione
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
  SELECT p.id, 'support-agent', 'primary', 'Support Agent gestisce ticket e knowledge base' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
  SELECT p.id, 'reviews-agent', 'primary', 'Reviews & Reputation gestisce recensioni e reputazione' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
  SELECT p.id, 'whatsapp-agent', 'secondary', 'WhatsApp Agent supporta i clienti via chat' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
  SELECT p.id, 'email-manager', 'secondary', 'Email Manager gestisce i ticket via email' FROM plugins p WHERE p.slug = 'support-reputation'
ON CONFLICT (plugin_id, agent_slug) DO UPDATE SET
  fit = EXCLUDED.fit,
  rationale = EXCLUDED.rationale;

-- Prenotazioni & Agenda
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
  SELECT p.id, 'calendar-booking', 'primary', 'Calendar Booking gestisce appuntamenti e disponibilità' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
  SELECT p.id, 'personal-assistant', 'primary', 'Personal Assistant pianifica agenda e task' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
  SELECT p.id, 'hr-recruiter', 'secondary', 'HR & Recruiter pianifica i colloqui' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
  SELECT p.id, 'whatsapp-agent', 'secondary', 'WhatsApp Agent conferma gli appuntamenti via chat' FROM plugins p WHERE p.slug = 'bookings-calendar'
ON CONFLICT (plugin_id, agent_slug) DO UPDATE SET
  fit = EXCLUDED.fit,
  rationale = EXCLUDED.rationale;

-- Preventivi & Finanza
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
  SELECT p.id, 'quote-agent', 'primary', 'Quotes & Estimates genera preventivi professionali' FROM plugins p WHERE p.slug = 'quotes-finance'
UNION ALL
  SELECT p.id, 'finance-manager', 'primary', 'Finance Manager gestisce contabilità e fatture' FROM plugins p WHERE p.slug = 'quotes-finance'
UNION ALL
  SELECT p.id, 'invoice-agent', 'secondary', 'Invoice Agent gestisce la fatturazione' FROM plugins p WHERE p.slug = 'quotes-finance'
UNION ALL
  SELECT p.id, 'business-manager', 'secondary', 'Business Manager analizza le metriche finanziarie' FROM plugins p WHERE p.slug = 'quotes-finance'
ON CONFLICT (plugin_id, agent_slug) DO UPDATE SET
  fit = EXCLUDED.fit,
  rationale = EXCLUDED.rationale;

-- Contenuti & SEO
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
  SELECT p.id, 'seo-agent', 'primary', 'SEO Content Agent ottimizza i contenuti per la ricerca' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
  SELECT p.id, 'copywriter', 'primary', 'Copywriter crea copy persuasivi' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
  SELECT p.id, 'social-media-agent', 'secondary', 'Social Media usa i contenuti per i post' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
  SELECT p.id, 'research-agent', 'secondary', 'Research Agent fornisce i dati per i contenuti' FROM plugins p WHERE p.slug = 'content-seo'
ON CONFLICT (plugin_id, agent_slug) DO UPDATE SET
  fit = EXCLUDED.fit,
  rationale = EXCLUDED.rationale;

-- Social Media
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
  SELECT p.id, 'social-media-agent', 'primary', 'Social Media gestisce la presenza sui social' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
  SELECT p.id, 'copywriter', 'secondary', 'Copywriter crea caption e copy' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
  SELECT p.id, 'reviews-agent', 'secondary', 'Reviews & Reputation gestisce le recensioni social' FROM plugins p WHERE p.slug = 'social-media'
ON CONFLICT (plugin_id, agent_slug) DO UPDATE SET
  fit = EXCLUDED.fit,
  rationale = EXCLUDED.rationale;

-- Inbox & Produttività
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
  SELECT p.id, 'email-manager', 'primary', 'Email Manager gestisce inbox ed email' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
  SELECT p.id, 'email-agent', 'primary', 'Email Agent fa triage e risponde alle email' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
  SELECT p.id, 'personal-assistant', 'primary', 'Personal Assistant gestisce la produttività' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
  SELECT p.id, 'business-manager', 'secondary', 'Business Manager usa le sintesi di produttività' FROM plugins p WHERE p.slug = 'inbox-productivity'
ON CONFLICT (plugin_id, agent_slug) DO UPDATE SET
  fit = EXCLUDED.fit,
  rationale = EXCLUDED.rationale;

-- Report & Decisioni
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
  SELECT p.id, 'business-manager', 'primary', 'Business Manager analizza dati e decisioni' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
  SELECT p.id, 'analytics-agent', 'primary', 'Analytics Agent genera report dettagliati' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
  SELECT p.id, 'finance-manager', 'secondary', 'Finance Manager usa i dati finanziari' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
  SELECT p.id, 'shopify-agent', 'secondary', 'Shopify Agent fornisce i dati e-commerce' FROM plugins p WHERE p.slug = 'reports-bi'
ON CONFLICT (plugin_id, agent_slug) DO UPDATE SET
  fit = EXCLUDED.fit,
  rationale = EXCLUDED.rationale;

-- HR & Selezione
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
  SELECT p.id, 'hr-recruiter', 'primary', 'HR & Recruiter gestisce la selezione del personale' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
  SELECT p.id, 'calendar-booking', 'secondary', 'Calendar Booking pianifica i colloqui' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
  SELECT p.id, 'email-manager', 'secondary', 'Email Manager comunica con i candidati' FROM plugins p WHERE p.slug = 'hr-recruiting'
ON CONFLICT (plugin_id, agent_slug) DO UPDATE SET
  fit = EXCLUDED.fit,
  rationale = EXCLUDED.rationale;

-- Documenti & Ufficio
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
  SELECT p.id, 'document-agent', 'primary', 'Document Agent gestisce i documenti' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
  SELECT p.id, 'quote-agent', 'primary', 'Quotes & Estimates genera i documenti formali' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
  SELECT p.id, 'business-manager', 'secondary', 'Business Manager analizza i documenti' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
  SELECT p.id, 'support-agent', 'secondary', 'Support Agent risponde sulle domande dei clienti' FROM plugins p WHERE p.slug = 'documents-office'
ON CONFLICT (plugin_id, agent_slug) DO UPDATE SET
  fit = EXCLUDED.fit,
  rationale = EXCLUDED.rationale;

-- Ricerca Competitor
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
  SELECT p.id, 'research-agent', 'primary', 'Research Agent analizza mercato e competitor' FROM plugins p WHERE p.slug = 'research-competitor'
UNION ALL
  SELECT p.id, 'seo-agent', 'secondary', 'SEO Content usa i dati dei competitor' FROM plugins p WHERE p.slug = 'research-competitor'
UNION ALL
  SELECT p.id, 'business-manager', 'secondary', 'Business Manager usa le analisi' FROM plugins p WHERE p.slug = 'research-competitor'
UNION ALL
  SELECT p.id, 'social-media-agent', 'secondary', 'Social Media monitora i competitor' FROM plugins p WHERE p.slug = 'research-competitor'
ON CONFLICT (plugin_id, agent_slug) DO UPDATE SET
  fit = EXCLUDED.fit,
  rationale = EXCLUDED.rationale;

-- Progetti & Task
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
  SELECT p.id, 'personal-assistant', 'primary', 'Personal Assistant gestisce task e progetti' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
  SELECT p.id, 'business-manager', 'primary', 'Business Manager traccia l''avanzamento dei progetti' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
  SELECT p.id, 'email-manager', 'secondary', 'Email Manager comunica task e scadenze' FROM plugins p WHERE p.slug = 'projects-tasks'
ON CONFLICT (plugin_id, agent_slug) DO UPDATE SET
  fit = EXCLUDED.fit,
  rationale = EXCLUDED.rationale;

-- === PLUGIN-INTEGRATIONS ===

-- `status = required` = la competenza la usa per funzionare.
-- `availability = coming_soon` = non è ancora collegabile: MAI un
-- prerequisito (l'utente può installare comunque e la competenza lavora
-- in modalità manuale).

-- Operazioni E-commerce
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
  SELECT p.id, 'woocommerce', 'required', 'live', 'WooCommerce fornisce catalogo e ordini' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
  SELECT p.id, 'shopify', 'required', 'coming_soon', 'Shopify gestisce catalogo e ordini nativi' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
  SELECT p.id, 'googlesheets', 'optional', 'live', 'Sheets fa da magazzino leggero' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
  SELECT p.id, 'airtable', 'optional', 'live', 'Airtable gestisce l'inventario' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
  SELECT p.id, 'slack', 'optional', 'live', 'Slack notifica le scorte critiche' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
  SELECT p.id, 'gmail', 'optional', 'live', 'Gmail invia gli aggiornamenti ordine' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
  SELECT p.id, 'paypal', 'optional', 'coming_soon', 'PayPal processa i pagamenti' FROM plugins p WHERE p.slug = 'ecommerce-operations'
ON CONFLICT (plugin_id, integration_slug) DO UPDATE SET
  status = EXCLUDED.status,
  availability = EXCLUDED.availability,
  rationale = EXCLUDED.rationale;

-- Lead & Vendite
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
  SELECT p.id, 'hubspot', 'required', 'live', 'HubSpot è la fonte di verità dei contatti' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
  SELECT p.id, 'slack', 'optional', 'live', 'Slack avvisa in tempo reale sui lead hot' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
  SELECT p.id, 'gmail', 'optional', 'live', 'Gmail invia il follow-up email' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
  SELECT p.id, 'googlesheets', 'optional', 'live', 'Sheets traccia la pipeline dei lead' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
  SELECT p.id, 'googlecalendar', 'optional', 'live', 'Calendar prenota le follow-up call' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
  SELECT p.id, 'whatsapp', 'optional', 'coming_soon', 'WhatsApp segue il lead via chat' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
  SELECT p.id, 'calendly', 'optional', 'coming_soon', 'Calendly prenota il meeting' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
  SELECT p.id, 'mailchimp', 'optional', 'coming_soon', 'Mailchimp gestisce le campagne email' FROM plugins p WHERE p.slug = 'lead-sales'
ON CONFLICT (plugin_id, integration_slug) DO UPDATE SET
  status = EXCLUDED.status,
  availability = EXCLUDED.availability,
  rationale = EXCLUDED.rationale;

-- Assistenza & Reputazione
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
  SELECT p.id, 'slack', 'required', 'live', 'Slack gestisce l''escalation umana' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
  SELECT p.id, 'notion', 'required', 'live', 'Notion è la knowledge base (RAG)' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
  SELECT p.id, 'googledrive', 'optional', 'live', 'Drive ospita i documenti della knowledge base' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
  SELECT p.id, 'gmail', 'optional', 'live', 'Gmail gestisce i ticket via email' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
  SELECT p.id, 'googlesheets', 'optional', 'live', 'Sheets traccia ticket e SLA' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
  SELECT p.id, 'zendesk', 'optional', 'coming_soon', 'Zendesk gestisce i ticket avanzati' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
  SELECT p.id, 'whatsapp', 'optional', 'coming_soon', 'WhatsApp supporta i clienti in chat' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
  SELECT p.id, 'googlechat', 'optional', 'coming_soon', 'Google Chat gestisce il supporto interno' FROM plugins p WHERE p.slug = 'support-reputation'
ON CONFLICT (plugin_id, integration_slug) DO UPDATE SET
  status = EXCLUDED.status,
  availability = EXCLUDED.availability,
  rationale = EXCLUDED.rationale;

-- Prenotazioni & Agenda
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
  SELECT p.id, 'googlecalendar', 'required', 'live', 'Calendar è indispensabile per le prenotazioni' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
  SELECT p.id, 'gmail', 'optional', 'live', 'Gmail invia conferme e promemoria' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
  SELECT p.id, 'notion', 'optional', 'live', 'Notion tiene note dei meeting e dei task' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
  SELECT p.id, 'googlemeet', 'optional', 'coming_soon', 'Google Meet genera il link video' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
  SELECT p.id, 'microsoftoutlook', 'optional', 'coming_soon', 'Outlook amplia la copertura del calendario' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
  SELECT p.id, 'calendly', 'optional', 'coming_soon', 'Calendly semplifica la prenotazione' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
  SELECT p.id, 'googletasks', 'optional', 'coming_soon', 'Google Tasks sincronizza i task' FROM plugins p WHERE p.slug = 'bookings-calendar'
ON CONFLICT (plugin_id, integration_slug) DO UPDATE SET
  status = EXCLUDED.status,
  availability = EXCLUDED.availability,
  rationale = EXCLUDED.rationale;

-- Preventivi & Finanza
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
  SELECT p.id, 'gmail', 'required', 'live', 'Gmail invia preventivi e solleciti' FROM plugins p WHERE p.slug = 'quotes-finance'
UNION ALL
  SELECT p.id, 'googlesheets', 'required', 'live', 'Sheets tiene lo scadenzario fiscale' FROM plugins p WHERE p.slug = 'quotes-finance'
UNION ALL
  SELECT p.id, 'microsoftexcel', 'optional', 'live', 'Excel crea i documenti finanziari' FROM plugins p WHERE p.slug = 'quotes-finance'
UNION ALL
  SELECT p.id, 'microsoftword', 'optional', 'live', 'Word genera i documenti formali' FROM plugins p WHERE p.slug = 'quotes-finance'
UNION ALL
  SELECT p.id, 'googledrive', 'optional', 'live', 'Drive ospita i documenti fiscali' FROM plugins p WHERE p.slug = 'quotes-finance'
UNION ALL
  SELECT p.id, 'paypal', 'optional', 'coming_soon', 'PayPal processa i pagamenti' FROM plugins p WHERE p.slug = 'quotes-finance'
ON CONFLICT (plugin_id, integration_slug) DO UPDATE SET
  status = EXCLUDED.status,
  availability = EXCLUDED.availability,
  rationale = EXCLUDED.rationale;

-- Contenuti & SEO
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
  SELECT p.id, 'notion', 'required', 'live', 'Notion per bozze e revisione dei contenuti' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
  SELECT p.id, 'googlesheets', 'optional', 'live', 'Sheets per il piano editoriale e le keyword' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
  SELECT p.id, 'microsoftword', 'optional', 'live', 'Word per le revisioni finali' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
  SELECT p.id, 'googledrive', 'optional', 'live', 'Drive ospita i contenuti' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
  SELECT p.id, 'googleanalytics', 'optional', 'coming_soon', 'Analytics misura la performance dei contenuti' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
  SELECT p.id, 'googledocs', 'optional', 'coming_soon', 'Docs per la collaborazione sui contenuti' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
  SELECT p.id, 'mailchimp', 'optional', 'coming_soon', 'Mailchimp gestisce le campagne' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
  SELECT p.id, 'googleads', 'optional', 'coming_soon', 'Google Ads misura la performance delle ads' FROM plugins p WHERE p.slug = 'content-seo'
ON CONFLICT (plugin_id, integration_slug) DO UPDATE SET
  status = EXCLUDED.status,
  availability = EXCLUDED.availability,
  rationale = EXCLUDED.rationale;

-- Social Media
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
  SELECT p.id, 'googlesheets', 'required', 'live', 'Sheets per il calendario editoriale' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
  SELECT p.id, 'notion', 'optional', 'live', 'Notion per le bozze dei contenuti' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
  SELECT p.id, 'googledrive', 'optional', 'live', 'Drive ospita gli asset e i contenuti' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
  SELECT p.id, 'slack', 'optional', 'live', 'Slack notifica il team per l'approvazione' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
  SELECT p.id, 'instagram', 'optional', 'coming_soon', 'Instagram per la pubblicazione diretta' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
  SELECT p.id, 'facebook', 'optional', 'coming_soon', 'Facebook per la pubblicazione diretta' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
  SELECT p.id, 'tiktok', 'optional', 'coming_soon', 'TikTok per la pubblicazione diretta' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
  SELECT p.id, 'figma', 'optional', 'coming_soon', 'Figma per i creativi social' FROM plugins p WHERE p.slug = 'social-media'
ON CONFLICT (plugin_id, integration_slug) DO UPDATE SET
  status = EXCLUDED.status,
  availability = EXCLUDED.availability,
  rationale = EXCLUDED.rationale;

-- Inbox & Produttività
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
  SELECT p.id, 'gmail', 'required', 'live', 'Gmail è la fonte email principale' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
  SELECT p.id, 'googlecalendar', 'optional', 'live', 'Calendar traccia scadenze e impegni' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
  SELECT p.id, 'notion', 'optional', 'live', 'Notion ospita note e task' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
  SELECT p.id, 'microsoftonenote', 'optional', 'live', 'OneNote ospita note e documenti' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
  SELECT p.id, 'microsoftoutlook', 'optional', 'coming_soon', 'Outlook amplia la copertura email' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
  SELECT p.id, 'googletasks', 'optional', 'coming_soon', 'Google Tasks gestisce i task' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
  SELECT p.id, 'googlekeep', 'optional', 'coming_soon', 'Google Keep ospita note rapide' FROM plugins p WHERE p.slug = 'inbox-productivity'
ON CONFLICT (plugin_id, integration_slug) DO UPDATE SET
  status = EXCLUDED.status,
  availability = EXCLUDED.availability,
  rationale = EXCLUDED.rationale;

-- Report & Decisioni
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
  SELECT p.id, 'googlesheets', 'required', 'live', 'Sheets è la fonte dati principale' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
  SELECT p.id, 'microsoftexcel', 'optional', 'live', 'Excel per le analisi avanzate' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
  SELECT p.id, 'airtable', 'optional', 'live', 'Airtable per il database business' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
  SELECT p.id, 'hubspot', 'optional', 'live', 'HubSpot per i dati CRM' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
  SELECT p.id, 'microsoftpowerpoint', 'optional', 'live', 'PowerPoint per il report al management' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
  SELECT p.id, 'googleanalytics', 'optional', 'coming_soon', 'Analytics per le metriche web' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
  SELECT p.id, 'googleads', 'optional', 'coming_soon', 'Google Ads per le metriche di marketing' FROM plugins p WHERE p.slug = 'reports-bi'
ON CONFLICT (plugin_id, integration_slug) DO UPDATE SET
  status = EXCLUDED.status,
  availability = EXCLUDED.availability,
  rationale = EXCLUDED.rationale;

-- HR & Selezione
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
  SELECT p.id, 'gmail', 'required', 'live', 'Gmail comunica con i candidati' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
  SELECT p.id, 'googlecalendar', 'required', 'live', 'Calendar pianifica i colloqui' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
  SELECT p.id, 'googledrive', 'optional', 'live', 'Drive ospita i CV e i documenti' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
  SELECT p.id, 'microsoftword', 'optional', 'live', 'Word genera i documenti HR' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
  SELECT p.id, 'airtable', 'optional', 'live', 'Airtable traccia i candidati' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
  SELECT p.id, 'notion', 'optional', 'live', 'Notion ospita le note dei colloqui' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
  SELECT p.id, 'googlemeet', 'optional', 'coming_soon', 'Google Meet per i colloqui video' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
  SELECT p.id, 'microsoftoutlook', 'optional', 'coming_soon', 'Outlook amplia la copertura del calendario' FROM plugins p WHERE p.slug = 'hr-recruiting'
ON CONFLICT (plugin_id, integration_slug) DO UPDATE SET
  status = EXCLUDED.status,
  availability = EXCLUDED.availability,
  rationale = EXCLUDED.rationale;

-- Documenti & Ufficio
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
  SELECT p.id, 'microsoftword', 'required', 'live', 'Word per la creazione dei documenti' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
  SELECT p.id, 'microsoftexcel', 'optional', 'live', 'Excel per l''analisi dei dati' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
  SELECT p.id, 'microsoftpowerpoint', 'optional', 'live', 'PowerPoint per le presentazioni' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
  SELECT p.id, 'googledrive', 'optional', 'live', 'Drive ospita i documenti' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
  SELECT p.id, 'microsoftonenote', 'optional', 'live', 'OneNote ospita le note' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
  SELECT p.id, 'microsoftonedrive', 'optional', 'coming_soon', 'OneDrive sincronizza i documenti' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
  SELECT p.id, 'microsoftsharepoint', 'optional', 'coming_soon', 'SharePoint per i documenti enterprise' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
  SELECT p.id, 'dropbox', 'optional', 'coming_soon', 'Dropbox per lo storage dei documenti' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
  SELECT p.id, 'googledocs', 'optional', 'coming_soon', 'Docs per la collaborazione sui documenti' FROM plugins p WHERE p.slug = 'documents-office'
ON CONFLICT (plugin_id, integration_slug) DO UPDATE SET
  status = EXCLUDED.status,
  availability = EXCLUDED.availability,
  rationale = EXCLUDED.rationale;

-- Ricerca Competitor
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
  SELECT p.id, 'notion', 'required', 'live', 'Notion ospita le ricerche' FROM plugins p WHERE p.slug = 'research-competitor'
UNION ALL
  SELECT p.id, 'googlesheets', 'optional', 'live', 'Sheets per i dati dei competitor' FROM plugins p WHERE p.slug = 'research-competitor'
UNION ALL
  SELECT p.id, 'microsoftpowerpoint', 'optional', 'live', 'PowerPoint per le presentazioni' FROM plugins p WHERE p.slug = 'research-competitor'
UNION ALL
  SELECT p.id, 'googledrive', 'optional', 'live', 'Drive ospita i documenti di ricerca' FROM plugins p WHERE p.slug = 'research-competitor'
ON CONFLICT (plugin_id, integration_slug) DO UPDATE SET
  status = EXCLUDED.status,
  availability = EXCLUDED.availability,
  rationale = EXCLUDED.rationale;

-- Progetti & Task
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
  SELECT p.id, 'trello', 'optional', 'live', 'Trello per il project management' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
  SELECT p.id, 'asana', 'optional', 'live', 'Asana per la gestione dei task' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
  SELECT p.id, 'clickup', 'optional', 'live', 'ClickUp per la gestione dei progetti' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
  SELECT p.id, 'notion', 'optional', 'live', 'Notion per task e documenti' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
  SELECT p.id, 'slack', 'optional', 'live', 'Slack per le notifiche al team' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
  SELECT p.id, 'github', 'optional', 'live', 'GitHub per i team tecnici' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
  SELECT p.id, 'jira', 'optional', 'coming_soon', 'Jira per i project enterprise' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
  SELECT p.id, 'microsoftteams', 'optional', 'coming_soon', 'Teams per la collaborazione' FROM plugins p WHERE p.slug = 'projects-tasks'
ON CONFLICT (plugin_id, integration_slug) DO UPDATE SET
  status = EXCLUDED.status,
  availability = EXCLUDED.availability,
  rationale = EXCLUDED.rationale;

-- === NOTE ===

-- Versione di rilascio: 2026-01-15 (cambia con il changelog del catalogo).
--
-- Applica DOPO supabase/schema-skills.sql:
--
--   supabase db push
--   psql $DATABASE_URL -f supabase/seed-skills.sql
--
-- Le tabelle `installed_skills` e `skill_runs` restano vuote: sono
-- per-account e si riempiono con l'installazione e l'uso reale.
