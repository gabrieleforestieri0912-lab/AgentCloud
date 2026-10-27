-- =============================================================================
-- Fase 1 — Agenti autonomi: schema, RLS e coda
--
-- File idempotente, da applicare dall'editor SQL di Supabase come tutti gli
-- altri schema-*.sql del repository. Non modifica dati esistiti: le nuove
-- colonne su `agent_runs` sono nullable o con default che non invalidano le
-- righe legacy (le chat già registrate restano con trigger='manual').
--
-- Scelte allineate all'audit (docs/agents-audit.md):
--  * D1  — coda `agent_jobs` + FOR UPDATE SKIP LOCKED via RPC `claim_agent_job`,
--          nessuna dipendenza esterna (niente pgmq).
--  * D13 — `agent_runs` ESISTE già ed è la tabella di billing: la ESTENDO
--          invece di crearne una nuova, così i run in background entrano da
--          soli nel sommario dei token mensili.
--  * Chiave di tenant: `tenant_id text` sulle tabelle nuove (convenzione di
--          `tenant_integrations`/`agent_memory_items`); su `agent_runs`
--          resta `user_id` (stesso valore: il tenant è auth.uid()).
--  * Ogni policy "Service role" è LIMITATA con `to service_role` (regola
--          documentata in schema.sql:110-115 — senza, vale per tutti i ruoli).
--          Le 8 policy rotte preesistenti sono in schema-rls-service-role-fix.sql.
--  * Le tabelle nuove non hanno mai policy di update/delete per gli utenti
--          dove il prompt richiede immutabilità (agent_run_steps): la regola
--          "nessuna policy = deny" è la scelta esplicita, documentata sotto.
--
-- Matrice operazioni (utente autenticato, oltre a service_role che fa tutto):
--   agent_schedules    SELECT INSERT UPDATE DELETE   (CRUD completo del tenant)
--   agent_run_steps    SELECT INSERT                 (immutabile: vedi trigger)
--   agent_jobs         SELECT                        (la coda la muove il worker)
--   agent_tasks        SELECT                        (li scrive l'orchestratore)
--   agent_approvals    SELECT UPDATE                 (decide l'utente, solo pending)
--   agent_autonomy     SELECT UPDATE                 (l'utente cambia livello)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. agent_schedules — pianificazione per tenant/agente con timezone
-- -----------------------------------------------------------------------------
create table if not exists public.agent_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  -- Lo slug è la chiave con cui la piattaforma identifica gli agenti ovunque
  -- (agent_runs.agent_slug, user_agents.agent_slug): nessun FK a user_agents
  -- così uno schedule può esistere anche prima dell'attivazione dell'agente.
  agent_slug text not null,
  name text not null,
  instructions text not null default '',
  -- Cron da 5 campi (minuti ore giorno mese giorno-settimana). La validazione
  -- completa (campi, intervalli, frequenza minima D8) vive in TS: qui serve
  -- solo a catturare scritture assurde fatte a mano.
  cron text not null,
  timezone text not null default 'Europe/Rome',
  status text not null default 'active',
  next_run_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Per la Fase 7: N fallimenti di fila → email + pausa automatica.
  consecutive_failures integer not null default 0,
  last_run_at timestamptz,
  constraint agent_schedules_status_check
    check (status in ('active', 'paused')),
  constraint agent_schedules_tenant check (tenant_id <> ''),
  constraint agent_schedules_agent check (agent_slug <> ''),
  constraint agent_schedules_name check (btrim(name) <> '')
);

create index if not exists idx_agent_schedules_tenant_created
  on public.agent_schedules (tenant_id, created_at desc);
create index if not exists idx_agent_schedules_next_run
  on public.agent_schedules (next_run_at)
  where status = 'active';
create index if not exists idx_agent_schedules_status
  on public.agent_schedules (status);

drop trigger if exists trg_agent_schedules_updated_at on public.agent_schedules;
create trigger trg_agent_schedules_updated_at
  before update on public.agent_schedules
  for each row execute function public.touch_updated_at();

alter table public.agent_schedules enable row level security;

drop policy if exists "Users can view own agent_schedules" on public.agent_schedules;
create policy "Users can view own agent_schedules"
  on public.agent_schedules for select
  using (auth.uid()::text = tenant_id);

drop policy if exists "Users can insert own agent_schedules" on public.agent_schedules;
create policy "Users can insert own agent_schedules"
  on public.agent_schedules for insert
  with check (auth.uid()::text = tenant_id);

drop policy if exists "Users can update own agent_schedules" on public.agent_schedules;
create policy "Users can update own agent_schedules"
  on public.agent_schedules for update
  using (auth.uid()::text = tenant_id)
  with check (auth.uid()::text = tenant_id);

drop policy if exists "Users can delete own agent_schedules" on public.agent_schedules;
create policy "Users can delete own agent_schedules"
  on public.agent_schedules for delete
  using (auth.uid()::text = tenant_id);

drop policy if exists "Service role can manage agent_schedules" on public.agent_schedules;
create policy "Service role can manage agent_schedules"
  on public.agent_schedules for all
  to service_role
  using (true)
  with check (true);


-- -----------------------------------------------------------------------------
-- 2. agent_runs — estensione della tabella esistente (D13)
--    Nessun dato esistente viene toccato: solo colonne aggiunte.
--    La chiave di tenant resta `user_id` (auth.uid()::text = user_id).
-- -----------------------------------------------------------------------------
alter table if exists public.agent_runs
  add column if not exists trigger text not null default 'manual';
alter table if exists public.agent_runs
  add column if not exists schedule_id uuid
    references public.agent_schedules(id) on delete set null;
alter table if exists public.agent_runs
  add column if not exists parent_run_id uuid
    references public.agent_runs(id) on delete cascade;
alter table if exists public.agent_runs
  add column if not exists budget_max_step integer;
alter table if exists public.agent_runs
  add column if not exists budget_max_crediti integer;
alter table if exists public.agent_runs
  add column if not exists crediti_usati integer not null default 0;
alter table if exists public.agent_runs
  add column if not exists errore text;
alter table if exists public.agent_runs
  add column if not exists istruzioni text;

-- I run legacy hanno trigger='manual' (default) e nessun budget: coerente,
-- erano chat avviate a mano. `status` resta testo libero SENZA check: le
-- righe legacy portano 'completed'/'running' e un vincolo nuovo potrebbe
-- far fallire la migrazione su dati preesistenti. I valori del ciclo di vita
-- background sono: queued, running, waiting_approval, succeeded, failed,
-- cancelled (più 'completed' legacy).
create index if not exists idx_agent_runs_schedule
  on public.agent_runs (schedule_id)
  where schedule_id is not null;
create index if not exists idx_agent_runs_parent
  on public.agent_runs (parent_run_id)
  where parent_run_id is not null;
create index if not exists idx_agent_runs_status_recent
  on public.agent_runs (status, started_at desc);
create index if not exists idx_agent_runs_trigger
  on public.agent_runs (trigger, started_at desc);

-- RLS su agent_runs esiste già (schema.sql:313-330) con la variante corretta
-- `to service_role`: qui non cambia nulla, di proposito.


-- -----------------------------------------------------------------------------
-- 3. agent_run_steps — journal immutabile per il Replay (solo insert)
--    Ogni passo di un run: LLM, tool, delega, approvazione, sistema (errori).
--    `tenant_id` è denormalizzato per rendere la RLS indipendente dal join;
--    il trigger `enforce_step_tenant` impedisce passi con tenant diverso da
--    quello del run (anche per chi bypassa la RLS, es. service role che sbaglia).
-- -----------------------------------------------------------------------------
create table if not exists public.agent_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  tenant_id text not null,
  indice integer not null,
  tipo text not null,
  input jsonb,
  output text,
  tool_name text,
  durata_ms integer,
  crediti integer not null default 0,
  created_at timestamptz not null default now(),
  constraint agent_run_steps_tipo_check
    check (tipo in ('llm', 'tool', 'delegation', 'approval', 'system')),
  constraint agent_run_steps_indice_check check (indice >= 0),
  constraint agent_run_steps_crediti_check check (crediti >= 0),
  unique (run_id, indice)
);

create index if not exists idx_agent_run_steps_tenant_created
  on public.agent_run_steps (tenant_id, created_at desc);
create index if not exists idx_agent_run_steps_run
  on public.agent_run_steps (run_id, indice);

alter table public.agent_run_steps enable row level security;

-- SELECT: solo i passi del proprio tenant.
drop policy if exists "Users can view own agent_run_steps" on public.agent_run_steps;
create policy "Users can view own agent_run_steps"
  on public.agent_run_steps for select
  using (auth.uid()::text = tenant_id);

-- INSERT: solo passi del proprio tenant (e il trigger verifica che combacino
-- con il run referenziato).
drop policy if exists "Users can insert own agent_run_steps" on public.agent_run_steps;
create policy "Users can insert own agent_run_steps"
  on public.agent_run_steps for insert
  with check (auth.uid()::text = tenant_id);

-- UPDATE / DELETE: NESSUNA policy per gli utenti = deny by default.
-- È la garanzia di immutabilità lato RLS (il solo insert è concesso).
-- Un trigger separato blocca anche il service_role: vedi sotto.
drop policy if exists "Service role can manage agent_run_steps" on public.agent_run_steps;
create policy "Service role can manage agent_run_steps"
  on public.agent_run_steps for all
  to service_role
  using (true)
  with check (true);

-- Immutabilità assoluta della journal: nessuna modifica, nemmeno dal server.
-- La retention (D9) elimina righe con DELETE, che resta consentita al
-- service_role tramite la policy qui sopra.
create or replace function public.reject_agent_run_step_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'agent_run_steps e'' immutabile (solo insert): %', tg_op;
end;
$$;

drop trigger if exists trg_agent_run_steps_immutable on public.agent_run_steps;
create trigger trg_agent_run_steps_immutable
  before update on public.agent_run_steps
  for each row execute function public.reject_agent_run_step_update();

-- Il passo deve appartenere allo stesso tenant del run a cui è agganciato.
create or replace function public.enforce_agent_run_step_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant text;
begin
  select user_id into v_tenant
  from public.agent_runs
  where id = new.run_id;

  if v_tenant is null then
    raise exception 'agent_run_steps.run_id inesistente: %', new.run_id;
  end if;
  if new.tenant_id is distinct from v_tenant then
    raise exception
      'agent_run_steps.tenant mismatch: step del tenant % su run del tenant %',
      new.tenant_id, v_tenant;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agent_run_step_tenant on public.agent_run_steps;
create trigger trg_agent_run_step_tenant
  before insert on public.agent_run_steps
  for each row execute function public.enforce_agent_run_step_tenant();


-- -----------------------------------------------------------------------------
-- 4. agent_jobs — coda dei run con SKIP LOCKED (D1)
--    Un solo job attivo per run (indice unico parziale): è l'idempotenza di
--    base — il doppio scheduler tick o il doppio worker non possono doppio
--    inserire lo stesso run.
--    Il lease (`locked_at`) garantisce che un worker morto venga ripreso:
--    `claim_agent_job` rivendica anche i job 'running' con lock scaduto.
-- -----------------------------------------------------------------------------
create table if not exists public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  tenant_id text not null,
  scheduled_for timestamptz not null default now(),
  tentativi integer not null default 0,
  max_tentativi integer not null default 5,
  locked_at timestamptz,
  locked_by text,
  stato text not null default 'queued',
  ultimo_errore text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_jobs_stato_check
    check (stato in ('queued', 'running', 'done', 'failed', 'cancelled')),
  constraint agent_jobs_tentativi_check
    check (tentativi >= 0 and tentativi <= max_tentativi)
);

