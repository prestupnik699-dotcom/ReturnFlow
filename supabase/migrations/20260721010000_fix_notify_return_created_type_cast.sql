-- Real root cause found via Postgres logs (error 42804): notif_type was
-- declared as plain `text`, and Postgres does not implicitly cast a text
-- *variable* into an enum column on insert (only text *literals* get
-- that implicit cast) — every single return creation has been failing
-- since this trigger was added, not just urgent ones, because the insert
-- always goes through this variable regardless of priority.
create or replace function public.notify_return_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member record;
  notif_type public.notification_type;
begin
  notif_type := case
    when new.priority in ('high', 'critical') then 'urgent_return_created'
    else 'return_created'
  end;

  for member in
    select distinct m.profile_id
    from public.memberships m
    where m.organization_id = new.organization_id
      and m.deleted_at is null
      and (m.store_id is null or m.store_id = new.store_id)
      and m.profile_id != new.created_by
  loop
    insert into public.notifications (profile_id, title, body, type)
    values (member.profile_id, 'returns.newReturnNotification', left(new.title, 100), notif_type);
  end loop;

  return new;
end;
$$;
