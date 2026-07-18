-- ============================================================
-- delivery_items policies — mirrors return_items policies exactly:
-- anyone with store access can read; broad set of roles (including
-- Employee) can log a delivery, since receiving is front-line work;
-- edits follow the same "manager roles, or the Employee creator
-- editing their own entry" rule; delete is restricted to
-- Owner/Administrator/StoreManager via the same trigger pattern used
-- for return_items, so a receiving clerk can log deliveries but not
-- erase them after the fact.
-- ============================================================
create policy delivery_items_select on public.delivery_items
  for select
  using (public.has_store_access(organization_id, store_id));

create policy delivery_items_insert on public.delivery_items
  for insert
  with check (
    public.has_store_role(
      organization_id, store_id,
      array['Owner','Administrator','StoreManager','Receiver','Employee']::public.membership_role[]
    )
  );

create policy delivery_items_update on public.delivery_items
  for update
  using (
    public.has_store_role(organization_id, store_id, array['Owner','Administrator','StoreManager','Receiver']::public.membership_role[])
    or (
      public.has_store_role(organization_id, store_id, array['Employee']::public.membership_role[])
      and created_by = public.current_profile_id()
    )
  )
  with check (
    public.has_store_role(organization_id, store_id, array['Owner','Administrator','StoreManager','Receiver']::public.membership_role[])
    or (
      public.has_store_role(organization_id, store_id, array['Employee']::public.membership_role[])
      and created_by = public.current_profile_id()
    )
  );

-- Only Owner/Administrator/StoreManager may soft-delete a delivery entry
-- (same narrowing-at-delete-moment pattern as return_items).
create or replace function public.enforce_delivery_items_delete_permission()
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
      array['Owner','Administrator','StoreManager']::public.membership_role[]
    ) then
      raise exception 'Only Owner, Administrator or StoreManager can delete a delivery item';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_delivery_items_delete
  before update on public.delivery_items
  for each row execute function public.enforce_delivery_items_delete_permission();
