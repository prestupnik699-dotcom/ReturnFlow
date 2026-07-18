-- ============================================================
-- delivery_items — receiving log. Mirrors return_items structurally
-- (same tenancy columns, same soft-delete-via-deleted_at convention),
-- but deliberately simpler: no status/priority/history/comments, since
-- a receiving entry isn't a workflow item with a lifecycle — it's a
-- log entry of what physically arrived. A "delivery" (one truck / one
-- invoice from a supplier) is represented implicitly by several
-- delivery_items sharing the same supplier_id + store_id + created_at
-- minute, the same flat pattern already used by the batch-return flow
-- (useCreateReturnsBatch) rather than a separate header table.
-- ============================================================
create table public.delivery_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  quantity integer not null default 1,
  barcode text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  search_vector tsvector generated always as (to_tsvector('simple', coalesce(title, ''))) stored,
  constraint delivery_items_quantity_positive check (quantity > 0)
);

create index delivery_items_organization_id_idx on public.delivery_items(organization_id);
create index delivery_items_store_id_idx on public.delivery_items(store_id);
create index delivery_items_supplier_id_idx on public.delivery_items(supplier_id);
create index delivery_items_created_at_idx on public.delivery_items(created_at);
create index delivery_items_search_vector_idx on public.delivery_items using gin(search_vector);

create trigger set_delivery_items_updated_at
  before update on public.delivery_items
  for each row execute function public.set_updated_at();

alter table public.delivery_items enable row level security;