-- Indice di prelievo per il claim (parziale: copre solo le righe in coda o
-- in esecuzione, quelle che la query di claim filtra).
create index if not exists idx_agent_jobs_claim
  on public.agent_jobs (scheduled_for)
  where stato in ('queued', 'running');

-- Un solo job attivo per run: seconda prenotazione = conflitto gestito.
create unique index if not exists uq_agent_jobs_active_run
  on public.agent_jobs (run_id)
  where stato in ('queued', 'running');

create index if not exists idx_agent_jobs_tenant_created
  on public.agent_jobs (tenant_id, created_at desc);
create index if not exists idx_agent_jobs_stato
  on public.agent_jobs (stato);

drop trigger if exists trg_agent_jobs_updated_at on public.agent_jobs;
create trigger trg_agent_jobs_updated_at
  before update on public.agent_jobs
  for each row execute function public.touch_updated_at();

alter table public.agent_jobs enable row level security;

drop policy if exists "Users can view own agent_jobs" on public.agent_jobs;
create policy "Users can view own agent_jobs"
  on public.agent_jobs for select
  using (auth.uid()::text = tenant_id);

-- INSERT / UPDATE / DELETE: nessuna policy utente = solo il worker (service
-- role) muove la coda. Gli utenti la leggono (Mission Control).
drop policy if exists "Service role can manage agent_jobs" on public.agent_jobs;
create policy "Service role can manage agent_jobs"
  on public.agent_jobs for all
  to service_role
  using (true)
  with check (true);

