# Audit — Agenti autonomi (Fase 0)

Report di solo lettura sullo stato attuale di AgentCloud, per allineare le
fasi 1–7 del progetto "agenti autonomi" con la realtà del codebase.

**Perimetro**: repo `AgentCloud`, branch `main` (commit `eb47ce9`).
**Verifiche fatte**: lettura codice, SQL migrations, config di deploy, CI.
Nessun dato reale è stato interrogato (nessun `.env` in ambiente): dove il
report afferma uno stato del DB, la query di verifica è allegata.

---

## 1. Come vengono oggi eseguiti gli agenti

**Oggi gli agenti girano solo in chat, in modo sincrono e request-scoped. Non
esiste alcuna esecuzione in background.**

### 1.1 Il loop di esecuzione

| Cosa | Dove |
|---|---|
| Motore principale (agenti selezionati) | `src/app/api/agent/run/route.ts` (949 righe) |
| Chat generica demo/anteprima | `src/app/api/chat/route.ts` (3 iterazioni tool, solo `scrape_page`/`web_search`) |
| API programmatica | `src/app/api/v1/run/route.ts` (proxy su `/api/agent/run`) |
| Consumer UI | `src/components/ChatInterface.tsx` — solo SSE, **nessun codice tool lato client** |

Flusso (tutto dentro il Worker Cloudflare, in una singola richiesta HTTP):

1. `POST /api/agent/run` → utente risolto lato server da `src/proxy.ts`
   (header `x-ac-supabase-user`, letto da `getSessionUser()` in
   `src/lib/supabase/server.ts`). Il body della richiesta non contiene mai
   l'identità.
2. Gate di billing: `assertRunAllowed()` (`src/lib/billing/usage-tracking.ts:90`)
   — vedi §4.
3. System prompt: persona da `AGENT_RUNTIME` **in codice**
   (`src/lib/agents/registry.ts`, ~1341 righe: `systemPrompt`, `model`,
   `tools`, `defaultTools`, `optionalTools` per agente) + contesto piattaforma
   (`src/lib/agents/system-prompt.ts`, `platform-context.ts`) + skills
   progressive disclosure + memoria (`src/lib/memory/*`).
4. Modello: `getLLMProvider()` (`src/lib/llm/index.ts`) → **xKiro**
   (OpenAI-compatible, `XT_API_KEY`) se presente, altrimenti **Anthropic**
   (`ANTHROPIC_API_KEY`, default `claude-sonnet-5`). Selezionabile con
   `AGENT_LLM_PROVIDER=xt|anthropic`, modello `AGENT_LLM_MODEL`.
5. Loop `while (iterations < MAX_ITERATIONS)` (route.ts:613): `provider.chat()`
   → se `stopReason === "tool_use"` → `executeTool()` (route.ts:720) →
   risultati rimessi in history → iterazione successiva.
   - `MAX_ITERATIONS = 10`, `MAX_TOKENS = 4096` (route.ts:71-75);
     beta bypass `25 / 16384` (route.ts:220).
6. Output in SSE (`text`, `tool_start`, `tool_done`, `file`, `tool_confirm`,
   `awaiting_confirmation`, `cart_updated`, `done`, `error`), riemesso parola
   per parola (`src/lib/stream.ts`).
7. A fine run: `recordUsageAndReportOverage()` (route.ts:908) scrive **una
   riga `agent_runs`** con i token; poi ingest memoria + notifiche.

### 1.2 Conferme umane (human-in-the-loop) — oggi

`src/lib/agents/tool-confirmation.ts`:

- Lista hardcoded `CONFIRMATION_TOOLS` (11 tool: `word_append`,
  `excel_write_range`, `onenote_append`, `outlook_send_message`,
  `outlook_cancel_event`, `mailchimp_*_campaign`, `integration_disconnect`,
  `github_repo_write_*`).
- Il server sospende il batch, manda `tool_confirm` e un **token HMAC** che
  contiene l'intero batch di tool_use (client non può alterare tool/input).
