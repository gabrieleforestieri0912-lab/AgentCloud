-- Seed data for Skills & Plugins System
-- 13 official plugins with 45 skills in Italian

-- === PLUGINS ===

-- 1. E-commerce Operations
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version) VALUES
('ecommerce-operations', 'Operazioni E-commerce', 'Gestisci catalogo, ordini e magazzino', 'Suite completa per gestire tutte le operazioni e-commerce: ricerca prodotti, tracking ordini, gestione sconti, allerta scorte e report vendite.', 'ecommerce', '🛒', 'included', '1.0.0');

-- 2. Lead & Vendite
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version) VALUES
('lead-sales', 'Lead & Vendite', 'Cattura, qualifica e converte lead', 'Sistema completo per lead management: cattura, arricchimento profilo, scoring, notifica team, sequenze follow-up e gestione pipeline.', 'sales', '🎯', 'included', '1.0.0');

-- 3. Assistenza Clienti & Reputazione
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version) VALUES
('support-reputation', 'Assistenza & Reputazione', 'Supporto clienti e gestione recensioni', 'Suite per customer service: risposta da knowledge base, classificazione urgenza, bozza recensioni empatiche, gestione reclami e tono brand.', 'support', '💬', 'included', '1.0.0');

-- 4. Prenotazioni & Agenda
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version) VALUES
('bookings-calendar', 'Prenotazioni & Agenda', 'Gestisci appuntamenti e calendario', 'Sistema per gestione agenda: verifica disponibilità, prenotazione con video, promemoria no-show, riprogrammazione e pianificazione deep work.', 'productivity', '📅', 'included', '1.0.0');

-- 5. Preventivi, Fatture & Finanza
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version) VALUES
('quotes-finance', 'Preventivi & Finanza', 'Genera preventivi e gestisci contabilità', 'Suite finanziaria: calcolo preventivi con IVA, generazione documenti, riconciliazione entrate/uscite, scadenzario fiscale e solleciti.', 'finance', '💰', 'included', '1.0.0');

-- 6. Contenuti & SEO
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version) VALUES
('content-seo', 'Contenuti & SEO', 'Crea contenuti ottimizzati SEO', 'Tool per content marketing: keyword research, analisi competitor, articoli SEO, copy landing/ads, sequenze email e newsletter.', 'marketing', '✍️', 'included', '1.0.0');

-- 7. Social Media
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version) VALUES
('social-media', 'Social Media', 'Gestisci presenza sui social', 'Suite social media: calendario editoriale, caption multi-canale, hashtag, riuso contenuti e report performance.', 'marketing', '📱', 'included', '1.0.0');

-- 8. Inbox & Produttività
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version) VALUES
('inbox-productivity', 'Inbox & Produttività', 'Triage email e gestione task', 'Sistema produttività: triage email, bozze risposta, tracciamento scadenze, riepilogo giornaliero, verbali riunioni e inbox zero.', 'productivity', '📧', 'included', '1.0.0');

-- 9. Report & Decisioni
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version) VALUES
('reports-bi', 'Report & Decisioni', 'Analisi dati e decisioni strategiche', 'Business intelligence: report KPI, confronto periodi, rilevamento anomalie, priorità strategiche e sintesi per management.', 'analytics', '📊', 'included', '1.0.0');

-- 10. Risorse Umane & Selezione
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version) VALUES
('hr-recruiting', 'HR & Selezione', 'Gestisci candidature e reclutamento', 'Suite HR: screening CV, matching competenze, domande pre-qualifica, feedback candidati, pianificazione colloqui e scheda candidato.', 'hr', '👥', 'included', '1.0.0');

-- 11. Documenti & Ufficio
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version) VALUES
('documents-office', 'Documenti & Ufficio', 'Gestisci documenti e ufficio', 'Suite documentale: lettura PDF, estrazione dati, confronto contratti, creazione Word/Excel/PowerPoint e Q&A su documenti.', 'productivity', '📄', 'included', '1.0.0');

-- 12. Ricerca & Analisi Competitor
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version) VALUES
('research-competitor', 'Ricerca Competitor', 'Analizza mercato e competitor', 'Tool di market research: ricerca mercato, confronto prezzi/recensioni, scheda competitor, sintesi con citazioni e livello confidenza.', 'research', '🔍', 'included', '1.0.0');

-- 13. Progetti & Task
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version) VALUES
('projects-tasks', 'Progetti & Task', 'Gestisci progetti e task', 'Project management: trasforma richieste in task, aggiorna board, report avanzamento, standup automatico e promemoria scadenze.', 'productivity', '✅', 'included', '1.0.0');

-- === SKILLS ===

