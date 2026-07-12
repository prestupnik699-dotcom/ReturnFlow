create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  token text not null unique,
  device_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

create policy push_tokens_select_own on public.push_tokens
  for select using (profile_id = public.current_profile_id());

create policy push_tokens_insert_own on public.push_tokens
  for insert with check (profile_id = public.current_profile_id());

create policy push_tokens_update_own on public.push_tokens
  for update using (profile_id = public.current_profile_id());

create policy push_tokens_delete_own on public.push_tokens
  for delete using (profile_id = public.current_profile_id());
