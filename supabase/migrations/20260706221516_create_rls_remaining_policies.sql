-- ============================================================
-- chat_rooms policies
-- ============================================================
create policy chat_rooms_select on public.chat_rooms
  for select
  using (
    (store_id is null and public.has_org_access(organization_id))
    or (store_id is not null and public.has_store_access(organization_id, store_id))
  );

create policy chat_rooms_insert on public.chat_rooms
  for insert
  with check (
    public.has_role(organization_id, array['Owner','Administrator','StoreManager']::public.membership_role[])
  );

-- ============================================================
-- chat_messages policies
-- ============================================================
create policy chat_messages_select on public.chat_messages
  for select
  using (
    exists (
      select 1 from public.chat_rooms cr
      where cr.id = chat_messages.room_id
        and (
          (cr.store_id is null and public.has_org_access(cr.organization_id))
          or (cr.store_id is not null and public.has_store_access(cr.organization_id, cr.store_id))
        )
    )
  );

create policy chat_messages_insert on public.chat_messages
  for insert
  with check (
    author_id = public.current_profile_id()
    and exists (
      select 1 from public.chat_rooms cr
      where cr.id = chat_messages.room_id
        and (
          (cr.store_id is null and public.has_role(cr.organization_id, array['Owner','Administrator','StoreManager','Receiver','Employee']::public.membership_role[]))
          or (cr.store_id is not null and public.has_store_role(cr.organization_id, cr.store_id, array['Owner','Administrator','StoreManager','Receiver','Employee']::public.membership_role[]))
        )
    )
  );

create policy chat_messages_update_own on public.chat_messages
  for update
  using (author_id = public.current_profile_id())
  with check (author_id = public.current_profile_id());

-- ============================================================
-- announcements policies
-- ============================================================
create policy announcements_select on public.announcements
  for select
  using (
    (store_id is null and public.has_org_access(organization_id))
    or (store_id is not null and public.has_store_access(organization_id, store_id))
  );

create policy announcements_insert on public.announcements
  for insert
  with check (
    author_id = public.current_profile_id()
    and (
      (store_id is null and public.has_role(organization_id, array['Owner','Administrator']::public.membership_role[]))
      or (store_id is not null and public.has_store_role(organization_id, store_id, array['Owner','Administrator','StoreManager']::public.membership_role[]))
    )
  );

create policy announcements_update on public.announcements
  for update
  using (
    author_id = public.current_profile_id()
    or public.has_role(organization_id, array['Owner','Administrator']::public.membership_role[])
  )
  with check (
    author_id = public.current_profile_id()
    or public.has_role(organization_id, array['Owner','Administrator']::public.membership_role[])
  );

-- ============================================================
-- notifications policies (system-generated via Edge Functions; no client insert)
-- ============================================================
create policy notifications_select_own on public.notifications
  for select
  using (profile_id = public.current_profile_id());

create policy notifications_update_own on public.notifications
  for update
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

-- ============================================================
-- app_settings: auto-create default settings row for every new organization
-- ============================================================
create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_settings (organization_id) values (new.id);
  return new;
end;
$$;

create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.handle_new_organization();

create policy app_settings_select on public.app_settings
  for select
  using (public.has_org_access(organization_id));

create policy app_settings_update on public.app_settings
  for update
  using (public.has_role(organization_id, array['Owner','Administrator']::public.membership_role[]))
  with check (public.has_role(organization_id, array['Owner','Administrator']::public.membership_role[]));

-- ============================================================
-- activity_logs: visible to admins/managers, self-insert only
-- ============================================================
create policy activity_logs_select on public.activity_logs
  for select
  using (
    public.has_role(organization_id, array['Owner','Administrator']::public.membership_role[])
    or (store_id is not null and public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[]))
  );

create policy activity_logs_insert on public.activity_logs
  for insert
  with check (
    user_id = public.current_profile_id()
    and public.has_org_access(organization_id)
  );

-- ============================================================
-- export_history: personal only
-- ============================================================
create policy export_history_select_own on public.export_history
  for select
  using (user_id = public.current_profile_id());

create policy export_history_insert_own on public.export_history
  for insert
  with check (user_id = public.current_profile_id());

-- ============================================================
-- sync_queue: personal only
-- ============================================================
create policy sync_queue_select_own on public.sync_queue
  for select
  using (profile_id = public.current_profile_id());

create policy sync_queue_insert_own on public.sync_queue
  for insert
  with check (profile_id = public.current_profile_id());

create policy sync_queue_update_own on public.sync_queue
  for update
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

-- audit_logs: intentionally has NO policies here. RLS is enabled (from an
-- earlier migration) with zero policies, which means the table is fully
-- locked down from the client (anon/authenticated roles). Only service_role
-- (Edge Functions, Dashboard) can read/write it. This is deliberate.

-- ============================================================
-- FIX: memberships_insert needs a bootstrap path — otherwise creating a
-- brand-new organization leaves nobody able to insert the first (Owner)
-- membership row for it, since has_role()/has_org_access() both depend
-- on a membership already existing for that organization.
-- ============================================================
drop policy memberships_insert on public.memberships;

create policy memberships_insert on public.memberships
  for insert
  with check (
    public.has_role(organization_id, array['Owner','Administrator']::public.membership_role[])
    or (
      public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[])
      and role in ('Receiver','Employee','Viewer')
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
