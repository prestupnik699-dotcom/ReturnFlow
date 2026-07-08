-- ============================================================
-- Enforce blocked status in every RLS helper (D-028)
-- ============================================================
create or replace function public.has_org_access(target_org_id uuid)
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
-- Owner outranks Administrator: Administrator can no longer touch
-- Owner or Administrator memberships (D-028)
-- ============================================================
drop policy memberships_insert on public.memberships;

create policy memberships_insert on public.memberships
  for insert
  with check (
    public.has_role(organization_id, array['Owner']::public.membership_role[])
    or (
      public.has_role(organization_id, array['Administrator']::public.membership_role[])
      and role not in ('Owner', 'Administrator')
    )
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

drop policy memberships_update on public.memberships;

create policy memberships_update on public.memberships
  for update
  using (
    public.has_role(organization_id, array['Owner']::public.membership_role[])
    or (
      public.has_role(organization_id, array['Administrator']::public.membership_role[])
      and role not in ('Owner', 'Administrator')
    )
    or (
      public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[])
      and role in ('Receiver','Employee','Viewer')
    )
  )
  with check (
    public.has_role(organization_id, array['Owner']::public.membership_role[])
    or (
      public.has_role(organization_id, array['Administrator']::public.membership_role[])
      and role not in ('Owner', 'Administrator')
    )
    or (
      public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[])
      and role in ('Receiver','Employee','Viewer')
    )
  );

drop policy invitations_insert on public.invitations;

create policy invitations_insert on public.invitations
  for insert
  with check (
    invited_by = public.current_profile_id()
    and (
      public.has_role(organization_id, array['Owner']::public.membership_role[])
      or (
        public.has_role(organization_id, array['Administrator']::public.membership_role[])
        and role not in ('Owner', 'Administrator')
      )
      or (
        public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[])
        and role in ('Receiver','Employee','Viewer')
      )
    )
  );

-- ============================================================
-- set_member_status: hierarchy + last-owner protection (D-028)
-- ============================================================
create or replace function public.set_member_status(target_membership_id uuid, new_status public.profile_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_membership public.memberships;
  caller_is_owner boolean;
  remaining_active_owners integer;
begin
  select * into target_membership from public.memberships where id = target_membership_id;

  if target_membership.id is null then
    raise exception 'Membership not found';
  end if;

  caller_is_owner := public.has_role(target_membership.organization_id, array['Owner']::public.membership_role[]);

  if not caller_is_owner
     and not public.has_role(target_membership.organization_id, array['Administrator']::public.membership_role[]) then
    raise exception 'Only Owner or Administrator can change a member''s status';
  end if;

  if target_membership.role in ('Owner', 'Administrator') and not caller_is_owner then
    raise exception 'Only Owner can change the status of an Owner or Administrator';
  end if;

  if target_membership.role = 'Owner' and new_status = 'blocked' then
    select count(*) into remaining_active_owners
    from public.memberships m
    join public.profiles p on p.id = m.profile_id
    where m.organization_id = target_membership.organization_id
      and m.role = 'Owner'
      and m.deleted_at is null
      and p.status != 'blocked'
      and m.id != target_membership_id;

    if remaining_active_owners = 0 then
      raise exception 'Cannot block the last remaining Owner';
    end if;
  end if;

  update public.profiles
  set status = new_status
  where id = target_membership.profile_id;
end;
$$;

-- ============================================================
-- Trigger: block removing or demoting the last remaining Owner,
-- through ANY path (role change, soft-delete), by anyone (D-028)
-- ============================================================
create or replace function public.enforce_last_owner_protection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_active_owners integer;
begin
  if old.role = 'Owner' and old.deleted_at is null and (new.deleted_at is not null or new.role != 'Owner') then
    select count(*) into remaining_active_owners
    from public.memberships m
    join public.profiles p on p.id = m.profile_id
    where m.organization_id = old.organization_id
      and m.role = 'Owner'
      and m.deleted_at is null
      and p.status != 'blocked'
      and m.id != old.id;

    if remaining_active_owners = 0 then
      raise exception 'Cannot remove or demote the last remaining Owner of an organization';
    end if;
  end if;

  return new;
end;
$$;

create trigger enforce_last_owner_protection
  before update on public.memberships
  for each row execute function public.enforce_last_owner_protection();