-- Skills for E-commerce Operations (5 skills)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
('catalog-search', 'Ricerca Catalogo', 'Cerca prodotti nel catalogo e genera link carrello. Usare quando il cliente chiede informazioni su prodotti, disponibilità o prezzi.', '1.0.0', 'it', 'official', 'low', ARRAY['read:products']),
('order-tracking', 'Tracking Ordine', 'Verifica stato ordine e fornisce tracking. Usare per richieste "dove è il mio ordine" o aggiornamenti spedizione.', '1.0.0', 'it', 'official', 'low', ARRAY['read:orders']),
('discount-management', 'Gestione Sconti', 'Gestisce codici sconto e promozioni. Richiede approvazione per sconti superiori al 20%.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:orders', 'update:orders']),
('stock-alert', 'Allerta Scorte', 'Monitora livelli scorte e genera previsioni riordino. Notifica se prodotto sotto soglia minima.', '1.0.0', 'it', 'official', 'low', ARRAY['read:inventory']),
('sales-summary', 'Riepilogo Vendite', 'Genera report vendite giornaliero/settimanale/mensile con metriche chiave.', '1.0.0', 'it', 'official', 'low', ARRAY['read:orders', 'read:products']);

-- Skills for Lead & Vendite (5 skills)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
('lead-capture', 'Cattura Lead', 'Cattura e valida nuovi lead da varie fonti. Verifica email, telefono e dati aziendali.', '1.0.0', 'it', 'official', 'low', ARRAY['read:contacts', 'create:contacts']),
('lead-enrichment', 'Arricchimento Profilo', 'Arricchisce profilo lead con dati aziendali, social e storicizza interazioni.', '1.0.0', 'it', 'official', 'low', ARRAY['read:contacts', 'update:contacts']),
('lead-scoring', 'Scoring Lead', 'Assegna punteggio High/Medium/Low basato su engagement, budget e timeline.', '1.0.0', 'it', 'official', 'low', ARRAY['read:contacts']),
('team-notification', 'Notifica Team', 'Notifica team vendite per lead hot con sintesi e azioni suggerite.', '1.0.0', 'it', 'official', 'medium', ARRAY['send:notifications']),
('followup-sequence', 'Sequenza Follow-up', 'Crea e gestisce sequenze di follow-up personalizzate basate su punteggio lead.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:contacts', 'update:contacts', 'send:email']);

-- Skills for Support & Reputazione (4 skills)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
('kb-response', 'Risposta Knowledge Base', 'Risponde alle domande basandosi su knowledge base aziendale. Escala se incerto.', '1.0.0', 'it', 'official', 'low', ARRAY['read:kb']),
('ticket-urgency', 'Classificazione Urgenza', 'Classifica ticket per urgenza (critical/high/medium/low) basato su SLA e cliente.', '1.0.0', 'it', 'official', 'low', ARRAY['read:tickets']),
('review-draft', 'Bozza Recensione', 'Genera bozza risposta recensione analizzando sentiment. Tono empatico e professionale.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:reviews', 'update:reviews']),
('complaint-handling', 'Gestione Reclami', 'Gestisce reclami con procedura standard, verifica fattibilità soluzione e mantiene registro.', '1.0.0', 'it', 'official', 'high', ARRAY['read:tickets', 'update:tickets', 'send:email']);

-- Skills for Bookings & Calendar (5 skills)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
('availability-check', 'Verifica Disponibilità', 'Verifica disponibilità calendario e propone slot ottimali. Considera preferenze utente.', '1.0.0', 'it', 'official', 'low', ARRAY['read:calendar']),
('booking-creation', 'Creazione Prenotazione', 'Crea prenotazione con link video conferenza. Invia conferma automatica.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:calendar', 'create:events', 'send:email']),
('reminder-no-show', 'Promemoria No-show', 'Invia promemoria pre-appuntamento e gestisce no-show con follow-up.', '1.0.0', 'it', 'official', 'low', ARRAY['read:calendar', 'send:email']),
('reschedule-cancel', 'Riprogrammazione/Cancellazione', 'Gestisce richieste di modifica o cancellazione con politiche aziendali.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:calendar', 'update:events', 'send:email']),
('day-planning', 'Pianificazione Giornata', 'Organizza giornata con deep work block e gestisce priorità.', '1.0.0', 'it', 'official', 'low', ARRAY['read:calendar', 'read:tasks']);

