-- Network Marketing plugin — seed del catalogo ufficiale
--
-- Compagno di `supabase/seed-skills.sql` (che resta generato da catalog.ts):
-- fonte di verità resta `src/lib/skills/catalog.ts` (const NETWORK_MARKETING).
-- Idempotente: ogni INSERT usa `ON CONFLICT ... DO UPDATE/DO NOTHING`.

-- === PLUGIN ===

-- 🤝 Network Marketing · Lista, follow-up, presentazioni e team — senza spam
INSERT INTO plugins (slug, name, tagline, description, category, icon, price_tier, version)
VALUES ('network-marketing', 'Network Marketing', 'Lista, follow-up, presentazioni e team — senza spam', 'Suite per incaricati alle vendite dirette e team leader: lista contatti segmentata, bozze di approccio e follow-up conformi (sempre da approvare), inviti a presentazioni, onboarding 30/60/90, gestione clienti e riordini, contenuti social conformi, controllo di conformità su ogni bozza e report settimanali.', 'sales', 'users', 'included', '1.0.0')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  price_tier = EXCLUDED.price_tier,
  version = EXCLUDED.version;

-- === SKILLS (11) ===

INSERT INTO skills (slug, name, description, version, locale, owner, risk_level, permissions) VALUES
  ('nm-lista-contatti', 'Lista Contatti e Priorità', 'Costruisce la lista contatti con brainstorm guidato, segmentazione caldo/tiepido/freddo e ordine di priorità. Usare quando si parte da zero o si vuole riordinare la lista.', '1.0.0', 'it', 'official', 'low', ARRAY['read:contacts', 'create:contacts']),
  ('nm-messaggi-approccio', 'Messaggi di Approccio', 'Scrive 2 varianti brevi di messaggio di approccio personalizzate sulla relazione reale col contatto. Usare solo su contatti con relazione esistente o consenso; ogni bozza passa il compliance-check ed è da approvare.', '1.0.0', 'it', 'official', 'high', ARRAY['read:contacts', 'create:drafts']),
  ('nm-followup-pipeline', 'Follow-up e Pipeline', 'Gestisce la pipeline con promemoria e cadenza (max 3 tentativi, poi stop). Usare ogni mattina per i follow-up del giorno e dopo ogni interazione.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:contacts', 'update:contacts', 'send:email']),
  ('nm-gestione-obiezioni', 'Gestione Obiezioni', 'Prepara risposte oneste alle obiezioni (non ho tempo, è una piramide, costa troppo) senza manipolazione. Usare quando un contatto esprime dubbi.', '1.0.0', 'it', 'official', 'low', ARRAY['read:contacts', 'create:drafts']),
  ('nm-inviti-presentazioni', 'Inviti e Presentazioni', 'Prepara inviti, propone slot dal calendario, crea eventi con link video e promemoria. Usare per ogni presentazione o call di approfondimento.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:calendar', 'create:events', 'send:email']),
  ('nm-onboarding-incaricato', 'Onboarding Nuovo Incaricato', 'Crea il piano di onboarding 30/60/90 giorni con checklist del primo mese. Usare a ogni nuovo ingresso nel team; output lungo in file scaricabile.', '1.0.0', 'it', 'official', 'low', ARRAY['create:documents', 'create:tasks']),
  ('nm-clienti-riordini', 'Clienti, Riordini e Fedeltà', 'Calcola quando finisce il prodotto e prepara messaggi gentili di riordino e richieste di feedback. Usare per clienti attivi con acquisti tracciati.', '1.0.0', 'it', 'official', 'medium', ARRAY['read:contacts', 'read:orders', 'create:drafts']),
  ('nm-contenuti-conformi', 'Contenuti Social Conformi', 'Crea calendario editoriale, caption, storie, hashtag e disclaimer per i social, sempre con controllo conformità. Usare per la presenza social.', '1.0.0', 'it', 'official', 'high', ARRAY['create:content']),
  ('nm-compliance-check', 'Controllo Conformità', 'Scansiona ogni bozza per claim di guadagno e salute, scarsità falsa e pressione; restituisce semaforo verde/giallo/rosso con riscrittura. Sempre attiva prima di consegnare una bozza.', '1.0.0', 'it', 'official', 'low', ARRAY['read:drafts']),
  ('nm-report-obiettivi', 'Report Attività e Obiettivi', 'Sintesi settimanale di attività, conversioni, gap verso obiettivo e 3 azioni. Usare il lunedì mattina e su richiesta.', '1.0.0', 'it', 'official', 'low', ARRAY['read:contacts', 'read:data']),
  ('nm-coaching-team', 'Coaching Team Leader', 'Prepara 1-to-1, riconoscimenti e riunioni di team per i team leader. Usare per la gestione etica del team.', '1.0.0', 'it', 'official', 'low', ARRAY['read:team', 'create:documents'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  risk_level = EXCLUDED.risk_level,
  permissions = EXCLUDED.permissions;

-- === PLUGIN-SKILLS ===

INSERT INTO plugin_skills (plugin_id, skill_id)
SELECT p.id, s.id FROM plugins p, skills s
WHERE p.slug = 'network-marketing' AND s.slug IN ('nm-lista-contatti', 'nm-messaggi-approccio', 'nm-followup-pipeline', 'nm-gestione-obiezioni', 'nm-inviti-presentazioni', 'nm-onboarding-incaricato', 'nm-clienti-riordini', 'nm-contenuti-conformi', 'nm-compliance-check', 'nm-report-obiettivi', 'nm-coaching-team')
ON CONFLICT (plugin_id, skill_id) DO NOTHING;

-- === PLUGIN-AGENTS ===

INSERT INTO plugin_agents (plugin_id, agent_slug, fit, rationale)
  SELECT p.id, 'network-marketing', 'primary', 'Network Marketing Agent è costruito su queste competenze' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'lead-capture', 'secondary', 'Lead Capture fornisce moduli e arricchimento contatti' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'calendar-booking', 'secondary', 'Calendar Booking chiude con presentazioni e appuntamenti' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'social-media-agent', 'secondary', 'Social Media Agent riusa i contenuti conformi' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'copywriter', 'secondary', 'Copywriter rifinisce testi e varianti' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'email-manager', 'secondary', 'Email Manager gestisce inviti e follow-up via email' FROM plugins p WHERE p.slug = 'network-marketing'
ON CONFLICT (plugin_id, agent_slug) DO UPDATE SET
  fit = EXCLUDED.fit,
  rationale = EXCLUDED.rationale;

-- === PLUGIN-INTEGRATIONS ===
-- Regola di prodotto: "in arrivo" non è mai required.

INSERT INTO plugin_integrations (plugin_id, integration_slug, status, availability, rationale)
  SELECT p.id, 'hubspot', 'required', 'live', 'HubSpot è il CRM di contatti e pipeline' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'googlesheets', 'optional', 'live', 'Sheets come lista leggera e report senza CRM' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'googlecalendar', 'optional', 'live', 'Calendar per presentazioni e promemoria' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'gmail', 'optional', 'live', 'Gmail per inviti e follow-up su approvazione' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'slack', 'optional', 'live', 'Slack per notifiche e canale di team' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'notion', 'optional', 'live', 'Notion per playbook e knowledge base' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'trello', 'optional', 'live', 'Trello per le board di onboarding' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'asana', 'optional', 'live', 'Asana per le board di onboarding' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'clickup', 'optional', 'live', 'ClickUp per le board di onboarding' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'whatsapp', 'optional', 'coming_soon', 'WhatsApp per invio su approvazione (in arrivo: copia/wa.me)' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'instagram', 'optional', 'coming_soon', 'Instagram per contenuti (in arrivo: preparazione bozze)' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'facebook', 'optional', 'coming_soon', 'Facebook per contenuti (in arrivo: preparazione bozze)' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'tiktok', 'optional', 'coming_soon', 'TikTok per contenuti (in arrivo: preparazione bozze)' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'googlemeet', 'optional', 'coming_soon', 'Meet per i link video (in arrivo)' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'calendly', 'optional', 'coming_soon', 'Calendly per prenotazioni esterne (in arrivo)' FROM plugins p WHERE p.slug = 'network-marketing'
UNION ALL
  SELECT p.id, 'mailchimp', 'optional', 'coming_soon', 'Mailchimp per newsletter con consenso (in arrivo)' FROM plugins p WHERE p.slug = 'network-marketing'
ON CONFLICT (plugin_id, integration_slug) DO UPDATE SET
  status = EXCLUDED.status,
  availability = EXCLUDED.availability,
  rationale = EXCLUDED.rationale;
