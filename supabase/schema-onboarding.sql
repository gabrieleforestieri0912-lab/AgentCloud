alter table public.profiles
  add column if not exists has_seen_chat_onboarding boolean not null default false;

alter table public.profiles
  add column if not exists has_seen_dashboard_onboarding boolean not null default false;
