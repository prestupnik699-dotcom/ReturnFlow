-- Owner/Administrator only. A narrow, purpose-built function rather than a
-- broad UPDATE policy on profiles (which must stay self-only, D-018) —
-- mirrors the accept_invitation() pattern.
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

  if not public.has_role(target_membership.organization_id, array['Owner','Administrator']::public.membership_role[]) then
    raise exception 'Only Owner or Administrator can change a member''s status';
  end if;

  update public.profiles
  set status = new_status
  where id = target_membership.profile_id;
end;
$$;

grant execute on function public.set_member_status(uuid, public.profile_status) to authenticated;
