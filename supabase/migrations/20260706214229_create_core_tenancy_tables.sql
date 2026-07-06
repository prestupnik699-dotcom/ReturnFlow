-- Reusable trigger function: keeps updated_at current on every UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- organizations
-- ============================================================
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  primary_color text,
  country text,
  default_language text not null default 'ka',
  timezone text not null default 'Asia/Tbilisi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger set_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;

-- ============================================================
-- stores
-- ============================================================
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  city text,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index stores_organization_id_idx on public.stores(organization_id);

create trigger set_stores_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

alter table public.stores enable row level security;

-- ============================================================
-- profiles
-- ============================================================
-- See docs/DECISIONS.md D-015: 'deleted' intentionally excluded, deleted_at is
-- the single source of truth for deletion.
create type public.profile_status as enum ('active', 'vacation', 'blocked');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  photo_url text,
  phone text,
  language text not null default 'ka',
  theme text not null default 'system',
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- ============================================================
-- memberships
-- ============================================================
-- See docs/DECISIONS.md D-016: store_id nullable, NULL = org-wide access.
create type public.membership_role as enum (
  'Owner', 'Administrator', 'StoreManager', 'Receiver', 'Employee', 'Viewer'
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index memberships_profile_id_idx on public.memberships(profile_id);
create index memberships_organization_id_idx on public.memberships(organization_id);
create index memberships_store_id_idx on public.memberships(store_id);

-- Prevent duplicate memberships: one row per (profile, org) when org-wide,
-- one row per (profile, org, store) when store-scoped.
create unique index memberships_org_wide_uidx
  on public.memberships(profile_id, organization_id)
  where store_id is null;

create unique index memberships_store_scoped_uidx
  on public.memberships(profile_id, organization_id, store_id)
  where store_id is not null;

create trigger set_memberships_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

alter table public.memberships enable row level security;
