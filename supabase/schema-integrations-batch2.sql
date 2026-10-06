-- -----------------------------------------------------------------------------
-- AgentCloud · Batch 2 integrazioni: google_drive, airtable, trello,
-- woocommerce, mailchimp
-- -----------------------------------------------------------------------------
-- Da eseguire DOPO schema-integrations.sql.
-- Idempotente: puoi rieseguirlo quante volte vuoi.
--
-- Perché un file nuovo invece di modificare schema-integrations.sql:
-- quel file contiene una `delete ... where provider not in (...)` che cancella
-- le righe dei provider non ancora nel suo allow-list. Se i 5 provider nuovi
-- fossero aggiunti lì, ogni sua riesecuzione prima che il batch fosse
-- applicato avrebbe cancellato le connessioni degli utenti. Qui si allarga
-- solo il vincolo, senza toccare dati.
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