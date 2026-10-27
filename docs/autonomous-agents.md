# Agenti autonomi — guida operativa

Come funziona la piattaforma di agenti autonomi (Fasi 0–7) e cosa serve per
farla girare in produzione. Per l'audit di partenza vedi
[`docs/agents-audit.md`](./agents-audit.md); per lo stack e le rotte vedi
[`docs/PROJECT.md`](./PROJECT.md).

---

## Com'è fatto (sintesi)

| Pezzo | Dove | Cosa fa |
|---|---|---|
| Coda + worker | `src/lib/agents/background/*`, `POST /api/agents/worker` | Run in background: enqueue → claim `SKIP LOCKED` → esecuzione journalata (tabella `agent_run_steps`) |
| Schedulazione | `src/lib/agents/cron.ts`, `background/scheduler.ts` | Cron per-schedule (parser v5), timezone per schedule, DST verificato, minimo 1/h; scan CAS anti-doppio-tick |
| Autonomy Ladder | `src/lib/agents/autonomy.ts` | L0 osserva · L1 propone (attende approvazione) · L2 agisce e notifica · L3 autonomo. Livello per agente, contatore 10 approvazioni consecutive → **suggerimento** di promozione (mai auto-promozione) |
| Approvazioni | `background/approvals.ts`, `/dashboard/approvals` | L'utente approva / corregge (l'input editato vince sul modello) / rifiuta; email Resend best-effort |
| Replay + Mission Control | `/dashboard/runs`, `/dashboard/runs/[id]` | Timeline passo-passo navigabile (cursore + frecce + live tail via Supabase Realtime), lista run, token/crediti, catena parent/children |
| Multi-agente | `src/lib/agents/delegation.ts` | Tool `delegate_to_agent` (SOLO run background): run figli con `trigger='delegation'`, profondità max D6 = 2, budget condiviso (figlio = metà del residuo), riga `agent_tasks` con vincolo `enforce_agent_task_graph` |
| Hardening (Fase 7) | scheduler + worker + rate-limit | Rate limit trigger manuali 10/h per utente (bucket `agents-run-now`, fail-open); schedule auto-**pausa** dopo 3 fallimenti consecutivi + email; retention D9: `agent_run_steps` a 30 gg, run terminali a 90 gg (~5% dei tick) |

Protezioni trasversali:

- **RLS** su ogni tabella (`tenant_id = user_id`), testate a parte.
- **Mascheratura segreti** (`background/mask.ts`) PRIMA della scrittura dei
  passi, e ricontrollata al server nella pagina Replay (doppia difesa).
- Deleghe ed email mai esposte alla chat: il tool di delega esiste solo nel
  runner background; PATCH/POST API lato server, token non viaggiano nel DB.

---

## Setup Supabase (manuale, una tantum)

Gli schema SQL si applicano a mano in Supabase (nessuna pipeline
migrations): `supabase/schema-agents.sql`, poi
`supabase/schema-agents-fase4.sql` (colonna `consumed` su
`agent_approvals`), poi per la schedulazione
`supabase/schema-agents-scheduler.sql`.

### 1. Estensioni pg_cron e pg_net

Nel dashboard Supabase → Database → Extensions, abilita:

- `pg_cron` (il timer dei tick: un job che chiama l'endpoint worker)
- `pg_net` (il client HTTP usato da pg_cron per la chiamata)

### 2. Secret del worker nel vault

Lo scheduler SQL crea il cron che chiama l'endpoint worker usando un secret
in `vault`. Crea il secret con lo stesso valore della `CRON_SECRET` di
Vercel (vedi sotto):

```sql
select vault.create_secret(
  '<valore-di-CRON_SECRET>',
  'AGENTS_WORKER_CRON_SECRET'
);
```

### 3. Job pg_cron

`supabase/schema-agents-scheduler.sql` documenta il job di esempio
(chiamata ogni minuto a `POST /api/agents/worker`). Il file resta la fonte
di verità per la sintassi e per l'idempotenza del setup.

### 4. Realtime

`schema-agents.sql` §8 aggiunge le tabelle agents alla publication
`supabase_realtime` (se esiste, come su Supabase hostato): serve al live
refresh di Mission Control. In locale il blocco salta da solo.

---

## Environment variables

Locale (`.env`) **e soprattutto Vercel** — una variabile che esiste solo in
locale è un deploy che parte ma non funziona:

| Variabile | Obbligatoria | A cosa serve |
|---|---|---|
| `CRON_SECRET` | sì (per la schedulazione) | Auth del worker: `Bearer $CRON_SECRET`, header `x-vercel-cron-authorization` (canale Vercel) o `Bearer $ADMIN_API_TOKEN` |
| `RESEND_API_KEY` | no (best-effort) | Email di approvazione richieste e pausa schedule |
| `QUOTE_FROM_EMAIL` | no | Sender delle email (default `notifiche@agentcloud.agency`) |
| `PERPLEXITY_API_KEY` | no | `web_search`/`scrape_page` nei run background |
| `NEXT_PUBLIC_SITE_URL` | consigliata | Link assoluto nelle email |

Aggiungere su Vercel: `vercel env add CRON_SECRET production` (o dashboard).

### Config Cloudflare (da NON eliminare)

La produzione è su Vercel, ma le configurazioni Cloudflare restano intatte
per eventuale ritorno: `wrangler.jsonc` (con il suo `crons`),
`custom-worker.ts` con l'handler `scheduled()`, `scripts/safe-deploy.mjs`,
`scripts/check-cloudflare.mjs`, `wrangler` in devDependencies e
`docs/DEPLOY.md`. Il cron "usato davvero" oggi è pg_cron + pg_net su
Supabase, non Cloudflare. Non rimuoverle, non "pulirle".

---

## Autonomy Ladder: significato e regole

- **L0 osserva**: nessun side-effect; le proposte restano "avrei potuto"
  (BLOCKED_BY_L0_TEXT nel journal del passo).
- **L1 propone**: i tool con effetto reale (`SIDE_EFFECT_TOOLS` in
  `autonomy.ts`) creano una `agent_approvals` `pending`, il run va in
  `waiting_approval`, il job si chiude SENZA bruciare tentativi; la
  decisione dell'utente creerà un job nuovo.
- **L2 agisce**: esegue i side-effect e notifica in dashboard.
- **L3 autonomo**: come L2, con tetto ereditato dal budget del run.

Passaggio di livello: 10 approvazioni consecutive senza correzioni
(`PROMOTION_THRESHOLD`) = **suggerimento**, mostrato in
`/dashboard/approvals`; decide sempre l'utente (anche via PATCH
`/api/agents/autonomy`).

Deleghe (`delegate_to_agent`): max profondità 2 (D6), budget condiviso
(figlio = metà del residuo), riga `agent_tasks` max per run, soggetta a
`enforce_agent_task_graph`. Non è disponibile in chat, solo background.

---

## Procedura manuale per l'andata in produzione

1. Applicare `schema-agents.sql` + `schema-agents-fase4.sql` +
   `schema-agents-scheduler.sql` in Supabase (in quest'ordine).
2. Abilitare pg_cron + pg_net; creare il vault secret; programmare il job.
3. Impostare `CRON_SECRET` su Vercel (stesso valore del secret) + le altre
   env della tabella sopra.
4. Provare il percorso: crea uno schedule → "Esegui ora" → il run appare in
   Mission Control → il Replay mostra i passi; far fallire deliberatamente
   3 volte uno schedule per verificare la pausa automatica + email.
5. In assenza di pg_cron, il worker può essere guidato anche da un cron
   Vercel che chiama la stessa route con `x-vercel-cron-authorization`.
