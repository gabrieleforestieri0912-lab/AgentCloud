-- Allow admin via code (__tenant__) — tenant_id from uuid to text (was FK to auth.users)
-- Admin has no Supabase user, stores connections on shared tenant __tenant__
alter table public.tenant_integrations drop constraint if exists tenant_integrations_tenant_id_fkey;
alter table public.tenant_integrations alter column tenant_id type text using tenant_id::text;

-- RLS must compare as text (auth.uid() is uuid, tenant_id now text including "__tenant__")
drop policy if exists "Users can view own tenant integrations" on public.tenant_integrations;
create policy "Users can view own tenant integrations"
  on public.tenant_integrations for select
  using (auth.uid()::text = tenant_id);

drop policy if exists "Users can insert own tenant integrations" on public.tenant_integrations;
create policy "Users can insert own tenant integrations"
  on public.tenant_integrations for insert
  with check (auth.uid()::text = tenant_id);

drop policy if exists "Users can update own tenant integrations" on public.tenant_integrations;
create policy "Users can update own tenant integrations"
  on public.tenant_integrations for update
  using (auth.uid()::text = tenant_id)
  with check (auth.uid()::text = tenant_id);

drop policy if exists "Users can delete own tenant integrations" on public.tenant_integrations;
create policy "Users can delete own tenant integrations"
  on public.tenant_integrations for delete
  using (auth.uid()::text = tenant_id);
