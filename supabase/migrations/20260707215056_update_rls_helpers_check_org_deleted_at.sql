-- All four helpers now also require the organization itself to be active
-- (deleted_at is null). Every RLS policy in the app calls one of these, so
-- soft-deleting an organization here immediately locks out access to
-- everything belonging to it, without touching any other table's policies.

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
    where m.profile_id = public.current_profile_id()
      and m.organization_id = target_org_id
      and m.deleted_at is null
      and o.deleted_at is null
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
    where m.profile_id = public.current_profile_id()
      and m.organization_id = target_org_id
      and m.deleted_at is null
      and o.deleted_at is null
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
    where m.profile_id = public.current_profile_id()
      and m.organization_id = target_org_id
      and m.deleted_at is null
      and o.deleted_at is null
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
    where m.profile_id = public.current_profile_id()
      and m.organization_id = target_org_id
      and m.deleted_at is null
      and o.deleted_at is null
      and (m.store_id is null or m.store_id = target_store_id)
      and m.role = any(allowed_roles)
  );
$$;
