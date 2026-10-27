-- =============================================================================
-- Test RLS — isolamento multi-tenant delle tabelle agenti (Fase 1)
--
-- Auto-verificante: ogni asserzione fallita solleva un'eccezione e fa
-- abortire lo script (visibile come errore rosso); ogni asserzione riuscita
-- emette un NOTICE `PASS: ...`. Lo script gira in una transazione e finisce
-- con ROLLBACK, quindi NON lascia dati dietro.
--
-- Cosa dimostra:
--   1. tenant A legge SOLO le righe di A (schedules, steps, jobs, tasks,
--      approvals, autonomy, runs);
--   2. tenant A non può scrivere sulle righe di B (update/delete filtrati in
--      silenzio dalla RLS → 0 righe, insert con tenant B → 42501);
--   3. nessuna policy di insert dove il worker deve solo leggere (jobs, tasks);
--   4. agent_run_steps è immutabile (trigger su UPDATE anche per service_role);
--   5. il trigger di tenant impedirrebbe anche un passo "con tenant giusto ma
--      run sbagliato" (difesa contro il service role che sbaglia);
--   6. un utente decide solo le proprie approvals pending (mai quelle di B,
--      mai due volte);
--   7. un utente non può eseguire `claim_agent_job` (coda solo worker);
--   8. la coda atomica funziona (claim → running, tentativi=1) e l'unicità
--      del job attivo per run regge il doppio inserimento;
--   9. l'unicità del default autonomy regge il doppio inserimento;
--  1. legacy: una chat registrata prima della migrazione (status 'completed',
--      colonne budget NULL) è ancora visibile e utilizzabile.
--
-- Esecuzione (locale):
--   vedi supabase/tests/local-bootstrap.sql — da applicare DOPO schema.sql,
--   schema-rls-service-role-fix.sql e schema-agents.sql.
-- Su Supabase: incollare nell'editor SQL ed eseguire (idempotent, rollback).
-- =============================================================================

begin;

