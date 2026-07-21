-- ============================================================
-- Simplify membership_role from 6 roles to 3: Owner, StoreManager, Employee
--
-- Mapping applied to existing data:
--   Administrator -> StoreManager
--   Receiver      -> Employee
--   Viewer        -> Employee
--   Owner, StoreManager, Employee -> unchanged
--
-- Permission model after this migration:
--   Owner        - full control: organization, stores, members, moderation
--   StoreManager - manages their own store: edit store, invite Employees,
--                  create chat rooms, delete returns/deliveries in their store
--   Employee     - day-to-day work: create/edit returns, deliveries,
--                  suppliers, chat messages (cannot delete/manage members)
-- ============================================================

-- 1. New enum type with the reduced role set
create type public.membership_role_v2 as enum ('Owner', 'StoreManager', 'Employee');

-- 2. Drop has_role/has_store_role WITH CASCADE first — this drops every
-- policy across the app that references them (which is also every policy
-- that references the bare "role" column directly, since those all mix
-- role-column checks with has_role/has_store_role calls in the same
-- expression). This must happen BEFORE the column type change below,
-- since Postgres refuses to alter a column's type while any policy still
-- depends on it.
drop function if exists public.has_role(uuid, public.membership_role[]) cascade;
drop function if exists public.has_store_role(uuid, uuid, public.membership_role[]) cascade;

-- 3. Now safe to migrate existing data on both tables that use the role
alter table public.memberships
  alter column role type public.membership_role_v2
  using (
    case role::text
      when 'Administrator' then 'StoreManager'
      when 'Receiver' then 'Employee'
      when 'Viewer' then 'Employee'
      else role::text
    end
  )::public.membership_role_v2;

alter table public.invitations
  alter column role type public.membership_role_v2
  using (
    case role::text
      when 'Administrator' then 'StoreManager'
      when 'Receiver' then 'Employee'
      when 'Viewer' then 'Employee'
      else role::text
    end
  )::public.membership_role_v2;

-- 4. Old type is now unused (columns migrated, functions dropped) — drop it
-- and rename the new type into its place.
drop type public.membership_role;
alter type public.membership_role_v2 rename to membership_role;

-- ============================================================
-- 5. Recreate has_role / has_store_role against the new type
-- ============================================================
create or replace function public.has_role(target_org_id uuid, allowed_roles public.membership_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
    join public.profiles p on p.id = m.profile_id
    where m.profile_id = public.current_profile_id()
      and m.organization_id = target_org_id
      and m.deleted_at is null
      and o.deleted_at is null
      and p.status != 'blocked'
      and m.role = any(allowed_roles)
  );
$$;

create or replace function public.has_store_role(target_org_id uuid, target_store_id uuid, allowed_roles public.membership_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
    join public.profiles p on p.id = m.profile_id
    where m.profile_id = public.current_profile_id()
      and m.organization_id = target_org_id
      and m.deleted_at is null
      and o.deleted_at is null
      and p.status != 'blocked'
      and (m.store_id is null or m.store_id = target_store_id)
      and m.role = any(allowed_roles)
  );
$$;

-- ============================================================
-- 6. organizations / stores / app_settings / activity_logs
-- ============================================================
create policy organizations_update on public.organizations
  for update
  using (public.has_role(id, array['Owner']::public.membership_role[]))
  with check (public.has_role(id, array['Owner']::public.membership_role[]));

create policy stores_insert on public.stores
  for insert
  with check (public.has_role(organization_id, array['Owner']::public.membership_role[]));

create policy stores_update on public.stores
  for update
  using (
    public.has_role(organization_id, array['Owner']::public.membership_role[])
    or public.has_store_role(organization_id, id, array['StoreManager']::public.membership_role[])
  )
  with check (
    public.has_role(organization_id, array['Owner']::public.membership_role[])
    or public.has_store_role(organization_id, id, array['StoreManager']::public.membership_role[])
  );

create policy app_settings_update on public.app_settings
  for update
  using (public.has_role(organization_id, array['Owner']::public.membership_role[]))
  with check (public.has_role(organization_id, array['Owner']::public.membership_role[]));

create policy activity_logs_select on public.activity_logs
  for select
  using (
    public.has_role(organization_id, array['Owner']::public.membership_role[])
    or (store_id is not null and public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[]))
  );

