-- ============================================================
-- suppliers
-- ============================================================
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  favorite boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  search_vector tsvector generated always as (to_tsvector('simple', coalesce(name, ''))) stored
);

create index suppliers_organization_id_idx on public.suppliers(organization_id);
create index suppliers_search_vector_idx on public.suppliers using gin(search_vector);

create trigger set_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

alter table public.suppliers enable row level security;

-- ============================================================
-- return_items
-- ============================================================
-- See docs/DECISIONS.md D-007: 'deleted' excluded from status, deleted_at is
-- the single source of truth. Archive/Restore go through this same status column.
create type public.return_status as enum ('pending', 'urgent', 'returned', 'archived');
create type public.return_priority as enum ('low', 'normal', 'high', 'critical');

create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  quantity integer not null default 1,
  reason text,
  comment text,
  status public.return_status not null default 'pending',
  priority public.return_priority not null default 'normal',
  returned_by uuid references public.profiles(id) on delete set null,
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(comment, ''))
  ) stored,
  constraint return_items_quantity_positive check (quantity > 0)
);

create index return_items_organization_id_idx on public.return_items(organization_id);
create index return_items_store_id_idx on public.return_items(store_id);
create index return_items_supplier_id_idx on public.return_items(supplier_id);
create index return_items_status_idx on public.return_items(status);
create index return_items_priority_idx on public.return_items(priority);
create index return_items_created_at_idx on public.return_items(created_at);
create index return_items_returned_at_idx on public.return_items(returned_at);
create index return_items_search_vector_idx on public.return_items using gin(search_vector);

create trigger set_return_items_updated_at
  before update on public.return_items
  for each row execute function public.set_updated_at();

alter table public.return_items enable row level security;

-- ============================================================
-- return_images
-- ============================================================
create table public.return_images (
  id uuid primary key default gen_random_uuid(),
  return_item_id uuid not null references public.return_items(id) on delete cascade,
  image_url text not null,
  thumbnail_url text,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index return_images_return_item_id_idx on public.return_images(return_item_id);

alter table public.return_images enable row level security;

-- ============================================================
-- return_comments
-- ============================================================
create table public.return_comments (
  id uuid primary key default gen_random_uuid(),
  return_item_id uuid not null references public.return_items(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  comment text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  search_vector tsvector generated always as (to_tsvector('simple', coalesce(comment, ''))) stored
);

create index return_comments_return_item_id_idx on public.return_comments(return_item_id);
create index return_comments_author_id_idx on public.return_comments(author_id);
create index return_comments_search_vector_idx on public.return_comments using gin(search_vector);

alter table public.return_comments enable row level security;

-- ============================================================
-- return_history
-- ============================================================
create table public.return_history (
  id uuid primary key default gen_random_uuid(),
  return_item_id uuid not null references public.return_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index return_history_return_item_id_idx on public.return_history(return_item_id);
create index return_history_user_id_idx on public.return_history(user_id);

alter table public.return_history enable row level security;
