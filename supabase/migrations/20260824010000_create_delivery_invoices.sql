-- ============================================================
-- delivery_invoices — a standalone journal of received invoices
-- (paper "журнал приёмки" replacement). Deliberately NOT linked
-- row-by-row to delivery_items: this table records the invoice
-- document itself (its number, the distributor, totals, page/item
-- counts, and whether it carries both signatures) for bookkeeping
-- purposes, not a breakdown of which specific delivery_items rows
-- came from which invoice. Linking those would force a rigid
-- item-then-invoice entry order for no benefit to the stated use
-- case (auditing/counting invoices), so this follows the same
-- "simple log entry" philosophy as delivery_items itself.
--
-- Role/policy pattern mirrors delivery_items exactly (see
-- 20260718120100_create_rls_delivery_policies.sql and the role
-- narrowing in 20260722120000_simplify_membership_roles.sql):
-- any store member can read/create (receiving is everyday clerk
-- work), Employee can edit only their own entry, only
-- Owner/StoreManager can delete.
-- ============================================================
create table public.delivery_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  invoice_number text not null,
  distributor_name text not null,
  received_at timestamptz not null default now(),
  total_amount numeric(12, 2),
  page_count integer,
  item_count integer,
  has_signature boolean not null default false,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index delivery_invoices_organization_id_idx on public.delivery_invoices(organization_id);
create index delivery_invoices_store_id_idx on public.delivery_invoices(store_id);
create index delivery_invoices_supplier_id_idx on public.delivery_invoices(supplier_id);
create index delivery_invoices_received_at_idx on public.delivery_invoices(received_at);

create trigger set_delivery_invoices_updated_at
  before update on public.delivery_invoices
  for each row execute function public.set_updated_at();

alter table public.delivery_invoices enable row level security;

create policy delivery_invoices_select on public.delivery_invoices
  for select
  using (public.has_store_access(organization_id, store_id));

create policy delivery_invoices_insert on public.delivery_invoices
  for insert
  with check (
    public.has_store_role(
      organization_id, store_id,
      array['Owner','StoreManager','Employee']::public.membership_role[]
    )
  );

create policy delivery_invoices_update on public.delivery_invoices
  for update
  using (
    public.has_store_role(organization_id, store_id, array['Owner','StoreManager']::public.membership_role[])
    or (
      public.has_store_role(organization_id, store_id, array['Employee']::public.membership_role[])
      and created_by = public.current_profile_id()
    )
  )
  with check (
    public.has_store_role(organization_id, store_id, array['Owner','StoreManager']::public.membership_role[])
    or (
      public.has_store_role(organization_id, store_id, array['Employee']::public.membership_role[])
      and created_by = public.current_profile_id()
    )
  );

-- Only Owner/StoreManager may soft-delete an invoice entry, same
-- narrowing-at-delete-moment pattern used for delivery_items and
-- return_items.
create or replace function public.enforce_delivery_invoices_delete_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    if not public.has_store_role(
      new.organization_id,
      new.store_id,
      array['Owner','StoreManager']::public.membership_role[]
    ) then
      raise exception 'Only Owner or StoreManager can delete a delivery invoice';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_delivery_invoices_delete
  before update on public.delivery_invoices
  for each row execute function public.enforce_delivery_invoices_delete_permission();
