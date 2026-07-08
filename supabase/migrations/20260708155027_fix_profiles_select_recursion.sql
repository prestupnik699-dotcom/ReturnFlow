create or replace function public.can_view_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m1
    join public.memberships m2 on m1.organization_id = m2.organization_id
    join public.organizations o on o.id = m1.organization_id
    where m1.profile_id = target_profile_id
      and m2.profile_id = public.current_profile_id()
      and m1.deleted_at is null
      and m2.deleted_at is null
      and o.deleted_at is null
  );
$$;

drop policy profiles_select on public.profiles;

create policy profiles_select on public.profiles
  for select
  using (
    auth_user_id = auth.uid()
    or public.can_view_profile(id)
  );