-- Skills for Quotes & Finance (4 skills)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
('quote-calculation', 'Calcolo Preventivo', 'Raccoglie requisiti e calcola preventivo con imponibile, IVA 22% e sconti.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:products', 'read:services']),
('document-generation', 'Generazione Documento', 'Genera documento formale (Word/PDF) da template aziendale.', '1.0.0', 'it', 'official', 'medium', ARRAY['create:documents']),
('reconciliation', 'Riconciliazione', 'Riconcilia entrate/uscite con fatture e movimenti bancari.', '1.0.0', 'it', 'official', 'high', ARRAY['read:transactions', 'read:invoices']),
('fiscal-deadlines', 'Scadenzario Fiscale', 'Gestisce scadenze fiscali e invia solleciti se necessario. Richiede approvazione invio.', '1.0.0', 'it', 'official', 'high', ARRAY['read:invoices', 'send:email']);

-- Skills for Content & SEO (4 skills)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
('keyword-research', 'Keyword Research', 'Ricerca keyword con analisi volume, difficoltà e intento di ricerca.', '1.0.0', 'it', 'official', 'low', ARRAY['read:analytics']),
('competitor-analysis', 'Analisi Competitor', 'Analizza contenuti competitor per gap e opportunità.', '1.0.0', 'it', 'official', 'low', ARRAY['read:web']),
('seo-article', 'Articolo SEO', 'Genera articolo SEO strutturato con heading, meta description e ottimizzazione on-page.', '1.0.0', 'it', 'official', 'low', ARRAY['create:content']),
('copy-ads', 'Copy per Ads', 'Crea copy per landing page e ads con varianti A/B test.', '1.0.0', 'it', 'official', 'low', ARRAY['create:content']);

-- Skills for Social Media (4 skills)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
('editorial-calendar', 'Calendario Editoriale', 'Pianifica calendario editoriale settimanale con temi e deadline.', '1.0.0', 'it', 'official', 'low', ARRAY['read:calendar', 'create:tasks']),
('caption-generation', 'Generazione Caption', 'Genera caption ottimizzate per Instagram, LinkedIn, TikTok e Facebook.', '1.0.0', 'it', 'official', 'low', ARRAY['create:content']),
('hashtag-research', 'Ricerca Hashtag', 'Ricerca hashtag e trend per ogni piattaforma con analisi engagement.', '1.0.0', 'it', 'official', 'low', ARRAY['read:social']),
('content-repurposing', 'Riuso Contenuti', 'Adatta un contenuto per più canali mantenendo coerenza tono.', '1.0.0', 'it', 'official', 'low', ARRAY['create:content']);

-- Skills for Inbox & Productivity (4 skills)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
('email-triage', 'Triage Email', 'Classifica email per priorità (urgent/important/normal) basato su contenuto e mittente.', '1.0.0', 'it', 'official', 'low', ARRAY['read:email']),
('email-draft', 'Bozza Risposta', 'Genera bozza risposta email basata su contesto e preferenze mittente.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:email', 'create:email']),
('deadline-tracking', 'Tracciamento Scadenze', 'Traccia scadenze e impegni con notifiche priorità.', '1.0.0', 'it', 'official', 'low', ARRAY['read:tasks', 'create:tasks']),
('meeting-notes', 'Verbali Riunione', 'Genera verbali riunione con action items e responsabili.', '1.0.0', 'it', 'official', 'low', ARRAY['read:meetings', 'create:documents']);

-- Skills for Reports & BI (3 skills)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
('kpi-report', 'Report KPI', 'Genera report KPI settimanale/mensile con metriche chiave e trend.', '1.0.0', 'it', 'official', 'low', ARRAY['read:analytics', 'read:data']),
('period-comparison', 'Confronto Periodi', 'Confronta dati periodo su periodo con analisi variazioni e anomalie.', '1.0.0', 'it', 'official', 'low', ARRAY['read:data']),
('executive-summary', 'Sintesi Executive', 'Sintesi dati per titolare in linguaggio semplice con priorità strategiche.', '1.0.0', 'it', 'official', 'low', ARRAY['read:data', 'create:reports']);

-- Skills for HR & Recruiting (4 skills)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
('cv-screening', 'Screening CV', 'Confronta CV con job description e genera matching competenze.', '1.0.0', 'it', 'official', 'low', ARRAY['read:documents']),
('candidate-matching', 'Matching Candidati', 'Match competenze candidate con requisiti ruolo e genera ranking.', '1.0.0', 'it', 'official', 'low', ARRAY['read:candidates', 'update:candidates']),
('interview-questions', 'Domande Colloquio', 'Genera domande pre-qualifica basate su ruolo e livello esperienza.', '1.0.0', 'it', 'official', 'low', ARRAY['read:roles']),
('candidate-feedback', 'Feedback Candidati', 'Genera feedback strutturato per candidati post-colloquio.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:candidates', 'update:candidates', 'send:email']);