-- ============================================================
-- 7. memberships / invitations
-- ============================================================
create policy memberships_insert on public.memberships
  for insert
  with check (
    public.has_role(organization_id, array['Owner']::public.membership_role[])
    or (
      public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[])
      and role = 'Employee'
    )
    or (
      role = 'Owner'
      and profile_id = public.current_profile_id()
      and not exists (
        select 1 from public.memberships m
        where m.organization_id = memberships.organization_id
      )
    )
  );

create policy memberships_update on public.memberships
  for update
  using (
    public.has_role(organization_id, array['Owner']::public.membership_role[])
    or (
      public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[])
      and role = 'Employee'
    )
  )
  with check (
    public.has_role(organization_id, array['Owner']::public.membership_role[])
    or (
      public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[])
      and role = 'Employee'
    )
  );

create policy invitations_insert on public.invitations
  for insert
  with check (
    invited_by = public.current_profile_id()
    and (
      public.has_role(organization_id, array['Owner']::public.membership_role[])
      or (
        public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[])
        and role = 'Employee'
      )
    )
  );

create policy invitations_update on public.invitations
  for update
  using (
    public.has_role(organization_id, array['Owner']::public.membership_role[])
    or public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[])
  )
  with check (
    public.has_role(organization_id, array['Owner']::public.membership_role[])
    or public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[])
  );

