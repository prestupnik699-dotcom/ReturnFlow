alter table public.profiles
  add column has_seen_onboarding boolean not null default false;