-- Skills for Documents & Office (3 skills)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
('pdf-summary', 'Riassunto PDF', 'Legge e riassume documenti PDF con estrazione punti chiave.', '1.0.0', 'it', 'official', 'low', ARRAY['read:documents']),
('data-extraction', 'Estrazione Dati', 'Estrae dati strutturati da documenti (tabelle, date, importi).', '1.0.0', 'it', 'official', 'low', ARRAY['read:documents']),
('document-qa', 'Q&A Documenti', 'Risponde a domande su contenuti documenti con citazioni.', '1.0.0', 'it', 'official', 'low', ARRAY['read:documents']);

-- Skills for Research & Competitor (2 skills)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
('market-research', 'Ricerca Mercato', 'Ricerca mercato con fonti verificabili e analisi trend.', '1.0.0', 'it', 'official', 'low', ARRAY['read:web']),
('competitor-profile', 'Scheda Competitor', 'Genera scheda competitor completa con prezzi, recensioni e posizionamento.', '1.0.0', 'it', 'official', 'low', ARRAY['read:web']);

-- Skills for Projects & Tasks (3 skills)
INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
('request-to-task', 'Richiesta a Task', 'Trasforma richieste verbali in task strutturati con priorità e deadline.', '1.0.0', 'it', 'official', 'low', ARRAY['read:requests', 'create:tasks']),
('board-update', 'Aggiornamento Board', 'Aggiorna project board (Trello/Asana/ClickUp) con stato task.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:tasks', 'update:tasks']),
('progress-report', 'Report Avanzamento', 'Genera report avanzamento progetto con bloccanti e next steps.', '1.0.0', 'it', 'official', 'low', ARRAY['read:tasks', 'read:projects']);

-- === PLUGIN-SKILLS RELATIONSHIPS ===

-- E-commerce Operations
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'ecommerce-operations' AND s.slug IN ('catalog-search', 'order-tracking', 'discount-management', 'stock-alert', 'sales-summary');

-- Lead & Vendite
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'lead-sales' AND s.slug IN ('lead-capture', 'lead-enrichment', 'lead-scoring', 'team-notification', 'followup-sequence');

-- Support & Reputazione
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'support-reputation' AND s.slug IN ('kb-response', 'ticket-urgency', 'review-draft', 'complaint-handling');

-- Prenotazioni & Agenda
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'bookings-calendar' AND s.slug IN ('availability-check', 'booking-creation', 'reminder-no-show', 'reschedule-cancel', 'day-planning');

-- Preventivi & Finanza
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'quotes-finance' AND s.slug IN ('quote-calculation', 'document-generation', 'reconciliation', 'fiscal-deadlines');

-- Contenuti & SEO
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'content-seo' AND s.slug IN ('keyword-research', 'competitor-analysis', 'seo-article', 'copy-ads');

-- Social Media
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'social-media' AND s.slug IN ('editorial-calendar', 'caption-generation', 'hashtag-research', 'content-repurposing');

-- Inbox & Produttività
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'inbox-productivity' AND s.slug IN ('email-triage', 'email-draft', 'deadline-tracking', 'meeting-notes');

-- Report & Decisioni
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'reports-bi' AND s.slug IN ('kpi-report', 'period-comparison', 'executive-summary');

-- HR & Selezione
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'hr-recruiting' AND s.slug IN ('cv-screening', 'candidate-matching', 'interview-questions', 'candidate-feedback');

-- Documenti & Ufficio
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'documents-office' AND s.slug IN ('pdf-summary', 'data-extraction', 'document-qa');

-- Ricerca Competitor
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'research-competitor' AND s.slug IN ('market-research', 'competitor-profile');

-- Progetti & Task
INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'projects-tasks' AND s.slug IN ('request-to-task', 'board-update', 'progress-report');

-- === PLUGIN-AGENTS RELATIONSHIPS ===

-- E-commerce Operations
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
SELECT p.id, 'shopify-agent', 'primary', 'Shopify Agent gestisce nativamente catalogo e ordini' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
SELECT p.id, 'inventory-logistics', 'primary', 'Inventory & Logistics gestisce magazzino e scorte' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
SELECT p.id, 'finance-manager', 'secondary', 'Finance Manager analizza metriche vendite' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
SELECT p.id, 'reviews-reputation', 'secondary', 'Reviews & Reputation usa dati ordini per recensioni' FROM plugins p WHERE p.slug = 'ecommerce-operations';

-- Lead & Vendite
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
SELECT p.id, 'lead-capture', 'primary', 'Lead Capture è dedicato a cattura e gestione lead' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
SELECT p.id, 'crm-agent', 'primary', 'CRM Agent gestisce pipeline e lead qualificati' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
SELECT p.id, 'whatsapp-agent', 'secondary', 'WhatsApp Agent segue lead via chat' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
SELECT p.id, 'calendar-booking', 'secondary', 'Calendar Booking chiude lead con appuntamenti' FROM plugins p WHERE p.slug = 'lead-sales';