-- ============================================================
-- 8. set_member_status: Owner-only (StoreManager can no longer change status)
-- ============================================================
create or replace function public.set_member_status(target_membership_id uuid, new_status public.profile_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_membership public.memberships;
begin
  select * into target_membership from public.memberships where id = target_membership_id;

  if target_membership.id is null then
    raise exception 'Membership not found';
  end if;

  if not public.has_role(target_membership.organization_id, array['Owner']::public.membership_role[]) then
    raise exception 'Only Owner can change a member''s status';
  end if;

  update public.profiles
  set status = new_status
  where id = target_membership.profile_id;
end;
$$;

grant execute on function public.set_member_status(uuid, public.profile_status) to authenticated;

-- ============================================================
-- 9. suppliers
-- ============================================================
create policy suppliers_insert on public.suppliers
  for insert
  with check (
    public.has_role(organization_id, array['Owner','StoreManager','Employee']::public.membership_role[])
  );

create policy suppliers_update on public.suppliers
  for update
  using (
    public.has_role(organization_id, array['Owner','StoreManager','Employee']::public.membership_role[])
  )
  with check (
    public.has_role(organization_id, array['Owner','StoreManager','Employee']::public.membership_role[])
  );

-- ============================================================
-- 10. return_items (delete trigger function only — trigger itself
-- already exists from an earlier migration and doesn't need recreating)
-- ============================================================
create policy return_items_insert on public.return_items
  for insert
  with check (
    public.has_store_role(
      organization_id, store_id,
      array['Owner','StoreManager','Employee']::public.membership_role[]
    )
  );

create policy return_items_update on public.return_items
  for update
  using (
    public.has_store_role(organization_id, store_id, array['Owner','StoreManager','Employee']::public.membership_role[])
  )
  with check (
    public.has_store_role(organization_id, store_id, array['Owner','StoreManager','Employee']::public.membership_role[])
  );

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
      array['Owner','StoreManager']::public.membership_role[]
    ) then
      raise exception 'Only Owner or StoreManager can delete a return item';
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================
-- 11. return_images / return_comments / return_history
-- ============================================================
create policy return_images_insert on public.return_images
  for insert
  with check (
    exists (
      select 1 from public.return_items ri
      where ri.id = return_images.return_item_id
        and public.has_store_role(
          ri.organization_id, ri.store_id,
          array['Owner','StoreManager','Employee']::public.membership_role[]
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
        and public.has_store_role(ri.organization_id, ri.store_id, array['Owner','StoreManager']::public.membership_role[])
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
          array['Owner','StoreManager','Employee']::public.membership_role[]
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
        and public.has_store_role(ri.organization_id, ri.store_id, array['Owner','StoreManager']::public.membership_role[])
    )
  )
  with check (
    author_id = public.current_profile_id()
    or exists (
      select 1 from public.return_items ri
      where ri.id = return_comments.return_item_id
        and public.has_store_role(ri.organization_id, ri.store_id, array['Owner','StoreManager']::public.membership_role[])
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
          array['Owner','StoreManager','Employee']::public.membership_role[]
        )
    )
  );

-- ============================================================
-- 12. chat_rooms / chat_messages / announcements
-- ============================================================
create policy chat_rooms_insert on public.chat_rooms
  for insert
  with check (
    public.has_role(organization_id, array['Owner','StoreManager']::public.membership_role[])
  );

create policy chat_messages_insert on public.chat_messages
  for insert
  with check (
    author_id = public.current_profile_id()
    and exists (
      select 1 from public.chat_rooms cr
      where cr.id = chat_messages.room_id
        and (
          (cr.store_id is null and public.has_role(cr.organization_id, array['Owner','StoreManager','Employee']::public.membership_role[]))
          or (cr.store_id is not null and public.has_store_role(cr.organization_id, cr.store_id, array['Owner','StoreManager','Employee']::public.membership_role[]))
        )
    )
  );

create policy chat_messages_delete on public.chat_messages
  for update
  using (
    author_id = public.current_profile_id()
    or exists (
      select 1 from public.chat_rooms cr
      where cr.id = chat_messages.room_id
        and public.has_role(cr.organization_id, array['Owner']::public.membership_role[])
    )
  )
  with check (
    author_id = public.current_profile_id()
    or exists (
      select 1 from public.chat_rooms cr
      where cr.id = chat_messages.room_id
        and public.has_role(cr.organization_id, array['Owner']::public.membership_role[])
    )
  );

create policy announcements_insert on public.announcements
  for insert
  with check (
    author_id = public.current_profile_id()
    and (
      (store_id is null and public.has_role(organization_id, array['Owner']::public.membership_role[]))
      or (store_id is not null and public.has_store_role(organization_id, store_id, array['Owner','StoreManager']::public.membership_role[]))
    )
  );

create policy announcements_update on public.announcements
  for update
  using (
    author_id = public.current_profile_id()
    or public.has_role(organization_id, array['Owner']::public.membership_role[])
  )
  with check (
    author_id = public.current_profile_id()
    or public.has_role(organization_id, array['Owner']::public.membership_role[])
  );

-- ============================================================
-- 13. storage (returns bucket)
-- ============================================================
create policy returns_storage_insert on storage.objects
  for insert
  with check (
    bucket_id = 'returns'
    and exists (
      select 1 from public.return_items ri
      where ri.id::text = (storage.foldername(name))[1]
        and public.has_store_role(
          ri.organization_id, ri.store_id,
          array['Owner','StoreManager','Employee']::public.membership_role[]
        )
    )
  );

create policy returns_storage_delete on storage.objects
  for delete
  using (
    bucket_id = 'returns'
    and (
      owner = auth.uid()
      or exists (
        select 1 from public.return_items ri
        where ri.id::text = (storage.foldername(name))[1]
          and public.has_store_role(ri.organization_id, ri.store_id, array['Owner','StoreManager']::public.membership_role[])
      )
    )
  );

-- ============================================================
-- 14. barcode_shortcuts
-- ============================================================
create policy barcode_shortcuts_insert on public.barcode_shortcuts
  for insert
  with check (
    public.has_store_role(
      organization_id, store_id,
      array['Owner','StoreManager','Employee']::public.membership_role[]
    )
  );

create policy barcode_shortcuts_update on public.barcode_shortcuts
  for update
  using (
    public.has_store_role(
      organization_id, store_id,
      array['Owner','StoreManager','Employee']::public.membership_role[]
    )
  );

-- ============================================================
-- 15. delivery_items (delete trigger function only — trigger itself
-- already exists from an earlier migration and doesn't need recreating)
-- ============================================================
create policy delivery_items_insert on public.delivery_items
  for insert
  with check (
    public.has_store_role(
      organization_id, store_id,
      array['Owner','StoreManager','Employee']::public.membership_role[]
    )
  );

create policy delivery_items_update on public.delivery_items
  for update
  using (
    public.has_store_role(organization_id, store_id, array['Owner','StoreManager','Employee']::public.membership_role[])
  )
  with check (
    public.has_store_role(organization_id, store_id, array['Owner','StoreManager','Employee']::public.membership_role[])
  );

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
      array['Owner','StoreManager']::public.membership_role[]
    ) then
      raise exception 'Only Owner or StoreManager can delete a delivery item';
    end if;
  end if;
  return new;
end;
$$;