-- Tenant di test: a = tenant A (aaaaaaaa-…0001), b = tenant B (bbbbbbbb-…0002)
-- (uuid fissi scritti inline: nessuno collide con utenti reali, e lo script
-- resta eseguibile anche dall'editor SQL di Supabase, senza meta-comandi).

-- -----------------------------------------------------------------------------
-- Seed (service_role: bypassa la RLS, come fa il worker in produzione)
-- -----------------------------------------------------------------------------
set local role service_role;

insert into public.agent_schedules
  (id, tenant_id, agent_slug, name, cron, next_run_at, created_by)
values
  ('10000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   'shopify-agent', 'Report vendite', '0 8 * * 1', now() + interval '1 day',
   'aaaaaaaa-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002',
   'shopify-agent', 'Segreto di B', '0 9 * * *', now() + interval '2 day',
   'bbbbbbbb-0000-4000-8000-000000000002');

-- Run legacy (pre-migrazione: status 'completed', budget assenti) + run nuovi.
insert into public.agent_runs
  (id, user_id, agent_slug, status, started_at, finished_at)
values
  ('20000000-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001',
   'shopify-agent', 'completed', now() - interval '3 day', now() - interval '3 day'),
  ('20000000-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002',
   'shopify-agent', 'queued', now(), null);

update public.agent_runs
set trigger = 'schedule',
    schedule_id = '10000000-0000-4000-8000-000000000001',
    budget_max_step = 20,
    budget_max_crediti = 50
where id = '20000000-0000-4000-8000-000000000001';

insert into public.agent_run_steps
  (id, run_id, tenant_id, indice, tipo, input, output, crediti)
values
  ('30000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000001', 0, 'llm', '{"prompt":"in"}', 'risposta A', 2),
  ('30000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000002',
   'bbbbbbbb-0000-4000-8000-000000000002', 0, 'llm', '{"prompt":"in"}', 'risposta B', 1);

insert into public.agent_jobs
  (id, run_id, tenant_id, stato)
values
  ('40000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000001', 'queued'),
  ('40000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000002',
   'bbbbbbbb-0000-4000-8000-000000000002', 'queued');

insert into public.agent_tasks
  (id, run_id, tenant_id, titolo, assegnato_ad, stato)
values
  ('70000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000001', 'Analizza vendite', 'business-manager', 'pending'),
  ('70000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000002',
   'bbbbbbbb-0000-4000-8000-000000000002', 'Attivita di B', 'business-manager', 'pending');

insert into public.agent_approvals
  (id, run_id, step_id, tenant_id, agent_slug, azione, stato)
values
  ('50000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001',
   '30000000-0000-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000001', 'shopify-agent',
   '{"tool":"gmail_send","input":{"to":"x@y.z"}}', 'pending'),
  ('50000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000002',
   '30000000-0000-4000-8000-000000000002',
   'bbbbbbbb-0000-4000-8000-000000000002', 'shopify-agent',
   '{"tool":"slack_post_message","input":{"text":"segreto di B"}}', 'pending');

insert into public.agent_autonomy
  (id, tenant_id, agent_slug, azione, livello)
values
  ('60000000-0000-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000001', 'shopify-agent', null, 'L2'),
  ('60000000-0000-4000-8000-000000000002',
   'bbbbbbbb-0000-4000-8000-000000000002', 'shopify-agent', null, 'L0');

-- Righe delle tabelle con le policy "Service role" ROTTE (ora fissate da
-- schema-rls-service-role-fix.sql): servono a dimostrare che il fix funziona.
-- Prima del fix, un utente autenticato vedeva TUTTE queste righe (la policy
-- `for all using (true)` senza `to service_role` valeva per tutti i ruoli).
insert into public.tenant_integrations
  (id, tenant_id, provider, status, access_token, external_account_id)
values
  ('80000000-0000-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000001', 'notion', 'connected',
   '{"data":"token-cifrato-A","iv":"x","tag":"y"}', 'workspace-a'),
  ('80000000-0000-4000-8000-000000000002',
   'bbbbbbbb-0000-4000-8000-000000000002', 'slack', 'connected',
   '{"data":"token-cifrato-B","iv":"x","tag":"y"}', 'team-b');

insert into public.shopify_connections
  (id, user_id, shop_domain, access_token)
values
  ('90000000-0000-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000001', 'negozio-a.myshopify.com',
   '{"data":"shopify-A","iv":"x","tag":"y"}'),
  ('90000000-0000-4000-8000-000000000002',
   'bbbbbbbb-0000-4000-8000-000000000002', 'negozio-b.myshopify.com',
   '{"data":"shopify-B","iv":"x","tag":"y"}');

-- (A) Un secondo job ATTIVO sullo stesso run deve essere respinto: è
-- l'idempotenza di base della coda (doppio tick / doppio worker).
do $$
begin
  insert into public.agent_jobs (run_id, tenant_id, stato)
  values ('20000000-0000-4000-8000-000000000001',
          'aaaaaaaa-0000-4000-8000-000000000001', 'queued');
  raise exception 'FALLITO: doppio job attivo per lo stesso run accettato';
exception
  when unique_violation then
    raise notice 'PASS: un solo job attivo per run (unique_violation su doppio insert)';
end;
$$;

-- (B) Un solo "default agente" in agent_autonomy per tenant+agente.
do $$
begin
  insert into public.agent_autonomy (tenant_id, agent_slug, azione, livello)
  values ('aaaaaaaa-0000-4000-8000-000000000001', 'shopify-agent', null, 'L1');
  raise exception 'FALLITO: secondo default autonomy per lo stesso agente';
exception
  when unique_violation then
    raise notice 'PASS: un solo record autonomy di default per tenant+agente';
end;
$$;

-- (C) Un passo con tenant diverso dal run deve essere bloccato dal trigger
--     (anche col service_role, che la RLS non frena).
do $$
begin
  insert into public.agent_run_steps
    (run_id, tenant_id, indice, tipo, output)
  values ('20000000-0000-4000-8000-000000000002',
          'aaaaaaaa-0000-4000-8000-000000000001', 5, 'system', 'cross');
  raise exception 'FALLITO: passo cross-tenant inserito (trigger non ha fermato)';
exception
  when raise_exception then
    if sqlerrm like 'FALLITO:%' then raise; end if;
    raise notice 'PASS: trigger tenant blocca un passo sul run di un altro tenant';
end;
$$;

-- (D) agent_run_steps è immutabile anche per il service_role.
do $$
begin
  update public.agent_run_steps
  set output = 'modificato'
  where id = '30000000-0000-4000-8000-000000000001';
  raise exception 'FALLITO: agent_run_steps aggiornabile (immutabilita violata)';
exception
  when raise_exception then
    if sqlerrm like 'FALLITO:%' then raise; end if;
    raise notice 'PASS: agent_run_steps immutabile (UPDATE respinta dal trigger)';
end;
$$;

-- (L) Fill-once (Fase 2): il runner pre-inserisce il passo di un tool come
--     claim di idempotenza (output NULL) e lo compila una sola volta. Deve
--     riuscire la PRIMA compilazione, fallire la seconda e fallire anche una
--     compilazione che altera i dati del claim (input/indice/tenant).
do $$
declare
  v_claim uuid;
  v_alters uuid;
begin
  insert into public.agent_run_steps
    (run_id, tenant_id, indice, tipo, input, tool_name)
  values ('20000000-0000-4000-8000-000000000002',
          'bbbbbbbb-0000-4000-8000-000000000002', 7, 'tool',
          '{"toolUseId":"t1","name":"web_search"}', 'web_search')
  returning id into v_claim;

  -- Prima (e unica) compilazione: ammessa dal trigger.
  update public.agent_run_steps
  set output = 'esito del tool', durata_ms = 12
  where id = v_claim;

  begin
    update public.agent_run_steps
    set output = 'seconda scrittura'
    where id = v_claim;
    raise exception 'FALLITO: doppia compilazione del passo accettata';
  exception
    when raise_exception then
      if sqlerrm like 'FALLITO:%' then raise; end if;
      raise notice 'PASS: fill-once (seconda scrittura respinta dal trigger)';
  end;

  -- Compilazione che altera i dati del claim: vietata, e il passo resta
  -- compilabile in seguito (l'update rifiutato non consuma la fill).
  insert into public.agent_run_steps
    (run_id, tenant_id, indice, tipo, input, tool_name)
  values ('20000000-0000-4000-8000-000000000002',
          'bbbbbbbb-0000-4000-8000-000000000002', 8, 'tool',
          '{"toolUseId":"t2","name":"web_search"}', 'web_search')
  returning id into v_alters;

  begin
    update public.agent_run_steps
    set output = 'con input alterato', input = '{"toolUseId":"t3"}'
    where id = v_alters;
    raise exception 'FALLITO: fill con input alterato accettata';
  exception
    when raise_exception then
      if sqlerrm like 'FALLITO:%' then raise; end if;
      raise notice 'PASS: fill-once non altera i dati del claim (update rifiutato)';
  end;

  -- Il rifiuto precedente non ha consumato la fill: ora si può compilare.
  update public.agent_run_steps
  set output = 'esito corretto'
  where id = v_alters;
  raise notice 'PASS: claim ancora compilabile dopo un update rifiutato';
end;
$$;

-- -----------------------------------------------------------------------------
-- Switch a tenant A (ruolo autenticato + JWT claims, come in produzione)
-- -----------------------------------------------------------------------------
reset role;
set local role authenticated;
-- Come un JWT Supabase reale: sub (tenant) + role.
set local "request.jwt.claims"
  to '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}';

-- (E) Lettura: A vede solo le proprie righe, su ogni tabella.
do $$
declare n integer;
begin
  select count(*) into n from public.agent_schedules;
  if n <> 1 then
    raise exception 'FALLITO: agent_schedules visti=%, attesi 1', n;
  end if;

  select count(*) into n from public.agent_run_steps;
  if n <> 1 then
    raise exception 'FALLITO: agent_run_steps visti=%, attesi 1', n;
  end if;

  select count(*) into n from public.agent_jobs;
  if n <> 1 then
    raise exception 'FALLITO: agent_jobs visti=%, attesi 1', n;
  end if;

  select count(*) into n from public.agent_tasks;
  if n <> 1 then
    raise exception 'FALLITO: agent_tasks visti=%, attesi 1', n;
  end if;

  select count(*) into n from public.agent_approvals;
  if n <> 1 then
    raise exception 'FALLITO: agent_approvals visti=%, attesi 1', n;
  end if;

  select count(*) into n from public.agent_autonomy;
  if n <> 1 then
    raise exception 'FALLITO: agent_autonomy visti=%, attesi 1', n;
  end if;

  select count(*) into n from public.agent_runs;
  if n <> 1 then
    raise exception 'FALLITO: agent_runs legacy visibili=%, attesi 1 (o il run e quello di B!)', n;
  end if;

  raise notice 'PASS: tenant A legge esattamente 1 riga per tabella (nessuna di B)';
end;
$$;

-- (F) Scrittura sulle righe di B: filtrata in silenzio (0 righe) per
--     update e delete, errore 42501 per insert con tenant B.
do $$
declare n integer;
begin
  with u as (
    update public.agent_schedules
    set name = 'compromesso'
    where id = '10000000-0000-4000-8000-000000000002'
    returning 1
  ) select count(*) into n from u;
  if n <> 0 then
    raise exception 'FALLITO: update sullo schedule di B ha toccato % righe', n;
  end if;

  with d as (
    delete from public.agent_approvals
    where id = '50000000-0000-4000-8000-000000000002'
    returning 1
  ) select count(*) into n from d;
  if n <> 0 then
    raise exception 'FALLITO: delete sull''approval di B ha toccato % righe', n;
  end if;

  with u as (
    update public.agent_autonomy
    set livello = 'L3'
    where id = '60000000-0000-4000-8000-000000000002'
    returning 1
  ) select count(*) into n from u;
  if n <> 0 then
    raise exception 'FALLITO: update sull''autonomy di B ha toccato % righe', n;
  end if;

  raise notice 'PASS: update/delete su righe di B toccano 0 righe (RLS le filtra)';
end;
$$;

do $$
begin
  insert into public.agent_schedules
    (tenant_id, agent_slug, name, cron)
  values ('bbbbbbbb-0000-4000-8000-000000000002',
          'shopify-agent', 'spy', '0 0 * * *');
  raise exception 'FALLITO: insert con tenant B riuscita come tenant A';
exception
  when insufficient_privilege then
    raise notice 'PASS: insert con tenant_id diverso da auth.uid() respinta (42501)';
end;
$$;

-- (G) Nessuna policy di insert su job e tasks per gli utenti: la coda e il
--     grafo li scrive solo il worker.
do $$
begin
  insert into public.agent_jobs (run_id, tenant_id, stato)
  values ('20000000-0000-4000-8000-000000000001',
          'aaaaaaaa-0000-4000-8000-000000000001', 'queued');
  raise exception 'FALLITO: utente inserisce agent_jobs';
exception
  when insufficient_privilege then
    raise notice 'PASS: insert su agent_jobs negata agli utenti';
end;
$$;

do $$
begin
  insert into public.agent_tasks
    (run_id, tenant_id, titolo, assegnato_ad)
  values ('20000000-0000-4000-8000-000000000001',
          'aaaaaaaa-0000-4000-8000-000000000001', 'finto', 'shopify-agent');
  raise exception 'FALLITO: utente inserisce agent_tasks';
exception
  when insufficient_privilege then
    raise notice 'PASS: insert su agent_tasks negata agli utenti';
end;
$$;

-- (H) Nessuna policy di update su agent_jobs per gli utenti (solo il worker
--     muove la coda).
do $$
declare n integer;
begin
  with u as (
    update public.agent_jobs
    set stato = 'cancelled'
    where id = '40000000-0000-4000-8000-000000000001'
    returning 1
  ) select count(*) into n from u;
  if n <> 0 then
    raise exception 'FALLITO: utente ha aggiornato agent_jobs (% righe)', n;
  end if;
  raise notice 'PASS: update su agent_jobs negato agli utenti (0 righe)';
end;
$$;

-- (I) Step cross-tenant anche con la sola RLS (insert col tenant di B).
do $$
begin
  insert into public.agent_run_steps
    (run_id, tenant_id, indice, tipo, output)
  values ('20000000-0000-4000-8000-000000000002',
          'bbbbbbbb-0000-4000-8000-000000000002', 9, 'system', 'spy');
  raise exception 'FALLITO: insert di un passo col tenant B riuscita come A';
exception
  when insufficient_privilege then
    raise notice 'PASS: insert passo con tenant B respinta dalla RLS (42501)';
end;
$$;

-- (J) Aggiornamento di un proprio passo: RLS nega (nessuna policy update) —
--     l'immutabilità vale anche per chi non è service_role.
do $$
declare n integer;
begin
  with u as (
    update public.agent_run_steps
    set output = 'cambiato'
    where id = '30000000-0000-4000-8000-000000000001'
    returning 1
  ) select count(*) into n from u;
  if n <> 0 then
    raise exception 'FALLITO: utente ha aggiornato agent_run_steps (% righe)', n;
  end if;
  raise notice 'PASS: update su agent_run_steps negato agli utenti (0 righe)';
end;
$$;

-- (K) Approvazioni: A decide la propria pending, non riesce a riguardarla due
--     volte e non tocca quella di B.
do $$
declare n integer;
begin
  update public.agent_approvals
  set stato = 'approved', decisa_da = 'aaaaaaaa-0000-4000-8000-000000000001',
      decisa_il = now()
  where id = '50000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'FALLITO: decisione su approval propria toccata % righe', n;
  end if;

  update public.agent_approvals
  set stato = 'rejected'
  where id = '50000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FALLITO: seconda decisione su approval gia decisa (% righe)', n;
  end if;

  update public.agent_approvals
  set stato = 'rejected'
  where id = '50000000-0000-4000-8000-000000000002';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FALLITO: decisione sull''approval di B (% righe)', n;
  end if;

  raise notice 'PASS: decisioni approval limitate alle proprie pending';
end;
$$;

-- (L) Autonomy: A puo cambiare livello al proprio agente, non a quello di B.
do $$
declare n integer;
begin
  update public.agent_autonomy
  set livello = 'L3'
  where id = '60000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'FALLITO: cambio livello proprio toccato % righe', n;
  end if;
  raise notice 'PASS: cambio livello autonomy consentito nel proprio tenant';
end;
$$;
-- (M) Compatibilità legacy: la riga chat pre-migrazione (inserita col solo
--     set di colonne di prima) ora porta i valori estesi corretti dopo
--     l'update del worker, senza vincoli che la escludano.
do $$
declare
  r record;
begin
  select trigger, crediti_usati, budget_max_step, budget_max_crediti, status
  into r
  from public.agent_runs
  where id = '20000000-0000-4000-8000-000000000001';

  if r is null then
    raise exception 'FALLITO: run non visibile';
  end if;
  if r.trigger <> 'schedule' or r.crediti_usati <> 0
     or r.budget_max_step <> 20 or r.budget_max_crediti <> 50 then
    raise exception 'FALLITO: colonne estese errate sul run: %', r;
  end if;
  raise notice 'PASS: run pre-migrazione compatibile con le colonne estese';
end;
$$;

-- (N) Il worker non e l'utente: claim_agent_job negato ad authenticated.
do $$
begin
  perform * from public.claim_agent_job('worker-prova', 60);
  raise exception 'FALLITO: claim_agent_job eseguibile da authenticated';
exception
  when insufficient_privilege then
    raise notice 'PASS: claim_agent_job negata agli utenti (solo service_role)';
end;
$$;

-- (O) Fix policy legacy verificato FUNZIONALMENTE: sulle tabelle che avevano
--     la policy "Service role" senza `to service_role`, l'utente A vede solo
--     le proprie righe (prima del fix: vedeva TUTTE, incluse quelle di B).
do $$
declare n integer;
begin
  select count(*) into n from public.tenant_integrations;
  if n <> 1 then
    raise exception 'FALLITO: tenant_integrations viste=% (attesa 1: il fix non regge)', n;
  end if;

  select count(*) into n from public.shopify_connections;
  if n <> 1 then
    raise exception 'FALLITO: shopify_connections viste=% (attesa 1: il fix non regge)', n;
  end if;

  with u as (
    update public.tenant_integrations
    set status = 'disconnected'
    where id = '80000000-0000-4000-8000-000000000002'
    returning 1
  ) select count(*) into n from u;
  if n <> 0 then
    raise exception 'FALLITO: A ha scritto su una connessione di B (% righe)', n;
  end if;

  with d as (
    delete from public.shopify_connections
    where id = '90000000-0000-4000-8000-000000000002'
    returning 1
  ) select count(*) into n from d;
  if n <> 0 then
    raise exception 'FALLITO: A ha cancellato una connessione di B (% righe)', n;
  end if;

  raise notice 'PASS: fix policy legacy — tenant_integrations e shopify_connections isolate per tenant';
end;
$$;

-- -----------------------------------------------------------------------------
-- Di nuovo service_role: la coda atomica funziona davvero
-- -----------------------------------------------------------------------------
reset role;
set local role service_role;

do $$
declare
  v_job public.agent_jobs%rowtype;
begin
  select * into v_job from public.claim_agent_job('worker-test-1', 60);
  if v_job.id is null then
    raise exception 'FALLITO: claim_agent_job non ha restituito nessun job';
  end if;
  if v_job.stato <> 'running' or v_job.tentativi <> 1
     or v_job.locked_by <> 'worker-test-1' then
    raise exception 'FALLITO: job non preso correttamente: stato=% tentativi=% lock=%',
      v_job.stato, v_job.tentativi, v_job.locked_by;
  end if;
  raise notice 'PASS: claim atomico (stato=running, tentativi=1, locked_by impostato)';

  -- Il job e ora "running" col lock attivo: un secondo claim NON deve
  -- poterlo riprendere (lease non scaduto) — esattamente il caso "doppio
  -- worker in parallelo".
  select * into v_job from public.claim_agent_job('worker-test-2', 60);
  if v_job.id is not null and v_job.locked_by = 'worker-test-1' then
    raise exception 'FALLITO: secondo worker ha rubato il job con lock vivo';
  end if;
  raise notice 'PASS: job con lock vivo non rivendicabile da un secondo worker';
end;
$$;

-- Verifica SISTEMICA del fix: nessuna policy "Service role can manage..."
-- del database deve essere aperta ad altri ruoli (è esattamente il difetto
-- delle 8 policy originali).
do $$
declare n integer;
begin
  select count(*) into n
  from pg_policies
  where schemaname = 'public'
    and policyname ilike 'Service role%'
    and coalesce(roles, array['public']::name[]) <> array['service_role']::name[];
  if n <> 0 then
    raise exception 'FALLITO: % policy "Service role" ancora visibili ad altri ruoli', n;
  end if;
  raise notice 'PASS: nessuna policy "Service role" aperta ad anon/authenticated (riflesso su pg_policies)';
end;
$$;

-- Verifica legacy NON toccata: il run B è stato inserito col solo set di
-- colonne pre-migrazione e non ha mai subito update: i default devono aver
-- riempito tutto il necessario lasciando `status` intatto.
do $$
declare
  r record;
begin
  select trigger, crediti_usati, budget_max_step, budget_max_crediti, status
  into r
  from public.agent_runs
  where id = '20000000-0000-4000-8000-000000000002';

  if r is null then
    raise exception 'FALLITO: run legacy non trovato';
  end if;
  if r.trigger <> 'manual' or r.crediti_usati <> 0
     or r.budget_max_step is not null or r.budget_max_crediti is not null
     or r.status <> 'queued' then
    raise exception 'FALLITO: default incoerenti su run legacy non toccato: %', r;
  end if;
  raise notice 'PASS: riga legacy intatta (trigger=manual, budget null, status invariato)';
end;
$$;

-- Rollback: il test non lascia dati.
rollback;

-- === TEST RLS COMPLETATO: tutte le asserzioni PASS, rollback eseguito ===