- **Limite critico per il progetto**: la conferma vive solo nel browser, con
  TTL 5 minuti (`CONFIRMATION_TTL_MS`), nessuna riga su DB. Per un run in
  background non esiste browser — è l'attestato che il meccanismo di
  approvazione va **rifatto su `agent_approvals`** (Fase 4), pur riutilizzando
  l'idea del token firmato per garantire l'integrità del payload proposto.

### 1.3 Persistenza oggi

- `agent_runs` (`supabase/schema.sql:286`): `user_id text`, `agent_slug`,
  `status` (default `'running'`), `input_tokens`, `output_tokens`,
  `tool_calls`, `started_at`, `finished_at`. **Scritta a fine run**, una
  riga per run. Nessuno step, nessun input/output, nessun log → **il Replay
  (Fase 5) è tuttora impossibile**: oggi si conserva solo il contatore.
- I messaggi della chat **non** sono salvati su DB dalla route (history vive
  nel browser; `conversations`/`conversation_messages` servono al
  condivisione chat, non al run).
- Agenti: catalogo in codice (`src/lib/agents/registry.ts`) + catalogo
  vendite `agents_registry` + proprietà `user_agents` (con `config jsonb`
  che contiene il pool di token, vedi §4).

### 1.4 Background: solo un cron di billing

- `wrangler.jsonc:13-16` → `"crons": ["27 8 * * *"]` (1 esecuzione al giorno).
- `custom-worker.ts:13-45` → handler `scheduled()` che invoca internamente
  `/api/billing/notify-expiring` con `Authorization: Bearer $CRON_SECRET`
  (nessun segreto esce dal Worker; la route è whitelistata in
  `src/lib/public-paths.ts:85`).
- **Niente code, niente pg_cron, niente worker agenti.** Le 3 Supabase Edge
  Functions esistenti sono solo waitlist (`supabase/functions/*`).

---

## 2. Tool e integrazioni oggi

### 2.1 Contratto dei tool

- Schema esposto al modello: `LLMTool = { name, description, input_schema }`
  (`src/lib/llm/types.ts`), **function calling nativo** (non prompt-based),
  adattato per provider in `src/lib/llm/anthropic.ts` e `src/lib/llm/openai.ts`.
- Registry: `TOOL_DEFINITIONS` + dispatcher `executeTool(name, input, context)`
  in `src/lib/agents/tools.ts` (~40+ tool: Shopify, WooCommerce, Google
  Calendar/Gmail/Sheets, artefatti, web, finance/hr/quote/reviews...).
- Estensioni: `integration-tools.ts` (GitHub/ClickUp/Asana/Notion/Slack/
  HubSpot/Drive/Docs/Forms/GA/Mailchimp/Airtable/Trello/Woo),
  `microsoft-tools.ts`, `outlook-tools.ts`, `github-repo-tools.ts`, tool MCP
  dinamici `mcp__<server>__<tool>` (`src/lib/mcp/tools.ts`).
- Esposizione per agente: `defaultTools`/`optionalTools` in `AGENT_RUNTIME` →
  `getEnabledToolsForAgent()` (`src/lib/agents/feature-flags.ts`), più gating
  sullo stato connessione (`isMicrosoftConnected`...).
- Sicurezza a ogni chiamata: `detectPromptInjection` sull'input
  (`tools.ts:1484-1488`), `logAudit("tool_invocation"/"tool_exec")`
  (`src/lib/audit`), notifiche azione (`src/lib/agents/notifications.ts`).
- Contesto: `ToolContext = { userId, tenantId, files?, githubRepo?, ephemeral? }`.

### 2.2 Dove vivono i token