-- Support & Reputazione
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
SELECT p.id, 'support-agent', 'primary', 'Support Agent gestisce ticket e knowledge base' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
SELECT p.id, 'reviews-reputation', 'primary', 'Reviews & Reputation gestisce recensioni e reputazione' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
SELECT p.id, 'whatsapp-agent', 'secondary', 'WhatsApp Agent supporta clienti via chat' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
SELECT p.id, 'email-manager', 'secondary', 'Email Manager gestisce ticket email' FROM plugins p WHERE p.slug = 'support-reputation';

-- Prenotazioni & Agenda
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
SELECT p.id, 'calendar-booking', 'primary', 'Calendar Booking gestisce appuntamenti e disponibilità' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
SELECT p.id, 'personal-assistant', 'primary', 'Personal Assistant pianifica agenda e task' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
SELECT p.id, 'hr-recruiter', 'secondary', 'HR & Recruiter pianifica colloqui' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
SELECT p.id, 'whatsapp-agent', 'secondary', 'WhatsApp Agent conferma appuntamenti via chat' FROM plugins p WHERE p.slug = 'bookings-calendar';

-- Preventivi & Finanza
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
SELECT p.id, 'quotes-estimates', 'primary', 'Quotes & Estimates genera preventivi professionali' FROM plugins p WHERE p.slug = 'quotes-finance'
UNION ALL
SELECT p.id, 'finance-manager', 'primary', 'Finance Manager gestisce contabilità e fatture' FROM plugins p WHERE p.slug = 'quotes-finance'
UNION ALL
SELECT p.id, 'invoice-agent', 'secondary', 'Invoice Agent gestisce fatturazione' FROM plugins p WHERE p.slug = 'quotes-finance'
UNION ALL
SELECT p.id, 'business-manager', 'secondary', 'Business Manager analizza metriche finanziarie' FROM plugins p WHERE p.slug = 'quotes-finance';

-- Contenuti & SEO
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
SELECT p.id, 'seo-content', 'primary', 'SEO Content Agent ottimizza contenuti per search' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
SELECT p.id, 'copywriter', 'primary', 'Copywriter crea copy persuasivi' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
SELECT p.id, 'social-media', 'secondary', 'Social Media usa contenuti per post' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
SELECT p.id, 'research-agent', 'secondary', 'Research Agent fornisce dati per contenuti' FROM plugins p WHERE p.slug = 'content-seo';

-- Social Media
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
SELECT p.id, 'social-media', 'primary', 'Social Media gestisce presenza sui social' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
SELECT p.id, 'copywriter', 'secondary', 'Copywriter crea caption e copy' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
SELECT p.id, 'reviews-reputation', 'secondary', 'Reviews & Reputation gestisce recensioni social' FROM plugins p WHERE p.slug = 'social-media';

-- Inbox & Produttività
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
SELECT p.id, 'email-manager', 'primary', 'Email Manager gestisce inbox e email' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
SELECT p.id, 'email-agent', 'primary', 'Email Agent triage e risponde email' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
SELECT p.id, 'personal-assistant', 'primary', 'Personal Assistant gestisce produttività' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
SELECT p.id, 'business-manager', 'secondary', 'Business Manager usa sintesi produttività' FROM plugins p WHERE p.slug = 'inbox-productivity';

-- Report & Decisioni
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
SELECT p.id, 'business-manager', 'primary', 'Business Manager analizza dati e decisioni' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
SELECT p.id, 'analytics-agent', 'primary', 'Analytics Agent genera report dettagliati' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
SELECT p.id, 'finance-manager', 'secondary', 'Finance Manager usa dati finanziari' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
SELECT p.id, 'shopify-agent', 'secondary', 'Shopify Agent fornisce dati e-commerce' FROM plugins p WHERE p.slug = 'reports-bi';

-- HR & Selezione
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
SELECT p.id, 'hr-recruiter', 'primary', 'HR & Recruiter gestisce selezione personale' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
SELECT p.id, 'calendar-booking', 'secondary', 'Calendar Booking pianifica colloqui' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
SELECT p.id, 'email-manager', 'secondary', 'Email Manager comunica con candidati' FROM plugins p WHERE p.slug = 'hr-recruiting';

-- Documenti & Ufficio
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
SELECT p.id, 'document-agent', 'primary', 'Document Agent gestisce documenti' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
SELECT p.id, 'quotes-estimates', 'primary', 'Quotes & Estimates genera documenti formali' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
SELECT p.id, 'business-manager', 'secondary', 'Business Manager analizza documenti' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
SELECT p.id, 'support-agent', 'secondary', 'Support Agent risponde su documenti' FROM plugins p WHERE p.slug = 'documents-office';

