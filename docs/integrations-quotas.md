# AgentCloud · 5 nuove integrazioni: verifica costi/quote/scope, implementazione e accettazione

Data: 13 ottobre 2026. Stato iniziale verificato nel codice: **nessuna delle 5 era live**
(Mailchimp aveva solo adapter + 3 tool in sola lettura nel backend; Microsoft solo scope
file/note). Stato finale: **22 live / 21 in arrivo**, contati dal catalogo unico
(`src/lib/integrations.ts` — pagina pubblica, dashboard e skill derivano da lì).

## 1. Verifica costi/quote/scope (documentazione ufficiale, ottobre 2026)

| Integrazione | Costo API | Quote gratuite | Scope scelti | Verifica app |
|---|---|---|---|---|
| Microsoft Outlook (Graph) | Gratuito, mail/calendar mai metered | Throttling 10.000 rich./10min per app+mailbox; 4 concorrenti | `offline_access User.Read Mail.Read Mail.ReadWrite Calendars.ReadWrite Mail.Send` (delegati) | Publisher verification gratuita; `Mail.Send` incluso perché il tool esiste e richiede comunque approvazione (il consenso lo mostra in chiaro) |
| Google Docs | Gratuito (addebiti oltre quota solo "later in 2026") | Read 3.000/min/prog., write 600/min/prog. | `drive.file` (NON-SENSITIVE, nessuna verifica obbligatoria) + `documents` (non restricted, verifica Google gratuita) — niente `drive` completo (restricted) | Nessun assessment CASA a pagamento |
| Google Forms | Gratuito, per-day illimitato | Read 975/min, `responses.list` 450/min, write 375/min (per progetto) | `forms.body` + `forms.responses.readonly` (non restricted) + `drive.file` | Nessun assessment a pagamento; niente Pub/Sub (polling on-demand) |
| Google Analytics 4 | Gratuito (costi solo per Analytics 360) | 200.000 token/giorno/proprietà standard, 40.000/ora | `analytics.readonly` (non restricted) — nessuna scrittura nel connettore | Nessun assessment a pagamento |
| Mailchimp | Registrazione app gratuita; API senza restrizioni di piano | 10 connessioni concorrenti/account; piano Free utenti: 250 contatti, 500 invii/mese | OAuth2 senza scope (permessi dall'app registrata Read-Write) | Nessun costo |

Fonti: `learn.microsoft.com` (permissions-reference, metered-api-list, throttling-limits,
delta-query, change-notifications-delivery); `developers.google.com/workspace`
(docs/forms/api/limits, drive/api-specific-auth, oauth2/scopes),
`developers.google.com/analytics/.../data/v1/quotas`,
`support.google.com/cloud` (answer/13464325 restricted, 13465431 CASA, 13464321 verifica);
`mailchimp.com/developer` (oauth2, rate-limits, api-structure) e `mailchimp.com/help`
(pricing-plans, campaign-footers, permission, anti-spam).

**Nessun requisito a costo non evitabile trovato: nessuna integrazione bloccata.**

## 2. Assunzioni esplicite (segnalate come richiesto)

1. **Outlook = provider separato `microsoft_outlook`** (stessa app Entra, riga DB e redirect
   propri `/api/integrations/microsoft_outlook/callback` da registrare in Entra): allargare
   gli scope di `microsoft` avrebbe imposto il consenso email a chi usa solo Word.
2. **Cache GA4 in memoria per istanza (TTL 30 min), nessun tetto giornaliero custom** e
   **coda Mailchimp best-effort per istanza**: niente store/lock distribuiti per restare a
   costo zero (vincolo non negoziabile). 429 gestiti con backoff + messaggio leggibile.
3. **Niente worker/cron per Forms**: sync on-demand con dedup per `responseId` (niente
   Pub/Sub/servizi fatturabili, come richiesto).
4. **`Mail.Send` incluso nel consenso Outlook** (v. tabella): senza, `outlook_send_message`
   fallirebbe con 403 dopo l'approvazione — peggio per l'utente.
5. **Tabelle Markdown in Docs**: i blocchi tabella di `create/append` vengono aggiunti in
   fondo in ordine (gli indici `insertTable` non sono calcolabili in anticipo in modo
   affidabile); `docs_insert_table` crea tabelle vere con intestazione in grassetto.
6. **`docs_export_pdf` restituisce istruzioni** (File → Scarica): il binario non può
   transitare dal risultato testuale del tool; onesto invece di un link che richiede token.
7. **"Salva su Google Docs"** implementato nel menu "Scarica come…" del **pannello laterale**
   (la card file non ha un menu, solo download diretto) + invio al tool dell'agente, che
   risponde con il link e mantiene la versione collegata.
8. **Notifiche "Avvisami"**: nel codice esiste solo per le skill, non per le integrazioni
   coming-soon → nessuna notifica da inviare.
9. **Incongruenze sito (§4)**: verificate e non presenti — home/marketplace/dashboard usano
   già il catalogo unico (niente "22 agenti" hardcoded; Shopify coming-soon coerente).
10. **Mailchimp**: l'adapter esistente presumeva refresh-token, ma i token OAuth Mailchimp
    non scadono e non hanno refresh (docs ufficiali) — il codice gestisce già `null`, nessun
    cambio necessario. `Mail.Send`-equivalente non esiste: invii solo via campagne.
11. E2E con account reali, test 429/revoca/GDPR e verifica brand-logo non eseguibili in
    questo ambiente (niente credenziali/test-runner nel repo: solo `tsc`+`eslint`) —
    checklist sotto con ciò che è automatico e ciò che resta manuale.

## 3. File e migration (ordine di applicazione)

- Provider: `providers/microsoftOutlook.ts`, `googleDocs.ts`, `googleForms.ts`,
  `googleAnalytics.ts` (mailchimp esistente).
- Moduli puri/testati: `microsoft/outlook.ts`, `agents/outlook-tools.ts`,
  `google/docs-markdown.ts`, `google/forms-questions.ts`, `google/analytics-report.ts`,
  `mailchimp/compliance.ts`.
- Proxy: `docsApiProxy`, `formsApiProxy`, `gaApiProxy`, `mailchimpWriteProxy` (+6 write
  actions) in `api-proxy.ts`; `resolveIntegrationToken` ora accetta qualsiasi provider
  implementato (retrocompatibile) per i moduli dedicati.
- Tool agenti: 11 outlook + 6 docs + 7 forms + 7 ga + 7 mailchimp-write in
  `integration-tools.ts`; approvazione per `outlook_send_message`,
  `outlook_cancel_event`, `mailchimp_schedule_campaign`, `mailchimp_send_campaign`.
- Esposizione agenti: `registry.ts` (OUTLOOK/DOCS/FORMS/GA_TOOLS + MAILCHIMP esteso),
  `feature-flags.ts`, filtro connessione in `api/agent/run/route.ts`.
- UI: catalogo `integrations.ts` (5 live), `BRAND_TO_PROVIDER`, marker `[[CONNECT:]]`,
  `InlineConnectCard`, `AgentIntegrationsCard`, `PreviewPanel` ("Salva su Google Docs"),
  guide, i18n (5 lingue: connect*, saveDocs), schede agente (`agents.ts`).
- Skill: `bozza-email-outlook`, `salva-su-google-docs`, `modulo-lead-forms`,
  `report-traffico-ga4`, `newsletter-mailchimp-conforme` (+ localizzazioni EN/ES/DE/FR).
- DB: `schema-integrations-{outlook,docs,forms,analytics}.sql` (cumulative, in ordine;
  mailchimp già nel vincolo) + `seed-skills.sql` (5 availability→live, 5 skill).
- Legale: `legal.ts` IT/EN (sub-responsabili incl. Microsoft/Mailchimp/Docs/Forms/Analytics)
  + paragrafo Outlook nei Terms in 5 lingue. **Privacy aggiornata prima del go-live: ok.**
- Env: `MS_OUTLOOK_SCOPES`, `GOOGLE_DOCS_SCOPES`, `GOOGLE_FORMS_SCOPES`,
  `GOOGLE_ANALYTICS_SCOPES` documentati in `.env.example` (+ redirect da registrare).

## 4. Test (76 asserzioni runtime, tutte verdi)

- `outlook-smoke.mts` (22): mapping messaggi/eventi, shape bozze/invii, 403→hint
  riconnessione, free/busy, Teams-link, patch parziali.
- `docs-smoke.mts` (17): parsing blocchi/inline/tabelle, range degli stili con base
  variabile, preset bullet, troncamento lettura.
- `forms-smoke.mts` (14): alias tipi, validazioni, DROPBOX, clamp scala, summary con
  distribuzione.
- `ga-smoke.mts` (12): whitelist drop, date relative, formato, z-score (picco/calo).
- `mailchimp-smoke.mts` (11): consenso obbligatorio, rispetto unsubscribe/cleaned,
  compliance verde/rosso.
- `tsc --noEmit` pulito; `eslint` pulito sui file toccati.

## 5. Checklist accettazione

- [x] 5 live in 2 click (OAuth standard + guide 3 passi + permessi minimi documentati).
- [x] Nessun servizio a pagamento (quote sopra).
- [x] Scope minimi documentati; nessun restricted senza giustificazione (nessuno).
- [x] High sempre con approvazione (4 tool in `tool-confirmation.ts` + compliance rossa
      che blocca l'invio Mailchimp anche dopo l'approvazione).
- [x] Token cifrati (store esistente), revocabili (disconnect generico + revoke Google;
      Graph delegati revocabili dall'account Microsoft — documentato in guida), mai al modello.
- [x] Dashboard: stato/expiry via `tenant_integrations` + guide + quota note negli output;
      errori leggibili in italiano.
- [x] "Salva su Google Docs" dal pannello anteprima (solo se collegato).
- [x] Contatori/schede/plugin da un'unica fonte (`INTEGRATIONS`).
- [x] Privacy/Terms aggiornati.
- [ ] E2E manuale con account gratuiti (collega→tool→scadenza→revoca→scollega→ricollega),
      test 429/GDPR e flussi Lead/Docs/GA4/Outlook/Mailchimp — da eseguire in staging
      (credenziali reali non disponibili qui).

## 6. Proposta Fase 2 (costo zero)

Ordine suggerito (stesso pattern provider+proxy+tool, scope minimi):
1. **Google Tasks** (`tasks` scope, non restricted) — chiude il cerchio agenda.
2. **Google Slides** (`presentations`, drive.file) — riusa il converter Docs.
3. **Google Meet** — via Calendar `conferenceData` (nessun scope extra).
4. **OneDrive** — riusa provider `microsoft` (+scope già Files.ReadWrite).
5. **Dropbox** — OAuth2 + file metadata/read (piano free, API gratuita).
6. **Jira Cloud** — OAuth2 + issue read/create (piano free ≤10 utenti).
