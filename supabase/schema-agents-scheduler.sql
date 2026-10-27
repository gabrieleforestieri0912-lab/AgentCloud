-- =============================================================================
-- Fase 3 — Scheduler: pg_cron + pg_net invocano il worker ogni minuto (D2)
--
-- La produzione gira su Vercel, ma il canale di schedulazione è SUPABASE:
-- pg_cron scatta ogni minuto e pg_net chiama l'endpoint worker
-- (/api/agents/worker) che:
--   1. avanza gli agent_schedules dovuti e crea run + job (scanSchedules);
--   2. consuma la coda agent_jobs con SKIP LOCKED (Fase 2).
--
-- Invocare l'endpoint del Next server invece di fare lo scan in SQL serve a
-- NON duplicare la logica TS (validazione istruzioni, budget, creazione dei
-- run legali, ecc.): Postgres resta solo il cron, l'app resta il motore.
--
-- PREREQUISITI (una volta sola, dashboard Supabase → Extensions):
--   • pg_cron  → anche "enable extension" (schema cron)
--   • pg_net   → anche "enable extension" (schema net)
-- SEGRETO:
--   1. SQL Editor: select vault.create_secret('<CRON_SECRET>', 'AGENTS_WORKER_CRON_SECRET');
--      con LO STESSO valore di CRON_SECRET nei secret/Vercel del deploy Next.
--   2. Da qui in poi il job legge il secret dal Vault: mai in chiaro in una
--      tabella, mai in un log.
-- =============================================================================

-- Nota di idempotenza: la schedule si re-istanzia con unschedule se esiste,
-- così la schedulazione è aggiornabile eseguendo il file come gli altri
-- schema-*.sql (rieseguibile senza duplicati).

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron non abilitato: scheduler NON installato (abilitare pg_cron e rieseguire)';
    return;
  end if;
end
$$;

-- 1. Rimuove l'istanza precedente (idempotenza).
do $$
declare
  v_jobid bigint;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    return;
  end if;
  -- Come identificatore: cercare lo schedule per jobname (estensione cron).
  -- `cron.unschedule` fa da adattatore: fallito → nessun problema (già assente).
  begin
    for v_jobid in select jobid from cron.job where jobname = 'agentcloud-agents-worker' loop
      perform cron.unschedule(v_jobid);
    end loop;
  exception when others then
    raise notice 'cron.unschedule non disponibile: %', sqlerrm;
  end;
end;
$$;

-- 2. Re-istanza del job ogni minuto.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    return;
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise notice 'pg_net non abilitato: scheduler NON installato (abilitare pg_net e rieseguire)';
    return;
  end if;

  -- Il target host NON hard-coded nel file: si legge da setting locale —
  -- alter database current database set app.site_url = 'https://…'
  -- Vedasi sotto: il job legge current_setting('app.site_url', true);
  -- se assente, usa il default prod (www.agentcloud.agency).
  perform cron.schedule(
    'agentcloud-agents-worker',
    '* * * * *',
    $job$
    select net.http_post(
      url := coalesce(nullif(current_setting('app.site_url', true), ''), 'https://www.agentcloud.agency')
              || '/api/agents/worker?maxJobs=3',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || coalesce(
          vault.get_secret('AGENTS_WORKER_CRON_SECRET'),
          current_setting('app.cron_secret', true)
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 25_000
    );
    $job$
  );
end;
$$;