-- Ricerca Competitor
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
SELECT p.id, 'research-agent', 'primary', 'Research Agent analizza mercato e competitor' FROM plugins p WHERE p.slug = 'research-competitor'
UNION ALL
SELECT p.id, 'seo-content', 'secondary', 'SEO Content usa dati competitor' FROM plugins p WHERE p.slug = 'research-competitor'
UNION ALL
SELECT p.id, 'business-manager', 'secondary', 'Business Manager usa analisi competitor' FROM plugins p WHERE p.slug = 'research-competitor'
UNION ALL
SELECT p.id, 'social-media', 'secondary', 'Social Media monitora competitor' FROM plugins p WHERE p.slug = 'research-competitor';

-- Progetti & Task
INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
SELECT p.id, 'personal-assistant', 'primary', 'Personal Assistant gestisce task e progetti' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
SELECT p.id, 'business-manager', 'primary', 'Business Manager traccia avanzamento progetti' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
SELECT p.id, 'email-manager', 'secondary', 'Email Manager comunica task e scadenze' FROM plugins p WHERE p.slug = 'projects-tasks';

-- === PLUGIN-INTEGRATIONS RELATIONSHIPS ===

-- E-commerce Operations
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
SELECT p.id, 'woocommerce', 'required', 'live', 'WooCommerce fornisce catalogo e ordini' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
SELECT p.id, 'google-sheets', 'optional', 'live', 'Sheets fa da magazzino leggero' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
SELECT p.id, 'airtable', 'optional', 'live', 'Airtable gestisce inventario' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
SELECT p.id, 'slack', 'optional', 'live', 'Slack notifica scorte critiche' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
SELECT p.id, 'gmail', 'optional', 'live', 'Gmail invia aggiornamenti ordine' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
SELECT p.id, 'shopify', 'required', 'coming_soon', 'Shopify gestisce catalogo nativo' FROM plugins p WHERE p.slug = 'ecommerce-operations'
UNION ALL
SELECT p.id, 'paypal', 'optional', 'coming_soon', 'PayPal processa pagamenti' FROM plugins p WHERE p.slug = 'ecommerce-operations';

-- Lead & Vendite
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
SELECT p.id, 'hubspot', 'required', 'live', 'HubSpot è fonte di verità contatti' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
SELECT p.id, 'slack', 'optional', 'live', 'Slack notifica lead hot in tempo reale' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
SELECT p.id, 'gmail', 'optional', 'live', 'Gmail invia follow-up email' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
SELECT p.id, 'google-sheets', 'optional', 'live', 'Sheets traccia pipeline lead' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
SELECT p.id, 'google-calendar', 'optional', 'live', 'Calendar prenota follow-up calls' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
SELECT p.id, 'whatsapp', 'optional', 'coming_soon', 'WhatsApp segue lead via chat' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
SELECT p.id, 'calendly', 'optional', 'coming_soon', 'Calendly prenota meeting' FROM plugins p WHERE p.slug = 'lead-sales'
UNION ALL
SELECT p.id, 'mailchimp', 'optional', 'coming_soon', 'Mailchimp gestisce campagne email' FROM plugins p WHERE p.slug = 'lead-sales';

-- Support & Reputazione
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
SELECT p.id, 'slack', 'required', 'live', 'Slack gestisce escalation umana' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
SELECT p.id, 'notion', 'required', 'live', 'Notion è knowledge base RAG' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
SELECT p.id, 'google-drive', 'optional', 'live', 'Drive ospita documenti knowledge base' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
SELECT p.id, 'gmail', 'optional', 'live', 'Gmail gestisce ticket email' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
SELECT p.id, 'google-sheets', 'optional', 'live', 'Sheets traccia ticket e SLA' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
SELECT p.id, 'zendesk', 'optional', 'coming_soon', 'Zendesk gestisce ticket avanzati' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
SELECT p.id, 'whatsapp', 'optional', 'coming_soon', 'WhatsApp supporta clienti chat' FROM plugins p WHERE p.slug = 'support-reputation'
UNION ALL
SELECT p.id, 'google-chat', 'optional', 'coming_soon', 'Google Chat gestisce supporto interno' FROM plugins p WHERE p.slug = 'support-reputation';

