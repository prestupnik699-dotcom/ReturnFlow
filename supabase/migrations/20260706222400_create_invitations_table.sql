-- ============================================================
-- invitations
-- ============================================================
create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  role public.membership_role not null,
  email text,
  code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  status public.invitation_status not null default 'pending',
  invited_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index invitations_organization_id_idx on public.invitations(organization_id);
create index invitations_code_idx on public.invitations(code);
create index invitations_status_idx on public.invitations(status);

alter table public.invitations enable row level security;

-- Only org admins/managers can see invitations for their own organization
create policy invitations_select on public.invitations
  for select
  using (public.has_org_access(organization_id));

-- Same creators/roles as memberships_insert (D-018): Owner/Administrator anywhere,
-- StoreManager only for their own store and only Receiver/Employee/Viewer roles
create policy invitations_insert on public.invitations
  for insert
  with check (
    invited_by = public.current_profile_id()
    and (
      public.has_role(organization_id, array['Owner','Administrator']::public.membership_role[])
      or (
        public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[])
        and role in ('Receiver','Employee','Viewer')
      )
    )
  );

create policy invitations_update on public.invitations
  for update
  using (
    public.has_role(organization_id, array['Owner','Administrator']::public.membership_role[])
    or public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[])
  )
  with check (
    public.has_role(organization_id, array['Owner','Administrator']::public.membership_role[])
    or public.has_store_role(organization_id, store_id, array['StoreManager']::public.membership_role[])
  );

-- ============================================================
-- accept_invitation: the only way a brand-new user is allowed to create
-- their own membership row. Runs as security definer so it bypasses the
-- restrictive memberships_insert policy (D-018) — validation happens here
-- instead, against a real, unexpired, pending invitation code.
-- ============================================================
create or replace function public.accept_invitation(invitation_code text)
returns public.memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invitations;
  new_membership public.memberships;
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

  return new_membership;
end;
$$;

grant execute on function public.accept_invitation(text) to authenticated;