-- Prelievo atomico di un job: FOR UPDATE SKIP LOCKED + lease scaduto.
-- SECURITY DEFINER perché il prelievo è un'operazione interna della coda;
-- non legge dati cross-tenant (restituisce un solo job qualsiasi), e i dati
-- del run arrivano sempre filtrati dalle policy delle tabelle di lettura.
-- Un tentativo viene contato A PRELIEVO: se il worker muore, la ripresa del
-- lease riguarda comunque una riga già conteggiata (tentativi <= max).
create or replace function public.claim_agent_job(
  p_worker text,
  p_lease_seconds integer default 180
)
returns setof public.agent_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.agent_jobs%rowtype;
begin
  select * into v_job
  from public.agent_jobs
  where (
      stato = 'queued'
      and scheduled_for <= now()
    )
    or (
      stato = 'running'
      and locked_at is not null
      and locked_at < now() - make_interval(secs => greatest(p_lease_seconds, 30))
    )
  order by scheduled_for
  for update skip locked
  limit 1;

  if not found then
    return;
  end if;

  if v_job.tentativi >= v_job.max_tentativi then
    update public.agent_jobs
    set stato = 'failed',
        ultimo_errore = coalesce(
          ultimo_errore,
          'tentativi esauriti (' || v_job.max_tentativi || ')'
        ),
        locked_at = null,
        locked_by = null,
        updated_at = now()
    where id = v_job.id
    returning * into v_job;
    return next v_job;
    return;
  end if;

  update public.agent_jobs
  set stato = 'running',
      locked_at = now(),
      locked_by = p_worker,
      tentativi = tentativi + 1,
      updated_at = now()
  where id = v_job.id
  returning * into v_job;

  return next v_job;