-- Prenotazioni & Agenda
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
SELECT p.id, 'google-calendar', 'required', 'live', 'Calendar è indispensabile per prenotazioni' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
SELECT p.id, 'gmail', 'optional', 'live', 'Gmail invia conferme e promemoria' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
SELECT p.id, 'notion', 'optional', 'live', 'Notion tiene note meeting e task' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
SELECT p.id, 'google-meet', 'optional', 'coming_soon', 'Google Meet genera link video' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
SELECT p.id, 'outlook', 'optional', 'coming_soon', 'Outlook espande copertura calendario' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
SELECT p.id, 'calendly', 'optional', 'coming_soon', 'Calendly semplifica prenotazione' FROM plugins p WHERE p.slug = 'bookings-calendar'
UNION ALL
SELECT p.id, 'google-tasks', 'optional', 'coming_soon', 'Google Tasks sincronizza task' FROM plugins p WHERE p.slug = 'bookings-calendar';

-- Preventivi & Finanza
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
SELECT p.id, 'gmail', 'required', 'live', 'Gmail invia preventivi e solleciti' FROM plugins p WHERE p.slug = 'quotes-finance'
UNION ALL
SELECT p.id, 'google-sheets', 'required', 'live', 'Sheets tiene scadenzario fiscale' FROM plugins p WHERE p.slug = 'quotes-finance'
UNION ALL
SELECT p.id, 'microsoft-excel', 'optional', 'live', 'Excel crea documenti finanziari' FROM plugins p WHERE p.slug = 'quotes-finance'
UNION ALL
SELECT p.id, 'microsoft-word', 'optional', 'live', 'Word genera documenti formali' FROM plugins p WHERE p.slug = 'quotes-finance'
UNION ALL
SELECT p.id, 'google-drive', 'optional', 'live', 'Drive ospita documenti fiscali' FROM plugins p WHERE p.slug = 'quotes-finance'
UNION ALL
SELECT p.id, 'paypal', 'optional', 'coming_soon', 'PayPal processa pagamenti' FROM plugins p WHERE p.slug = 'quotes-finance';

-- Contenuti & SEO
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
SELECT p.id, 'notion', 'required', 'live', 'Notion per bozze e revisione contenuti' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
SELECT p.id, 'google-sheets', 'optional', 'live', 'Sheets per piano editoriale e keyword' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
SELECT p.id, 'microsoft-word', 'optional', 'live', 'Word per revisioni finali' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
SELECT p.id, 'google-drive', 'optional', 'live', 'Drive ospita contenuti' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
SELECT p.id, 'google-analytics', 'optional', 'coming_soon', 'Analytics misura performance contenuti' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
SELECT p.id, 'google-docs', 'optional', 'coming_soon', 'Docs per collaborazione contenuti' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
SELECT p.id, 'mailchimp', 'optional', 'coming_soon', 'Mailchimp gestisce campagne' FROM plugins p WHERE p.slug = 'content-seo'
UNION ALL
SELECT p.id, 'google-ads', 'optional', 'coming_soon', 'Google Ads misura performance ads' FROM plugins p WHERE p.slug = 'content-seo';

-- Social Media
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
SELECT p.id, 'google-sheets', 'required', 'live', 'Sheets per calendario editoriale' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
SELECT p.id, 'notion', 'optional', 'live', 'Notion per bozze contenuti' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
SELECT p.id, 'google-drive', 'optional', 'live', 'Drive ospita assets e contenuti' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
SELECT p.id, 'slack', 'optional', 'live', 'Slack notifica team per approvazione' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
SELECT p.id, 'instagram', 'optional', 'coming_soon', 'Instagram per pubblicazione diretta' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
SELECT p.id, 'facebook', 'optional', 'coming_soon', 'Facebook per pubblicazione diretta' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
SELECT p.id, 'tiktok', 'optional', 'coming_soon', 'TikTok per pubblicazione diretta' FROM plugins p WHERE p.slug = 'social-media'
UNION ALL
SELECT p.id, 'figma', 'optional', 'coming_soon', 'Figma per creativi social' FROM plugins p WHERE p.slug = 'social-media';

-- Inbox & Produttività
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
SELECT p.id, 'gmail', 'required', 'live', 'Gmail è fonte email principale' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
SELECT p.id, 'google-calendar', 'optional', 'live', 'Calendar traccia scadenze e impegni' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
SELECT p.id, 'notion', 'optional', 'live', 'Notion ospita note e task' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
SELECT p.id, 'microsoft-onenote', 'optional', 'live', 'OneNote ospita note e documenti' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
SELECT p.id, 'outlook', 'optional', 'coming_soon', 'Outlook espande copertura email' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
SELECT p.id, 'google-tasks', 'optional', 'coming_soon', 'Google Tasks gestisce task' FROM plugins p WHERE p.slug = 'inbox-productivity'
UNION ALL
SELECT p.id, 'google-keep', 'optional', 'coming_soon', 'Google Keep ospita note rapide' FROM plugins p WHERE p.slug = 'inbox-productivity';

