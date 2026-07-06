-- ============================================================
-- suppliers policies
-- ============================================================
create policy suppliers_select on public.suppliers
  for select
  using (public.has_org_access(organization_id));

create policy suppliers_insert on public.suppliers
  for insert
  with check (
    public.has_role(organization_id, array['Owner','Administrator','StoreManager','Receiver']::public.membership_role[])
  );

create policy suppliers_update on public.suppliers
  for update
  using (
    public.has_role(organization_id, array['Owner','Administrator','StoreManager','Receiver']::public.membership_role[])
  )
  with check (
    public.has_role(organization_id, array['Owner','Administrator','StoreManager','Receiver']::public.membership_role[])
  );

-- ============================================================
-- return_items policies
-- ============================================================
create policy return_items_select on public.return_items
  for select
  using (public.has_store_access(organization_id, store_id));

create policy return_items_insert on public.return_items
  for insert
  with check (
    public.has_store_role(
      organization_id, store_id,
      array['Owner','Administrator','StoreManager','Receiver','Employee']::public.membership_role[]
    )
  );

create policy return_items_update on public.return_items
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

-- Only Owner/Administrator/StoreManager may soft-delete a return
-- (regular edits above allow more roles; this trigger narrows just the delete moment)
create or replace function public.enforce_return_items_delete_permission()
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
      raise exception 'Only Owner, Administrator or StoreManager can delete a return item';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_return_items_delete
  before update on public.return_items
  for each row execute function public.enforce_return_items_delete_permission();

-- ============================================================
-- return_images policies (no organization_id/store_id column here,
-- so we check access through the parent return_items row)
-- ============================================================
create policy return_images_select on public.return_images
  for select
  using (
    exists (
      select 1 from public.return_items ri
      where ri.id = return_images.return_item_id
        and public.has_store_access(ri.organization_id, ri.store_id)
    )
  );

create policy return_images_insert on public.return_images
  for insert
  with check (
    exists (
      select 1 from public.return_items ri
      where ri.id = return_images.return_item_id
        and public.has_store_role(
          ri.organization_id, ri.store_id,
          array['Owner','Administrator','StoreManager','Receiver','Employee']::public.membership_role[]
        )
    )
  );

create policy return_images_delete on public.return_images
  for delete
  using (
    uploaded_by = public.current_profile_id()
    or exists (
      select 1 from public.return_items ri
      where ri.id = return_images.return_item_id
        and public.has_store_role(ri.organization_id, ri.store_id, array['Owner','Administrator','StoreManager']::public.membership_role[])
    )
  );

-- ============================================================
-- return_comments policies
-- ============================================================
create policy return_comments_select on public.return_comments
  for select
  using (
    exists (
      select 1 from public.return_items ri
      where ri.id = return_comments.return_item_id
        and public.has_store_access(ri.organization_id, ri.store_id)
    )
  );

create policy return_comments_insert on public.return_comments
  for insert
  with check (
    author_id = public.current_profile_id()
    and exists (
      select 1 from public.return_items ri
      where ri.id = return_comments.return_item_id
        and public.has_store_role(
          ri.organization_id, ri.store_id,
          array['Owner','Administrator','StoreManager','Receiver','Employee']::public.membership_role[]
        )
    )
  );

create policy return_comments_update on public.return_comments
  for update
  using (
    author_id = public.current_profile_id()
    or exists (
      select 1 from public.return_items ri
      where ri.id = return_comments.return_item_id
        and public.has_store_role(ri.organization_id, ri.store_id, array['Owner','Administrator','StoreManager']::public.membership_role[])
    )
  )
  with check (
    author_id = public.current_profile_id()
    or exists (
      select 1 from public.return_items ri
      where ri.id = return_comments.return_item_id
        and public.has_store_role(ri.organization_id, ri.store_id, array['Owner','Administrator','StoreManager']::public.membership_role[])
    )
  );

-- ============================================================
-- return_history policies (append-only audit trail: no update/delete policy)
-- ============================================================
create policy return_history_select on public.return_history
  for select
  using (
    exists (
      select 1 from public.return_items ri
      where ri.id = return_history.return_item_id
        and public.has_store_access(ri.organization_id, ri.store_id)
    )
  );

create policy return_history_insert on public.return_history
  for insert
  with check (
    user_id = public.current_profile_id()
    and exists (
      select 1 from public.return_items ri
      where ri.id = return_history.return_item_id
        and public.has_store_role(
          ri.organization_id, ri.store_id,
          array['Owner','Administrator','StoreManager','Receiver','Employee']::public.membership_role[]
        )
    )
  );
