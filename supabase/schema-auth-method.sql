alter table public.profiles
  add column if not exists auth_method_completed boolean not null default false;
