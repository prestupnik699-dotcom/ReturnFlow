create table public.barcode_shortcuts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  store_id uuid not null references public.stores(id),
  barcode text not null,
  supplier_id uuid not null references public.suppliers(id),
  title text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, barcode)
);

create index barcode_shortcuts_lookup_idx on public.barcode_shortcuts (store_id, barcode);

alter table public.barcode_shortcuts enable row level security;

create policy barcode_shortcuts_select on public.barcode_shortcuts
  for select
  using (public.has_store_access(organization_id, store_id));

create policy barcode_shortcuts_insert on public.barcode_shortcuts
  for insert
  with check (
    public.has_store_role(
      organization_id, store_id,
      array['Owner','Administrator','StoreManager','Receiver']::public.membership_role[]
    )
  );

create policy barcode_shortcuts_update on public.barcode_shortcuts
  for update
  using (
    public.has_store_role(
      organization_id, store_id,
      array['Owner','Administrator','StoreManager','Receiver']::public.membership_role[]
    )
  );
