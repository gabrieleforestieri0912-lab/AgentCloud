-- -----------------------------------------------------------------------------
-- AgentCloud · Setup guidato post-login (onboarding) — colonne su profiles
-- -----------------------------------------------------------------------------
-- Il nuovo utente che entra la prima volta incontra /onboarding: 8 schermate
-- che chiedono nome, occupazione, ruolo, cosa vuole delegare, quali tool usa,
-- tono, lingua e agente predefinito. Le risposte vivono in profiles:
--
--   onboarding_completed_at → quando ha finito (o "skip"); NULL = mai finito
--   onboarding_skipped      → ha usato "Preferisco scoprire da solo"
--   onboarding_step         → dove era rimasto (riprende da lì)
--   onboarding_decided      → true quando onboarding proposto E concluso
--                             (completato o saltato). Il guard della proxy
--                             reindirizza a /onboarding i profili con false;
--                             la backfill qui sotto marca i profili GIA'
--                             esistenti come decisi: nessun utente attuale
--                             viene bloccato, gli arriva solo l'invito
--                             dismissibile in dashboard.
--   onboarding (jsonb)      → le risposte vere: displayName, occupation,
--                             role, studyLevel, studyArea, goals[], tools[],
--                             tone, language, defaultAgentSlug, occupationOther
--
-- L'agente predefinito vive ANCHE in user_preferences (chiave
-- `agentcloud_chat_default_agent`) perché è quella che la chat legge: qui è
-- copia di comodo per l'export GDPR e per le raccomandazioni future.
-- I dati mostrati all'utente in chat (display name, tono, lingua) leggono il
-- JSONB via API: nessun trigger né viste.
--
-- RLS: le policy "Users can view/update/insert own profile" già coprono
-- queste colonne (stesso file, nessuna policy nuova serve).
-- -----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_skipped boolean,
  add column if not exists onboarding_step integer not null default 0,
  add column if not exists onboarding_decided boolean not null default false,
  add column if not exists onboarding jsonb not null default '{}'::jsonb;

-- Utenti pre-esistenti: l'onboarding NON viene proposto a sbaf (guard disattivo
-- e in dashboard compare solo l'invito soft se non l'hanno mai fatto).
update public.profiles set onboarding_decided = true where onboarding_decided = false;
