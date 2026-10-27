# Audit — Agenti autonomi (FASE 0, aggiornata)

Data: 2026-10-27 · Scopo: verifica come esistono oggi agenti, integrazioni,
multi-tenant e billing prima di costruire: esecuzione in background,
pianificazione, Autonomy Ladder, Replay, multi-agente.

---

## 0. Stato del lavoro "fatto su un altro dispositivo"

**Non è presente.** A `main` (aggiornato con `origin/main`, working tree pulito):

- Nessun branch `feature/autonomous-agents-*` locale o remoto.
- Nessuna tabella `agent_schedules` / `agent_jobs` / `agent_tasks` /
  `agent_approvals` / `agent_autonomy` in alcun schema o migrations.
- Nessuna tipizzazione o route con quei nomi; nessun `agent-worker`.
- Nessun `docs/agents-audit.md` precedente: questo file è il primo.

`agent_runs` esiste, ma **per l'uso attuale** (log + conteggio token della chat,
billing): colonne `user_id`, `agent_slug`, `started_at`, `input_tokens`… — non
ha `schedule_id`, `trigger`, `parent_run_id`, budget. Quindi le fasi partono da
qui, non c'è stato di fasi subito riusabile. **Sospetto:** il lavoro citato non
è stato pushed; se è su un disco remoto serve farlo arrivare PRIMA (o confermi
che qui si riparte da zero).

---

## 1. Come eseguono gli agenti oggi

- **Solo request/response sincroni**, nessuna esecuzione in background:
  - `POST /api/agent/run` (`src/app/api/agent/run/route.ts`) — esecuzione
    agente Claude/xKiro con streaming, tool e limiti+rate limit.
  - `POST /api/chat` — chat di piattaforma (con tool `scrape_page`, max 3 giri).
- **Loop tool**: il modello decide la tool call, il server la esegue e ripete
  (in `/api/chat` max 3 giri; in `agent/run` il conteggio tool alimenta il
  conteggio per il billing).
- **Backend configurabile**: `AGENT_LLM_PROVIDER` (`xt`/`xkiro`/`openai`/
  `anthropic`, default: xKiro se configurata, altrimenti Anthropic;
  `src/lib/agents/*` per prompt, lingua della risposta, formato output).

## 2. Tool e integrazioni (pattern riusabile)

- Token **sempre cifrati app-level** (AES-256-GCM) e per-utente/tenant
  (`user_id text` o `tenant_id text`, con `__tenant__` per admin via code):
  - `shopify_connections` (schema-shopify-oauth.sql) — OAuth public app, HMAC,
    App Bridge embedded, compliance webhooks GDPR.
  - `google_connections` + `tenant_integrations` `google_sheets` (Gmail,
    Calendar, Sheets).
  - `tenant_integrations` per 7 provider generic (`notion, slack, hubspot,
    google_sheets, github, clickup, asana`).
- Chiamate API **tutte lato server**: `lib/integrations/api-proxy.ts` con
  adapter `lib/integrations/providers/*` (interfaccia `IntegrationProvider`),
  refresh token 5m, revoca su 401. **Da riusare per il worker**, da qualunque
  runtime gira —ieri lo gira il loop della route, domani il worker è un client
  HTTP di più.

## 3. Multi-tenant e RLS

- **Le "tenants" sono gli utenti**: `auth.users.id` (UUID), dato chiave
  `user_id text`. Nessuna tabella di organizzazioni/team. RLS attiva su tutto
  (schema.sql, con policy esplicite; service role può scrivere per legittima
  eccezione nei contract points già nel codice).
- Conseguenza per FASE 1: la spec chiede `tenant_id` su agent_schedules/runs/
  autonomy. Proposta: `tenant_id = user_id` (UUID testuale), stessa convenzione
  di `tenant_integrations`. Serve conferma (decisione A3).

## 4. Crediti / billing

- Per-agente, **token-limit mensile** (`tokenLimit`), overage via Stripe Billing
  Meter (`agentcloud_token_overage`, €0,30/1.000, cap 2x → 429).
- Letture: `lib/billing/free-usage.ts`, `free-limit.ts` (conteggio run del
  giorno su `agent_runs`), `usage-tracking.ts` (insert in `agent_runs`),
  `token-pool.ts` (tetto disponibile, dedotto da allowance + overage).
- **Punti di aggancio per un budget per run**: al bootstrap del run → legge
  lo stesso tetto `token-pool` restando dentro allowance/overage; a fine run →
  stessa insert `usage-tracking` in aggiunta agli stereotipati `agent_runs` del
  run con `crediti_usati`.

## 5. Limiti runtime reali del progetto (differenza chiave dal prompt)

- **La piattaforma gira su Cloudflare Workers** (`@opennextjs/cloudflare`,
  `wrangler.jsonc`, `custom-worker.ts` con handler `scheduled`), **non Vercel**:
  commit `7e29049` "chore(infra): config solo Cloudflare - via Vercel e cron
  nativo", e c'è già un `crons: ["27 8 * * *"]`.
