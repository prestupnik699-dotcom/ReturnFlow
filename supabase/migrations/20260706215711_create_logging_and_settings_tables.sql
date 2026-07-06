-- ============================================================
-- activity_logs
-- ============================================================
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);

create index activity_logs_organization_id_idx on public.activity_logs(organization_id);
create index activity_logs_store_id_idx on public.activity_logs(store_id);
create index activity_logs_user_id_idx on public.activity_logs(user_id);
create index activity_logs_created_at_idx on public.activity_logs(created_at);

alter table public.activity_logs enable row level security;

-- ============================================================
-- app_settings
-- ============================================================
-- See docs/DECISIONS.md D-008: default_language/theme_color intentionally
-- excluded here, organizations is the source of truth for those.
create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  urgent_days integer not null default 3,
  allow_exports boolean not null default true,
  allow_chat boolean not null default true,
  allow_comments boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;

-- ============================================================
-- export_history
-- ============================================================
create type public.export_type as enum ('pdf', 'excel');

create table public.export_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.export_type not null,
  filters jsonb not null default '{}'::jsonb,
  file_url text,
  created_at timestamptz not null default now()
);

create index export_history_user_id_idx on public.export_history(user_id);

alter table public.export_history enable row level security;

-- ============================================================
-- sync_queue
-- ============================================================
create type public.sync_queue_status as enum ('pending', 'processing', 'completed', 'failed');

create table public.sync_queue (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  operation text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.sync_queue_status not null default 'pending',
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sync_queue_profile_id_idx on public.sync_queue(profile_id);
create index sync_queue_status_idx on public.sync_queue(status);

create trigger set_sync_queue_updated_at
  before update on public.sync_queue
  for each row execute function public.set_updated_at();

alter table public.sync_queue enable row level security;

-- ============================================================
-- audit_logs
-- ============================================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  ip_address text,
  device text,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_user_id_idx on public.audit_logs(user_id);
create index audit_logs_created_at_idx on public.audit_logs(created_at);

alter table public.audit_logs enable row level security;