**Nessuna Edge Function di proxy: le chiamate partono dal runtime Next.js
dentro il Worker.** Vedi §7-D14: questa è la divergenza più grande rispetto
alle regole del progetto ("tutte le chiamate LLM/API esterne via Supabase
Edge Functions").

| Tabella | Contenuto | Crittografia |
|---|---|---|
| `tenant_integrations` | 17 provider generici, `access_token`/`refresh_token` envelope | AES-256-GCM (`src/lib/integrations/encryption.ts`), chiave `INTEGRATIONS_TOKEN_ENCRYPTION_KEY` → `TENANT_STORE_KEY` |
| `shopify_connections` | `access_token jsonb` | AES-256-GCM (`src/lib/shopify/crypto.ts`), `SHOPIFY_TOKEN_ENCRYPTION_KEY` |
| `google_connections` | access + refresh | AES-256-GCM (`src/lib/google/crypto.ts`) |
| `mcp_connections` | access/refresh/client_secret/api_key | envelope + `tools_snapshot` |

Pattern Shopify (quello da riusare, già multi-tenant):

1. `GET /api/shopify/install` (state random in cookie httpOnly) →
2. `GET /api/shopify/callback` (CSRF state + HMAC `verifyShopifyHmac` +
   code→token + upsert crittato) →
3. Tool: `resolveShopifyCredentials(tenantId)` → `shopifyCall()` → GraphQL
   Admin con `X-Shopify-Access-Token`, revoca su 401 →
4. Risultato restituito al modello come **testo formattato** (mai il token).

Il layer generico (`src/lib/integrations/`): catalogo `catalog.ts`,
adapter `providers/*.ts`, route OAuth generiche
`/api/integrations/[provider]/{authorize,callback,disconnect}`,
`store.ts` (upsert crittato), `api-proxy.ts` (decrypt → refresh → chiamata →
testo), `http.ts` + `safe-url.ts` (guardia SSRF).

### 2.3 Effetti collaterali oggi

Non esiste una classificazione formale read/write: la separazione è implicita
nella lista `CONFIRMATION_TOOLS` (§1.2) + nelle regole di notifica di
`notifications.ts`. Per la Fase 4 servirà una **mappa tool → tipo
(lettura/scrittura)** esplicita e condivisa: è il dato su cui si reggono i
livelli L0–L3.

---

## 3. Modello multi-tenant e RLS

### 3.1 Chi è il tenant

**Non esiste organizzazioni/workspaces: il tenant è l'utente Supabase.**
`auth.uid()` = tenant. Tre convenzioni di colonna che convergono:

| Colonna | Tabelle | Isolamento |
|---|---|---|
| `user_id text` | `profiles`, `user_agents`, `agent_runs`, `subscriptions`, `carts` | `auth.uid()::text = user_id` |
| `tenant_id text` | `agent_memory_items`, `tenant_integrations`, `mcp_connections`, `conversations` | `auth.uid()::text = tenant_id` |
| `account_id uuid` | skills, network-marketing | `auth.uid() = account_id` |

Conferma in codice: `src/lib/memory/api.ts:122` → `tenantId: user.id`.
Nota: il FK verso `auth.users` è stato **droppato** e le colonne sono `text`
(`supabase/schema.sql:6-14`) — le nuove tabelle seguiranno `tenant_id text`.

Client d'accesso: `createAdminClient()` (service role, bypassa RLS) in
`src/lib/supabase/admin.ts`, client cookie in `server.ts`, anon nel browser.

### 3.2 Pattern RLS standard

```sql
-- Proprietario (schema.sql:315-318)
create policy "Users can view own agent_runs"
  on public.agent_runs for select
  using (auth.uid()::text = user_id);

-- Server (schema.sql:326, corretto, LIMITATO al ruolo)
create policy "Service role can manage agent_runs"
  on public.agent_runs for all to service_role
  using (true) with check (true);
```

`supabase/schema.sql:110-115` spiega già perché serve `to service_role`:
senza, una `for all using (true)` vale per **tutti** i ruoli. Le 46 tabelle
hanno tutte `enable row level security`; 7 hanno RLS senza policy
(deny-by-default, es. `rate_limits`, `api_keys`, `shared_chats`).

### 3.3 ⚠️ Trovato: 8 policy "Service role" SENZA `to service_role`

Ovvero `for all using (true)` aperte ad `anon`/`authenticated` — un utente
autenticato (o l'anon) potrebbe leggere/modificare/eliminare **le righe di
tutti i tenant**:

| File | Tabella |
|---|---|
| `supabase/schema-integrations.sql:140` | `tenant_integrations` (token OAuth cifrati + metadata) |
| `supabase/schema-shopify-oauth.sql:42` | `shopify_connections` (token Shopify + `uninstalled_at`) |
| `supabase/schema-google-oauth.sql:70` | `google_connections` |
| `supabase/schema-conversations.sql:83` | `conversation_agents` |
| `supabase/schema-waitlist-ranking.sql:21,71,140` | `waitlist_referral_codes`, `waitlist_referrals`, `waitlist_social_actions` |
| `supabase/schema-waitlist.sql:71` | `profiles` (duplicato più debole di quello corretto in `schema.sql`) |

I token restano cifrati (chiave lato server), ma il danno resta: lettura di
metadata cross-tenant, distruzione/tampering di righe altrui, bypass di
disconnessioni. **Le policy corrette (`to service_role`) esistono già in
`schema.sql` e `schema-mcp.sql`: è una correzione riga-per-riga, non un
riprogetto.**

Verifica live da eseguire (non eseguibile qui: nessun `.env` in ambiente):

```sql
-- come ruolo anon: deve restituire 0 righe dopo il fix
select count(*) from public.tenant_integrations limit 1;
select count(*) from public.shopify_connections limit 1;
```

**Impatto sulle fasi successive**: le nuove tabelle devono nascere con la
variante `to service_role` e con test di isolamento (Fase 1). La chiusura di
queste 8 policy è un pre-requisito di sicurezza da fare **prima** di esporre
nuove tabelle — proposta: commit dedicato in Fase 1.

---

## 4. Sistema crediti / billing

**Non esistono "crediti": ci sono due meter diversi.**

| Piano | Meter | Dove |
|---|---|---|
| Free | **1 messaggio/giorno UTC** | righe `agent_runs` create oggi (`src/lib/billing/free-limit.ts:45`), oppure `rate_limits` bucket `free-chat` per anonimi, cookie HMAC per guest |
| Paid | **token** contro un pool di piano | somma di `agent_runs.input_tokens + output_tokens` nel periodo Stripe (`token-pool.ts:117-137`), default `DEFAULT_TOKEN_LIMIT = 300_000` |
| Paid overage | token oltre il pool → **Stripe Billing Meter €0.30/1.000 token**, cap = 2× pool | `src/lib/stripe/overage.ts`, evento `agentcloud_token_overage`, idempotenza `overage-<conversation_id>` |

Funzioni centrali (`src/lib/billing/usage-tracking.ts`):

- **Pre-run**: `assertRunAllowed()` (riga 90) → restituisce
  `{ allowed, status, code }` con `402 NOT_SUBSCRIBED`, `429 LIMIT_EXCEEDED`,
  `429 OVERAGE_CAP_REACHED`. Chiamata da 4 route:
  `/api/agent/run`, `/api/chat`, `/api/v1/run`, `/api/agent/limit` (lettura).
- **Post-run**: `recordUsageAndReportOverage()` (riga 262) → insert in
  `agent_runs` + eventuale meter Stripe.
- Punti di aggancio per il budget per-run (Fase 2/D5): il **gate pre-run**
  è già il luogo unico dove rifiutare, e `agent_runs` è già la riga-per-run
  dove scalare — entrambi esistono, basta estenderli.
- Dove vive il budget attuale: `user_agents.config jsonb`
  (`tokenLimit`, `periodStart/periodEnd`, `stripeSubscriptionItemId`) scritto
  dal webhook Stripe (`src/app/api/billing/webhook/route.ts`).
- Stripe: checkout `/api/checkout` e `/api/cart/checkout`, webhook con
  firma (`billing/webhook/route.ts:289-396`), portal `/api/billing/portal`,
  PayPal separato. **Stripe deve restare in test mode** (già così: `.env`
  non contiene nemmeno le variabili Stripe — lacuna documentale in
  `.env.example`).

---

## 5. Runtime e limiti reali

### 5.1 Deploy: Cloudflare Workers (non Vercel, non Supabase per l'app)

- Build: `opennextjs-cloudflare build` → Worker `custom-worker.ts` + assets;
  `open-next.config.ts`, `placement: smart` (isolate vicino a Supabase).
- **Workers Free: 10 ms di CPU per richiesta**; Paid = 30 s (configurabile
  fino a 5 min) — `docs/DEPLOY.md:5-37`. Le route SSR costano 30-800 ms →
  errori 1102 cronici; `safe-deploy.mjs` fa health-check con auto-rollback.
- Vercel è stato rimosso del tutto (`7e29049 chore(infra):config solo
  Cloudflare - via Vercel e cron nativo`): **Vercel Cron non è un'opzione**.
- Cron attuali: solo `27 8 * * *` (quotidiano, billing).

### 5.2 Supabase

- Edge Functions: 3 (`redeem-waitlist-code`, `complete-waitlist-redemption`,
  `validate-waitlist-code`), Deno, condividono `_shared/supabase.ts`
  (service client + `getTenantIdFromAuth`). Nessuna tocca LLM/tool.
- Estensioni: `pgcrypto` ✓ (`schema-integrations.sql:21`,
  `schema-mcp.sql:15`), `uuid-ossp` ✓, **`pg_cron` ✗, `pg_net` ✗, `pgmq` ✗**
  (0 occorrenze in tutti i 31 file SQL).
- Convenzione migrazioni: **non c'è `supabase/migrations/` né
  `supabase/config.toml`** — gli SQL sono file idempotenti piatti
  (`supabase/schema-*.sql`) applicati a mano dall'SQL editor. Non esiste
  `supabase db reset` locale.
- **Supabase Realtime: mai usato** (0 occorrenze in `src/`): per Mission
  Control (Fase 5) va configurata la publication per le nuove tabelle.
- RPC già presenti: `bump_rate_limit`, `cleanup_rate_limits`
  (`schema.sql:430,449`) → modello da riusare per `claim_agent_job` e per la
  retention (D9).

### 5.3 Conseguenze per D3

Un run a step con checkpoint entra in ~100 s di *wall-clock* (il collo di
bottiglia è l'attesa LLM, I/O-bound), ma la **CPU a 10 ms (Free) è il vincolo
reale**: parsing di tool result grandi, calcolo cron, JSON pesanti. Mitigazioni
in ordine: (a) tenere il worker leggero, (b) checkpoint dopo ogni step,
(c) se servono elaborazioni pesanti → Workers Paid (~5 $/mese, già raccomandato
in `docs/DEPLOY.md:76`). Da verificare presto: la disponibilità di trigger
**ogni minuto** sul piano attuale (vedi D2).

---

## 6. Convenzioni di test e CI

- **Nessun framework di test JS/TS nel progetto**: nessuno script `test` in
  `package.json`, nessun file `vitest/jest/playwright.config.*`, **0 file
  `*.test.ts`/`*.spec.ts`**. L'unico test del repo è Dart
  (`mobile/test/chat_files_test.dart`) e uno smoke test CLI
  (`cli`: `node dist/index.js --help`).
- Nessun test SQL/pgTAP, nessuna cartella `tests/`.
- CI (`.github/workflows/`): `naming.yml` (ogni push/PR →
  `npm run lint:naming` → `check-naming.mjs`: **identificativi in inglese,
  commenti in italiano**), `cli.yml` (build+smoke su 3 OS × 3 Node),
  `desktop.yml` (build Electron). **Nessuna CI per l'app Next**: no
  typecheck/lint/build in Actions.
- Verifica permanente del repo (`.opencode/rules.md`): `npm run typecheck` +
  `npm run lint` + `npm run build` + esercizio manuale; i test scritti per la
  verifica sono **da eliminare quando passano**.

Implicazione per le fasi: i "test" del prompt vanno trattati come verifica
usa-e-getta **tranne** quelli che la verifica standard non può coprire
(mai: RLS, isolamento tenant, ordine di esecuzione). Vedi D15.

---

## 7. Proposta motivata sui default D1–D12

| ID | Default del progetto | Verdetto | Motivazione e note operative |
|----|----------------------|----------|------------------------------|
| **D1** | `agent_jobs` + `FOR UPDATE SKIP LOCKED` | ✅ **Confermato** | Nessuna dipendenza nuova; `pgmq` non c'è e non serve. *Nota tecnica*: supabase-js/PostgREST non esprime bene `SKIP LOCKED` → implementare con RPC `claim_agent_job()` (SECURITY DEFINER, `select … for update skip locked limit 1 returning *`), stesso stile di `bump_rate_limit`. Lock con `locked_at`/`locked_by` + lease scaduto (es. 120 s > D3) recuperato nello stesso tick. |
| **D2** | `pg_cron` + `pg_net` | ⚠️ **Riveduto: prima Cloudflare Cron Trigger** | `pg_cron`/`pg_net` non sono abilitati (§5.2). Il repo **ha già** il pattern vincente: `custom-worker.ts:scheduled()` → route interna con `Bearer $CRON_SECRET` (`/api/billing/notify-expiring`). Riutilizzarlo = zero estensioni nuove, stessa auth, stesso osservabilità. Ordine: (1) verificare se i trigger ogni minuto sono disponibili sul piano Workers attuale → se sì, `"* * * * *"`; (2) altrimenti abilitare `pg_cron`+`pg_net` (entrambi disponibili su Supabase) che chiamano la stessa route; (3) Vercel Cron: **non applicabile** (Vercel rimosso). Da decidere all'inizio di Fase 3, è un bloccante lì. |
| **D3** | ~100 s poi ri-accoda | ✅ **Confermato con calibrazione** | 100 s wall-clock è sotto il limite HTTP (300 s) ma il vincolo Workers Free è la **CPU 10 ms**: checkpoint dopo ogni step, lease lock ≥ 100 s, mai lavori CPU pesanti nel worker (§5.3). Suggerito 90 s come soglia di ri-accoda con margine. |
| **D4** | Modello già in uso, configurabile | ✅ **Confermato** | `getLLMProvider()` è già il punto unico (`AGENT_LLM_PROVIDER`, `AGENT_LLM_MODEL`, `XT_*`, `ANTHROPIC_API_KEY`): il worker background riusa la stessa funzione, nessun doppione. |
| **D5** | 20 step + tetto crediti | ✅ **Confermato con unità concrete** | Non esistendo crediti, proporre: **`budget_max_step = 20`** e **`budget_max_crediti = 50` dove 1 credito = 1.000 token** (stessa granularità del meter Stripe `ceil(tokens/1000)`) → 50k token/run ≈ ⅙ del pool default 300k, non basta a prosciugare un piano in un colpo. Aggiungere anche `budget_max_tokeni` esplicito? **No**: una sola unità (crediti) già allineata al billing. Pre-gate con `assertRunAllowed`, post-scala con `recordUsage` → l'overage e i limiti piano valgono da subito. |
| **D6** | Depth ≤2, ≤4 agenti/run, niente cicli | ✅ **Confermato** | Implementare come controllo in DB (RPC/trigger su `agent_tasks`) e non solo nel codice dell'orchestratore, così è vero anche se un task fallisce a metà. Profondità già implicita in `parent_run_id`. |
| **D7** | In-app + email Resend | ✅ **Confermato, nessuna dipendenza nuova** | In-app: `agent_notifications` + `createAgentNotification` (`src/lib/agents/notifications.ts`) già esiste → aggiungere `kind` tipo `approval_requested`/`run_failed`. Email: `src/lib/resend.ts` già usato per le notifiche abbonamento (`subscription-notifications.ts`). |
| **D8** | Frequenza minima 1 ora | ✅ **Confermato** | Validazione lato server sul prossimo scatto (`next_run_at - now ≥ 3600s`), non solo sull'UI. Preset leggibili generano espressioni cron sottostanti. |
| **D9** | Retention log 30 giorni | ⚠️ **Confermato con vincolo billing** | Cleanup piggyback su `cleanup_rate_limits()` (`schema.sql:449`): `agent_run_steps` (e i payload) si cancellano a 30 giorni, **ma `agent_runs` NO se le righe entrano nei sommi del periodo di billing in corso** — la somma dei token è per periodo Stripe (`token-pool.ts:117`). Regola: cancellare righe `agent_runs` solo se `finished_at < now() - 30d` **e** oltre il periodo più vecchio ancora fatturabile. |
| **D10** | Timezone per schedule, default `Europe/Rome` | ✅ **Confermato** | Nessuna libreria di data/cron nel progetto (solo `dayjs` indiretto da dipendenze). Serve valutare `cron-parser` (piccola, server-only) vs calcolo a mano; il DST ("ora legale" del test Fase 3) non si gestisce bene a mano. Anteprima 5 prossime esecuzioni via API server-side per non pesare il bundle. |
| **D11** | L0 Osserva · L1 Propone · L2 Agisce e notifica · L3 Autonomo | ✅ **Confermato** | Sostituisce/genera la lista hardcoded `CONFIRMATION_TOOLS`: serve una mappa **tool → lettura/scrittura** (o meglio: `read_only | side_effect`) condivisa tra route sincrona e worker. Default dichiarati: **L1 per scritture, L3 per letture**. L0 = blocco + step `system` "avrei fatto X" (mai azione silenziosa persa). |
| **D12** | Suggerimento promozione dopo 10 approvazioni pulite | ✅ **Confermato, mai auto-applicazione** | `agent_autonomy.promozione_suggerita = bool` è già il design giusto: il sistema suggerisce, l'utente applica/retrocede. **Micro-decisione aperta**: cosa azzera il contatore → proposta default: *sia "modifica" sia "rifiuto"* azzerano (è una sola metrica, "approvazioni consecutive **senza modifiche**"; il rifiuto dimostra che la proposta non era quella giusta). Il prompt nomin solo "modifica". |

### 7.1 Decisioni aggiuntive scaturite dall'audit (da chiudere prima di Fase 1)

| ID | Decisione | Default proposto |
|----|-----------|------------------|
| **D13** | **Collisione nome `agent_runs`**: il prompt la dà come tabella nuova, ma `agent_runs` **esiste già** (`supabase/schema.sql:286`) ed è la tabella di billing | **Estendere quella esistente** con colonne nullable (`trigger`, `schedule_id`, `parent_run_id`, `budget_max_step`, `budget_max_crediti`, `errore`, …). Zero dati toccati, e Fase 7 ("i crediti dei run in background appaiono nell'uso mensile") viene **gratis** perché il pool già somma `agent_runs`. Alternativa `agent_autonomous_runs` separata: richiederebbe un ponte di billing custom. |
| **D14** | **"Chiamate LLM/API solo via Supabase Edge Functions"** vs realtà (tutto nel Worker Next.js) | **Mantenere l'esecuzione nel backend della app** e formalizzare l'invariant corretto: *nessuna chiave lato client, ogni chiamata esterna parte da server*. Portare i 40+ tool e l'intero stack OAuth/crittografia su Deno = duplicare tutto, alto rischio, nessun guadagno di sicurezza (le chiavi già non lasciano il server). Se la regola è un vincolo di policy, va ridichiarata così. |
| **D15** | **Strategia di test** vs regola repo "i test che crei vanno eliminati quando passano" | I test **RLS/isolamento** sono l'unica cosa che typecheck/lint/build **non** possono intercettare (una policy rotta compila perfettamente) → proposta: tenere per il solo RLS un artefatto permanente (script SQL o script TS in `scripts/`), documentato in `docs/autonomous-agents.md`; tutti gli altri test ad-hoc restano usa-e-getta come da regola. Serve scegliere dove girano: serve o uno stack locale Supabase (`supabase/config.toml`, nuovo) o uno script contro un progetto di test. |
| **D16** | **Convenzione migrazioni**: il prompt chiede "migration Supabase", il repo usa file piatti idempotenti | Seguire il repo: `supabase/schema-agents.sql` (idempotente, `drop policy if exists` + `create`), applicato a mano. Non introdurre `supabase/migrations/` a metà del progetto. |
| **D17** | **Ambiente**: il prompt presuppone Windows + PowerShell, questa sessione è **Linux + bash** | Nessun impatto su Fase 0; le fasi successive useranno comandi shell classici (documentati anche come PowerShell se richiesto). Da confermare con te. |
| **D18** | **Branch/commit**: regole repo (`tutto su main, push`) vs regole prompt (branch feature + PR aperta, mai main) | Seguire il **prompt** (istruzione specifica e più recente): branch `feature/autonomous-agents-<ts>`, un commit per fase, PR aperta senza merge. In coerenza: questo report è già sul branch. |

---

## 8. Rischi e lacune

**Bloccanti / alti**

1. **RLS aperto su 4 tabelle token/integrazioni** (§3.3) — da chiudere in
   Fase 1 prima di ogni nuovo dato; le nuove tabelle devono usare
   `to service_role` dalla prima riga.
2. **Nessuna persistenza degli step oggi** (§1.3): Replay e Mission Control
   sono net-new, non un'estensione. Servono regole di mascheramento dei
   segreti/PII già in fase di scrittura (i token non arrivano mai al modello,
   ma i payload di input/output conterranno email, testi clienti, URL firmati).
3. **Trigger ogni minuto**: da verificare la disponibilità sul piano Workers
   attuale all'inizio di Fase 3 (D2); se non disponibili, serve `pg_cron`+
   `pg_net` (abiliabili) o Workers Paid.
4. **Collisione `agent_runs`** (D13): va decisa prima di scrivere la Fase 1.
5. **CPU 10 ms (Workers Free)**: un loop agenti background può sforare;
   `docs/DEPLOY.md` già raccomanda Workers Paid — decisione di budget da
   confermare.

**Medi**

6. **Approvazioni senza browser**: l'attuale meccanismo HMAC/TTL 5 min
   (§1.2) non regge run lunghi → `agent_approvals` + stato `waiting_approval`
   + schermata nuove (non esiste UI approvazioni oggi).
7. **Nessuna classificazione read/write dei tool** (§2.3): prerequisito di
   Fase 4, da derivare dalla lista `CONFIRMATION_TOOLS` e dall'elenco tool.
8. **Realtime mai configurato** (§5.2): Fase 5 richiede publication +
   handshake; in più nessun dato di coda/giallo è oggi osservabile.
9. **Nessun framework di test né CI app** (§6): ogni fase si verifica a
   mano; consigliato aggiungere typecheck/lint/build in CI come parte di
   Fase 7.
10. **Idempotenza tool con effetti collaterali**: gli adapter attuali non
    accettano chiavi di idempotenza; mitigation = registrare lo step prima
    dell'effetto (`in-flight`) e mai rieseguire uno step già `done`.
11. **DST/ora legale** senza libreria data (D10) — rischio classico di
    `next_run_at` sbagliato; test esplicito in Fase 3.

**Bassi / documentali**

12. `.env.example` non elenca le variabili Stripe (§4) — da completare.
13. Duplicato `waitlist.sql:71` debole della policy profili — da rimuovere
    col fix RLS.
14. Conflitto regole repo (push su main) vs prompt (branch) — gestito come
    D18, da confermare esplicitamente.
15. Il contenuto del report è letto dal codice/SQL locale: le affermazioni
    sul DB vivo (policy applicate, estensioni attive) vanno **confermate con
    le query allegate** prima di dichiarare "è così".

---

## 9. Sintesi per le fasi successive

- **Fase 1 (schema+RLS)**: fix 8 policy `to service_role` (§3.3) + nuove
  tabelle col pattern esistente; decidere D13/D16; test di isolamento D15.
- **Fase 2 (worker)**: ripartire da `executeTool()` e `AGENT_RUNTIME` (non
  riscrivere il loop), RPC `claim_agent_job` (D1), budget D5 agganciato a
  `assertRunAllowed`/`recordUsage`, checkpoint ogni step su `agent_run_steps`.
- **Fase 3 (scheduler)**: prima verificare D2 (trigger ogni minuto), poi UI
  schedule nel dashboard esistente.
- **Fase 4 (approvazioni+ladder)**: mappa tool read/write (§2.3), tabella
  `agent_approvals` che sostituisce il token browser-only, L1/L3 di default.
- **Fase 5 (replay+mission control)**: tutto net-new; Realtime da
  configurare; masking scritto già in scrittura.
- **Fase 6 (multi-agente)**: nessun canale agent↔agent esiste oggi (e va bene:
  contesto condiviso via `agent_tasks`, come da prompt); riusare
  `parent_run_id` per la catena.
- **Fase 7 (hardening/billing)**: estensione billing già quasi gratuita se
  D13 = estendere `agent_runs`; retention D9 col vincolo sui sommi di billing.