end;
$$;

revoke all on function public.claim_agent_job(text, integer) from public;
revoke all on function public.claim_agent_job(text, integer) from anon;
revoke all on function public.claim_agent_job(text, integer) from authenticated;
grant execute on function public.claim_agent_job(text, integer) to service_role;


-- -----------------------------------------------------------------------------
-- 5. agent_tasks — scomposizione multi-agente (Fase 6)
--    `dipende_da` è l'elenco di task da cui questo dipende: l'orchestratore
--    ordina l'esecuzione in topologia, il worker non parte finché i
--    predecessori non sono 'succeeded'. Il vincolo anti-ciclo (D6) e la
--    profondità max sono garantiti da `enforce_agent_task_graph` (sotto).
-- -----------------------------------------------------------------------------
create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  tenant_id text not null,
  titolo text not null,
  assegnato_ad text not null,
  dipende_da uuid[] not null default '{}',
  stato text not null default 'pending',
  input text,
  output text,
  profondita integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_tasks_stato_check
    check (stato in ('pending', 'running', 'succeeded', 'failed', 'skipped')),
  constraint agent_tasks_profondita_check
    check (profondita >= 0 and profondita <= 2),
  constraint agent_tasks_tenant check (tenant_id <> '')
);

create index if not exists idx_agent_tasks_run on public.agent_tasks (run_id);
create index if not exists idx_agent_tasks_tenant_created
  on public.agent_tasks (tenant_id, created_at desc);
create index if not exists idx_agent_tasks_stato on public.agent_tasks (stato);

drop trigger if exists trg_agent_tasks_updated_at on public.agent_tasks;
create trigger trg_agent_tasks_updated_at
  before update on public.agent_tasks
  for each row execute function public.touch_updated_at();

alter table public.agent_tasks enable row level security;

drop policy if exists "Users can view own agent_tasks" on public.agent_tasks;
create policy "Users can view own agent_tasks"
  on public.agent_tasks for select
  using (auth.uid()::text = tenant_id);

-- INSERT/UPDATE/DELETE: solo l'orchestratore (service role).
drop policy if exists "Service role can manage agent_tasks" on public.agent_tasks;
create policy "Service role can manage agent_tasks"
  on public.agent_tasks for all
  to service_role
  using (true)
  with check (true);

