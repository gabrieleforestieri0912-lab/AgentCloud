-- -----------------------------------------------------------------------------
-- AgentCloud · Integrazione Google Forms (provider `google_forms`)
-- -----------------------------------------------------------------------------
-- Allarga il vincolo sui provider per la connessione Google Forms
-- (stesso OAuth client Google di Drive/Sheets/Docs, riga tenant_integrations
-- dedicata con scope forms.body + forms.responses.readonly + drive.file).
--
-- Deve restare allineato a IMPLEMENTED_PROVIDERS in
-- src/lib/integrations/catalog.ts.
--
-- Script idempotente: nessuna delete, nessuna perdita di connessioni.
-- Applicare le migration integrations in ordine (outlook, docs, forms,
-- analytics, mailchimp): ognuna è cumulativa.
-- -----------------------------------------------------------------------------
alter table public.tenant_integrations
  drop constraint if exists tenant_integrations_provider_check;

alter table public.tenant_integrations
  add constraint tenant_integrations_provider_check
  check (provider in (
    'notion','slack','hubspot','google_sheets','github','clickup','asana',
    'google_drive','airtable','trello','woocommerce','mailchimp','microsoft',
    'microsoft_outlook','google_docs','google_forms'
  ));
