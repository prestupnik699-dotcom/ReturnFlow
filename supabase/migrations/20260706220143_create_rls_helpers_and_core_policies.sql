-- ============================================================
-- Helper functions (security definer: bypass RLS internally to
-- avoid recursive policy checks; each function IS a security check)
-- ============================================================
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid();
$$;

create or replace function public.has_org_access(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where profile_id = public.current_profile_id()
      and organization_id = target_org_id
      and deleted_at is null
  );
$$;

create or replace function public.has_store_access(target_org_id uuid, target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where profile_id = public.current_profile_id()
      and organization_id = target_org_id
      and deleted_at is null
      and (store_id is null or store_id = target_store_id)
  );
$$;

create or replace function public.has_role(target_org_id uuid, allowed_roles public.membership_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where profile_id = public.current_profile_id()
      and organization_id = target_org_id
      and deleted_at is null
      and role = any(allowed_roles)
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
    select 1 from public.memberships
    where profile_id = public.current_profile_id()
      and organization_id = target_org_id
      and deleted_at is null
      and (store_id is null or store_id = target_store_id)
      and role = any(allowed_roles)
  );
$$;

-- ============================================================
-- Auto-create a profile row whenever a new Supabase Auth user is created
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, first_name, last_name, language, theme)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'language', 'ka'),
    'system'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- organizations policies
-- ============================================================
create policy organizations_select on public.organizations
  for select
  using (public.has_org_access(id));

create policy organizations_insert on public.organizations
  for insert
  with check (auth.uid() is not null);

create policy organizations_update on public.organizations
  for update
  using (public.has_role(id, array['Owner','Administrator']::public.membership_role[]))
  with check (public.has_role(id, array['Owner','Administrator']::public.membership_role[]));

-- ============================================================
-- stores policies
-- ============================================================
create policy stores_select on public.stores
  for select
  using (public.has_org_access(organization_id));

create policy stores_insert on public.stores
  for insert
  with check (public.has_role(organization_id, array['Owner','Administrator']::public.membership_role[]));

create policy stores_update on public.stores
  for update
  using (
    public.has_role(organization_id, array['Owner','Administrator']::public.membership_role[])
    or public.has_store_role(organization_id, id, array['StoreManager']::public.membership_role[])
  )
  with check (
    public.has_role(organization_id, array['Owner','Administrator']::public.membership_role[])
    or public.has_store_role(organization_id, id, array['StoreManager']::public.membership_role[])
  );

-- ============================================================
-- profiles policies
-- ============================================================
create policy profiles_select on public.profiles
  for select
  using (
    auth_user_id = auth.uid()
    or exists (
      select 1 from public.memberships m1
      join public.memberships m2 on m1.organization_id = m2.organization_id
      where m1.profile_id = public.profiles.id
        and m2.profile_id = public.current_profile_id()
        and m1.deleted_at is null
        and m2.deleted_at is null
    )
  );

create policy profiles_update_own on public.profiles
  for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- ============================================================
-- memberships policies
-- ============================================================
create policy memberships_select on public.memberships
  for select
  using (
    profile_id = public.current_profile_id()
    or public.has_org_access(organization_id)
  );

create policy memberships_insert on public.memberships
  for insert
  with check (
    public.has_role(organization_id, array['Owner','Administrator']::public.membership_role[])
    or (
      public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[])
      and role in ('Receiver','Employee','Viewer')
    )
  );

create policy memberships_update on public.memberships
  for update
  using (
    public.has_role(organization_id, array['Owner','Administrator']::public.membership_role[])
    or (
      public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[])
      and role in ('Receiver','Employee','Viewer')
    )
  )
  with check (
    public.has_role(organization_id, array['Owner','Administrator']::public.membership_role[])
    or (
      public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[])
      and role in ('Receiver','Employee','Viewer')
    )
  );
