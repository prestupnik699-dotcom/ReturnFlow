create or replace function public.accept_invitation(invitation_code text)
returns public.memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invitations;
  new_membership public.memberships;
  org_default_language text;
begin
  select * into inv
  from public.invitations
  where code = invitation_code
    and status = 'pending'
    and expires_at > now()
  for update;

  if inv.id is null then
    raise exception 'Invalid or expired invitation code';
  end if;

  insert into public.memberships (profile_id, organization_id, store_id, role)
  values (public.current_profile_id(), inv.organization_id, inv.store_id, inv.role)
  returning * into new_membership;

  update public.invitations
  set status = 'accepted', accepted_at = now()
  where id = inv.id;

  -- Seed the new member's personal language from the organization's default.
  -- This happens only once, at the moment they join. After that it is their
  -- own setting (profiles.language), changeable any time in Profile Settings,
  -- fully independent of the organization from then on.
  select default_language into org_default_language
  from public.organizations
  where id = inv.organization_id;

  if org_default_language is not null then
    update public.profiles
    set language = org_default_language
    where id = public.current_profile_id();
  end if;

  return new_membership;
end;
$$;
