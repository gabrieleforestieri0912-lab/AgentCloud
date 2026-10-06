-- -----------------------------------------------------------------------------
-- AgentCloud · Batch 2 integrazioni: google_drive, airtable, trello,
-- woocommerce, mailchimp
-- -----------------------------------------------------------------------------
-- Da eseguire DOPO schema-integrations.sql.
-- Idempotente: puoi rieseguirlo quante volte vuoi.
--
-- NOTA: schema-integrations.sql è ora già aggiornato con tutti e 12 i provider,
-- quindi i due file possono essere applicati in QUALSIASI ordine. Questo file
-- resta utile per due motivi: documenta il caso WooCommerce (chiavi per store,
-- cifrate in tenant_integrations e non env) e conserva lo storico del batch.
--
-- Perché originariamente era un file nuovo invece di una modifica a
-- schema-integrations.sql: quel file aveva una `delete ... where provider not in
-- (...)` che cancellava i provider fuori allow-list. Aggiungervi i provider
-- nuovi avrebbe fatto perdere connessioni a ogni sua riesecuzione. La delete è
-- stata rimossa: ora quel file ha solo rimozioni esplicite e nominate, quindi
-- rieseguirlo non distrugge nulla.
--
-- provider supportati (allineati a src/lib/integrations/catalog.ts):
--   notion, slack, hubspot, google_sheets, github, clickup, asana,
--   google_drive, airtable, trello, woocommerce, mailchimp
--
-- WooCommerce: non usa OAuth. Consumer Key/Secret occupano le colonne
-- access_token / refresh_token (cifrate) e l'URL dello store va in
-- metadata.store_url. Nessuna colonna nuova.
--
-- Redirect URI da registrare su ciascun provider:
--   https://www.agentcloud.agency/api/integrations/<provider>/callback
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 1. Allargamento del set provider
-- -----------------------------------------------------------------------------
alter table public.tenant_integrations
  drop constraint if exists tenant_integrations_provider_check;

alter table public.tenant_integrations
  add constraint tenant_integrations_provider_check
  check (provider in (
    'notion','slack','hubspot','google_sheets','github','clickup','asana',
    'google_drive','airtable','trello','woocommerce','mailchimp'
  ));

-- -----------------------------------------------------------------------------
-- 2. Indice per le nuove connectioni (copre tenant + provider come già esiste)
-- -----------------------------------------------------------------------------
-- idx_tenant_integrations_tenant_provider è creato in schema-integrations.sql e
-- copre già (tenant_id, provider): serve per leggere la riga di un provider in
-- una singola query. Non servono indici aggiuntivi.

-- -----------------------------------------------------------------------------
-- 3. Sanity check
-- -----------------------------------------------------------------------------
-- Nessuna riga dei provider nuovi può avere già access_token in chiaro: se il
-- batch viene applicato su un database dove un tentativo precedente aveva
-- scritto plaintext, la cifratura va rifatta. Elenco qui sotto per verifica.
-- select provider, status, count(*)
--   from public.tenant_integrations
--  where provider in ('google_drive','airtable','trello','woocommerce','mailchimp')
--  group by provider, status order by provider;

-- Connessioni legacy senza envelope cifrato (access_token che NON inizia con '{'):
-- select provider, tenant_id from public.tenant_integrations
--  where provider in ('google_drive','airtable','trello','woocommerce','mailchimp')
--    and access_token is not null
--    and left(access_token, 1) <> '{';