-- Vincoli del grafo (D6): niente deleghe circolari e niente dipendenze
-- verso task di un altro run. Controllati a ogni scrittura, così valgono
-- anche se un codice sbagliato prova a inserirli.
create or replace function public.enforce_agent_task_graph()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_depth integer;
  v uuid;
  v_foreign_tenant text;
  v_foreign_run uuid;
begin
  if new.dipende_da is null then
    new.dipende_da = '{}';
  end if;

  -- Le dipendenze devono stare tutte nello stesso run.
  foreach v in array new.dipende_da loop
    select tenant_id, run_id into v_foreign_tenant, v_foreign_run
    from public.agent_tasks where id = v;

    if v_foreign_run is null then
      raise exception 'agent_tasks.dipende_da: task inesistente %', v;
    end if;
    if v_foreign_run is distinct from new.run_id then
      raise exception 'agent_tasks.dipende_da: task % appartiene a un altro run', v;
    end if;
    if v_foreign_tenant is distinct from new.tenant_id then
      raise exception 'agent_tasks.dipende_da: task % appartiene a un altro tenant', v;
    end if;
    if v = new.id then
      raise exception 'agent_tasks.dipende_da: auto-delega circolare';
    end if;
  end loop;

  -- Anti-ciclo: nessun predecessore può (transitivamente) raggiungere new.id.
  -- La profondità massima di D6 è 2, quindi la catena è corta per costruzione.
  if array_length(new.dipende_da, 1) > 0 then
    with recursive chain as (
      select id, dipende_da, 1 as lvl
      from public.agent_tasks
      where id = any (new.dipende_da)
      union all
      select t.id, t.dipende_da, c.lvl + 1
      from public.agent_tasks t
      join chain c on t.id = any (c.dipende_da)
      where c.lvl < 16
    )
    select max(lvl) into v_depth from chain;

    if coalesce(v_depth, 0) >= 16 then
      raise exception 'agent_tasks: dipendenze circolari rilevate (run %)', new.run_id;
    end if;
    if exists (
      select 1 from chain where id = new.id
    ) then
      raise exception 'agent_tasks: delega circolare verso il task %', new.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_agent_task_graph on public.agent_tasks;
create trigger trg_agent_task_graph
  before insert or update of dipende_da on public.agent_tasks
  for each row execute function public.enforce_agent_task_graph();


-- -----------------------------------------------------------------------------
-- 6. agent_approvals — human-in-the-loop persistente (Fase 4)
--    Sostituisce il token HMAC browser-only di tool-confirmation.ts per i run
--    in background: lo stato vive su DB, sopravvive alla chiusura della
--    pagina, e `modificata` azzera il contatore delle approvazioni pulite.
-- -----------------------------------------------------------------------------
create table if not exists public.agent_approvals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  step_id uuid references public.agent_run_steps(id) on delete set null,
  tenant_id text not null,
  agent_slug text not null,
  -- Payload dell'azione proposta in chiaro: { tool, input, ... } — nessun
  -- segreto può comparirci (i token non entrano mai negli input dei tool:
  -- vedi docs/agents-audit.md §2.2).
  azione jsonb not null,
  stato text not null default 'pending',
  decisa_da text,
  decisa_il timestamptz,
  modificata boolean not null default false,
  created_at timestamptz not null default now(),
  constraint agent_approvals_stato_check
    check (stato in ('pending', 'approved', 'rejected', 'edited'))
);

create index if not exists idx_agent_approvals_tenant_created
  on public.agent_approvals (tenant_id, created_at desc);
create index if not exists idx_agent_approvals_run
  on public.agent_approvals (run_id);
create index if not exists idx_agent_approvals_pending
  on public.agent_approvals (stato, created_at)
  where stato = 'pending';

alter table public.agent_approvals enable row level security;

drop policy if exists "Users can view own agent_approvals" on public.agent_approvals;
create policy "Users can view own agent_approvals"
  on public.agent_approvals for select
  using (auth.uid()::text = tenant_id);

-- UPDATE: solo chi decide, solo finché è pending. `with check` impedisce di
-- riscrivere il tenant per spostare la decisione su un run altrui.
drop policy if exists "Users can decide own agent_approvals" on public.agent_approvals;
create policy "Users can decide own agent_approvals"
  on public.agent_approvals for update
  using (auth.uid()::text = tenant_id and stato = 'pending')
  with check (auth.uid()::text = tenant_id);

