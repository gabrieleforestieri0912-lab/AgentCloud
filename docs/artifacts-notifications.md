# AgentCloud · Artifacts & notifiche: architettura e decisioni

## Artefatti (il pannello laterale)

** riuso**: gli "artifacts" sono i file chat esistenti (`<agentcloud_file>`):
card compatta in chat + `PreviewPanel` (Preview/Code, versioni, download/copy,
tabella CSV, retry, mobile fullscreen, iframe sandbox `allow-scripts` senza
`allow-same-origin` + CSP stretta, SVG sanitizzato in allowlist, cap 2 MB),
persistenza `chat_files`/`chat_file_versions` con RLS per account, hook
"Salva su Drive/Notion/Docs".

**Aggiunto**:
- Tool `create_artifact` (tipi: markdown/html/code/svg/mermaid/csv/text),
  `update_artifact` (str_replace, old_str esattamente una volta) e
  `rewrite_artifact`. I tool emettono JSON `file_created` → la run invia evento
  SSE `file` → il client aggiunge il blocco al messaggio (card+anteprima anche
  dopo il reload). La scrittura XML diretta resta valida e streama live.
- Il client invia i contenuti correnti dei file nel payload della run (cap
  100k caratteri): `update/rewrite` lavorano sull'ultima versione, comprese le
  modifiche dell'utente.
- `mermaid`: rendering client con debounce 700 ms (niente sfarfallio in
  streaming), output sanitizzato come gli SVG; errore → messaggio + fallback codice.
- Restore versione (nuova versione, mai distruttivo) ed editing inline utente
  (`created_by=user`); il blocco nel messaggio si aggiorna, quindi l'agente al
  turno dopo vede la modifica.
- Prompt: `ARTIFACT_DIRECTIVE` (quando/non-quando, mai contenuto duplicato).
- `react`: **escluso** — servirebbe trascompilazione live in sandbox, rischio
  non giustificato per la v1.

**Sicurezza**: iframe opaco (niente cookie/storage/DOM app), CSP
`connect-src 'none'` di fatto (solo inline consentiti), Markdown senza HTML
eseguito, SVG in allowlist, titoli escapati, cap 2 MB (+ rate limit esistenti),
audit senza contenuti, niente segreti nel contesto.

## Notifiche web

**Riuso**: campanella + polling 30 s + badge + pannello + API read +
`agent_notifications` (RLS) + Resend per le transazionali.

**Aggiunto**:
- Entry unica `createAgentNotification`: applica preferenze + dedupe prima di scrivere.
- Dedupe: `dedupe_key` per entità + `count` sulle non lette ("×12", non 12 righe).
- Preferenze per categoria (`notification_preferences`, assente = abilitato):
  runs/commerce/scheduling/leads/finance/messaging/documents; matrice in
  `/settings`; disabilitare blocca davvero la scrittura.
- Campanella: filtri Tutte/Non lette, toast (solo tab col focus), badge `(N)`
  nel titolo quando in background, sync lettura tra tab via BroadcastChannel.
- API: `GET/PUT /api/notifications/preferences`; lista con `count`.

**Volutamente fuori**: Web Push (VAPID+SW), digest email/cron, quiet hours,
presence/idle, purge 90 giorni, share per-artefatto, deep-link artefatto dalle
notifiche (aprono /dashboard o la chat). Motivo: niente infrastruttura
cron/push nel progetto; costo/complessità non giustificati ora.

## Test

`npm run test:unit` (node:test, moduli puri): str_replace, tipi/id file,
sostituzione blocchi, regole notifiche (categorie, dedupe, raffica 20→1 chiave).
RLS cross-account: policy `chat_files_own`/`chat_file_versions_own` e select su
`agent_notifications` per `user_id` — verifica manuale in staging con due
utenti (nessun runner DB nel repo).