- **Supabase Edge Functions praticamente inutilizzate** (3 funzioni di
  waitlist). Le chiavi LLM e API già girano **lato server Next** — non ci sono
  chiavi client da togliere; il vincolo "chiama tutto via Edge Function" va
  riletto come "chiama tutto lato server".
- Cron disponibile nativamente su Cloudflare (gravità `scheduled`) → per D2
  l'alternativa più **coerente con l'infra** è il Cloudflare Cron Trigger
  esistente, non `pg_cron`+`pg_net` (che non è verificato essere abilitato).
- Da pianificare comunque: D3 ~100s/checkpoint+riaccodamento va bene anche su
  Workers (CPU/wall limits per cron trigger più corti di un invocazione HTTP,
  io restiamo con checkpoint fugace).
- Smart placement già attivo (riduce round-trip verso Supabase): il worker è
  gia vicino al DB.

## 6. Convenzioni di test

- **Nessuna cornice di test automatizzati nel repo** (package.json non ha
  `test`): la verifica permanente è `npm run typecheck` + `lint` + `build` o
  esercizio manuale. I test che si creano vanno eliminati dopo (regola permanente
  `.opencode/rules.md` per le sessioni di rischio).

---

## 7. Proposta di default (riliansati su D1–D12)

| ID | Default proposto | Perché |
|----|------------------|--------|
| D1 | `agent_jobs` con `SKIP LOCKED` | Invariato — funziona bene in Postgres |
| D2 | **Cloudflare Cron Trigger (il già esistente)**, `custom-worker.ts` chiamata interna al loop contemporaneo `POST /api/agent/worker` o chiamata diretta da `scheduled` | Zero nuova infrastruttura, già in prod; `pg_cron`/`pg_net` non verificata |
| D3 | ~100s → riaccoda dal checkpoint | Invariato |
| D4 | `AGENT_LLM_PROVIDER` già in uso + `AGENT_LLM_MODEL` | Invariato (già configurabile via env) |
| D5 | Budget default: 20 step + tetto in token (input+output del run) allineato al `tokenLimit` già esistente | Resta configurabile per-run; la "moneta" è il token, che è già ciò che il traccia il billing |
| D6 | Depth max 2, ≤4 agenti, no binari circolari | Invariato |
| D7 | Notifica in-app (esiste gia `agent_notifications` + campanella) + email Resend (già configurata) | Invariato |
| D8 | Frequenza minima 1h in beta; il cron worker può girare `*/5 * * * *` e trova solo gli schedule dovuti | Semplifica per Cloudflare |
| D9 | Retention log 30 giorni — pulizia via `scheduled` già esistente | Invariato |
| D10 | Timezone per-schedule (cron `croniter`-like lato worker) | Invariato |
| D11 | L0–L3 come da spec | Invariato |
| D12 | 10 approvazioni consecutive senza modifiche → solo **suggerimento** | Invariato |

## 8. Rischi / lacune trovate

1. **Commit remoto mancante**: senza lo stato da altro dispositivo nessuna fase
   fatta va verificata **in locale**. Se c'era, serve push, altrimenti la
   progettazione parte da zero — e il tempo su altre fasi, va ricalcolato.
2. **Nessuna tabella di organizzazioni**: se `tenant_id` = `user_id` basta
   una colonna, ma se l'obiettivo è il team (più persone sullo stesso
   schedule) serve ancora.
3. **Cloudflare Workers cron**: un handler `scheduled` ha limiti di
   CPU/tempo più stretti di una richiesta HTTP; il checkpoint a ogni step con
   ri-accodamento (D3) è obbligatorio, non opzionale.
4. **Landing**: per "renderle palese" lainfra esistente è
   `/features/[slug]` (`src/lib/i18n/featureDetails.ts`) + le sezioni della
   home; un nuovo slug (es. `agents-autonomous`) si aggiunge, non sostituisce.
5. **Nessun test automatizzato**: per la verifica RLS multi-tenant (FASE 1) va
   creato un test temporaneo ed eliminato subito dopo (regole repo), oppure si
   ripiega su SQL manuale su Supabase — da decidere.
6. **Unità del budget**: il billing conta token (`agent_runs.input_tokens`/
   `output_tokens`, overage €0,30/1.000 token); il budget per-run va espresso
   in token, non in una nuova "moneta crediti", per non duplicare contabilità.

---

## 9. Decisioni aperte da chiedere all'utente (v. conversazione)

- A1: dogma branch (`feature/autonomous-agents-*`) vs regola repo "tutto su
  main".
- A2: conferma D2 → Cloudflare Cron invece di pg_cron+pg_net.
- A3: `tenant_id` = `user_id` (o serve organizzazione/team)?
- A4: punto di aggancio landing per "palese" (confermo la `features/[slug]`).