-- INSERT/DELETE: solo il worker (crea la richiesta).
drop policy if exists "Service role can manage agent_approvals" on public.agent_approvals;
create policy "Service role can manage agent_approvals"
  on public.agent_approvals for all
  to service_role
  using (true)
  with check (true);


-- -----------------------------------------------------------------------------
-- 7. agent_autonomy — Autonomy Ladder (D11/D12)
--    Una riga per (tenant, agente, azione). `azione` NULL = default
--    dell'agente (come da specifica): per questo gli indici di unicità sono
--    parziali, perché in Postgres NULL non è uguale a NULL.
--    Livelli: L0 osserva · L1 propone (serve approvazione) · L2 agisce e
--    notifica · L3 autonomo entro budget.
--    Default per nuovi agenti/azioni: L1 su scritture, L3 su letture —
--    il valore di default NON è scritto qui (non esiste riga finché non
--    serve): la risoluzione è in TS (`resolveAutonomyLevel`), che applica
--    L1 per i tool con effetti collaterali e L3 per le letture.
-- -----------------------------------------------------------------------------
create table if not exists public.agent_autonomy (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  agent_slug text not null,
  azione text,
  livello text not null default 'L1',
  approvazioni_consecutive_ok integer not null default 0,
  promozione_suggerita boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_autonomy_livello_check
    check (livello in ('L0', 'L1', 'L2', 'L3')),
  constraint agent_autonomy_counter_check
    check (approvazioni_consecutive_ok >= 0),
  -- La soglia D12 è 10: oltre non serve contare, basta il booleano.
  constraint agent_autonomy_counter_max
    check (approvazioni_consecutive_ok <= 1000)
);

-- Un solo "default agente" (azione IS NULL) e una riga per azione.
create unique index if not exists uq_agent_autonomy_agent_default
  on public.agent_autonomy (tenant_id, agent_slug)
  where azione is null;
create unique index if not exists uq_agent_autonomy_agent_action
  on public.agent_autonomy (tenant_id, agent_slug, azione)
  where azione is not null;

create index if not exists idx_agent_autonomy_tenant
  on public.agent_autonomy (tenant_id, agent_slug);

drop trigger if exists trg_agent_autonomy_updated_at on public.agent_autonomy;
create trigger trg_agent_autonomy_updated_at
  before update on public.agent_autonomy
  for each row execute function public.touch_updated_at();

alter table public.agent_autonomy enable row level security;

drop policy if exists "Users can view own agent_autonomy" on public.agent_autonomy;
create policy "Users can view own agent_autonomy"
  on public.agent_autonomy for select
  using (auth.uid()::text = tenant_id);

-- UPDATE: l'utente retrocede/promuove il livello; il worker aggiorna il
-- contatore e il flag di suggerimento. Entrambi operano nel proprio tenant.
drop policy if exists "Users can update own agent_autonomy" on public.agent_autonomy;
create policy "Users can update own agent_autonomy"
  on public.agent_autonomy for update
  using (auth.uid()::text = tenant_id)
  with check (auth.uid()::text = tenant_id);

-- INSERT/DELETE: crea/rimuove righe solo il server (la prima azione che
-- richiede una decisione crea la riga se mancante).
drop policy if exists "Service role can manage agent_autonomy" on public.agent_autonomy;
create policy "Service role can manage agent_autonomy"
  on public.agent_autonomy for all
  to service_role
  using (true)
  with check (true);


-- -----------------------------------------------------------------------------
-- 8. Realtime per Mission Control (Fase 5)
--    Su Supabase la publication esiste già: la DO block la aggiorna solo se
--    mancante, così il file resta idempotente anche in locale (dove la
--    publication non c'è e il blocco salta).
-- -----------------------------------------------------------------------------
do $$
declare
  v_table text;
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    raise notice 'publication supabase_realtime assente: realtime saltato (ok in locale)';
    return;
  end if;

  foreach v_table in array array[
    'agent_runs', 'agent_run_steps', 'agent_jobs',
    'agent_approvals', 'agent_tasks', 'agent_schedules', 'agent_autonomy'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I', v_table
      );
      raise notice 'realtime: aggiunta public.%', v_table;
    end if;
  end loop;
end;
$$;