-- Report & Decisioni
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
SELECT p.id, 'google-sheets', 'required', 'live', 'Sheets è fonte dati principale' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
SELECT p.id, 'microsoft-excel', 'optional', 'live', 'Excel per analisi avanzate' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
SELECT p.id, 'airtable', 'optional', 'live', 'Airtable per database business' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
SELECT p.id, 'hubspot', 'optional', 'live', 'HubSpot per dati CRM' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
SELECT p.id, 'microsoft-powerpoint', 'optional', 'live', 'PowerPoint per report management' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
SELECT p.id, 'google-analytics', 'optional', 'coming_soon', 'Analytics per metriche web' FROM plugins p WHERE p.slug = 'reports-bi'
UNION ALL
SELECT p.id, 'google-ads', 'optional', 'coming_soon', 'Google Ads per metriche marketing' FROM plugins p WHERE p.slug = 'reports-bi';

-- HR & Selezione
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
SELECT p.id, 'gmail', 'required', 'live', 'Gmail comunica con candidati' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
SELECT p.id, 'google-calendar', 'required', 'live', 'Calendar pianifica colloqui' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
SELECT p.id, 'google-drive', 'optional', 'live', 'Drive ospita CV e documenti' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
SELECT p.id, 'microsoft-word', 'optional', 'live', 'Word genera documenti HR' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
SELECT p.id, 'airtable', 'optional', 'live', 'Airtable traccia candidati' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
SELECT p.id, 'notion', 'optional', 'live', 'Notion ospita note colloqui' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
SELECT p.id, 'google-meet', 'optional', 'coming_soon', 'Google Meet per colloqui video' FROM plugins p WHERE p.slug = 'hr-recruiting'
UNION ALL
SELECT p.id, 'outlook', 'optional', 'coming_soon', 'Outlook espande copertura calendario' FROM plugins p WHERE p.slug = 'hr-recruiting';

-- Documenti & Ufficio
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
SELECT p.id, 'microsoft-word', 'required', 'live', 'Word per creazione documenti' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
SELECT p.id, 'microsoft-excel', 'optional', 'live', 'Excel per analisi dati' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
SELECT p.id, 'microsoft-powerpoint', 'optional', 'live', 'PowerPoint per presentazioni' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
SELECT p.id, 'google-drive', 'optional', 'live', 'Drive ospita documenti' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
SELECT p.id, 'microsoft-onenote', 'optional', 'live', 'OneNote ospita note' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
SELECT p.id, 'onedrive', 'optional', 'coming_soon', 'OneDrive sincronizza documenti' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
SELECT p.id, 'sharepoint', 'optional', 'coming_soon', 'SharePoint per documenti enterprise' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
SELECT p.id, 'dropbox', 'optional', 'coming_soon', 'Dropbox per storage documenti' FROM plugins p WHERE p.slug = 'documents-office'
UNION ALL
SELECT p.id, 'google-docs', 'optional', 'coming_soon', 'Docs per collaborazione documenti' FROM plugins p WHERE p.slug = 'documents-office';

-- Ricerca Competitor
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
SELECT p.id, 'notion', 'required', 'live', 'Notion ospita ricerche' FROM plugins p WHERE p.slug = 'research-competitor'
UNION ALL
SELECT p.id, 'google-sheets', 'optional', 'live', 'Sheets per dati competitor' FROM plugins p WHERE p.slug = 'research-competitor'
UNION ALL
SELECT p.id, 'microsoft-powerpoint', 'optional', 'live', 'PowerPoint per presentazioni' FROM plugins p WHERE p.slug = 'research-competitor'
UNION ALL
SELECT p.id, 'google-drive', 'optional', 'live', 'Drive ospita documenti ricerca' FROM plugins p WHERE p.slug = 'research-competitor';

-- Progetti & Task
INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
SELECT p.id, 'trello', 'optional', 'live', 'Trello per project management' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
SELECT p.id, 'asana', 'optional', 'live', 'Asana per gestione task' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
SELECT p.id, 'clickup', 'optional', 'live', 'ClickUp per gestione progetti' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
SELECT p.id, 'notion', 'optional', 'live', 'Notion per task e documenti' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
SELECT p.id, 'slack', 'optional', 'live', 'Slack per notifiche team' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
SELECT p.id, 'github', 'optional', 'live', 'GitHub per team tecnici' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
SELECT p.id, 'jira', 'optional', 'coming_soon', 'Jira per project enterprise' FROM plugins p WHERE p.slug = 'projects-tasks'
UNION ALL
SELECT p.id, 'microsoft-teams', 'optional', 'coming_soon', 'Teams per collaborazione' FROM plugins p WHERE p.slug = 'projects-tasks';
