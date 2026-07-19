-- Delivery-creation notification, same pattern as notify_return_created.
create or replace function public.notify_delivery_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member record;
begin
  for member in
    select distinct m.profile_id
    from public.memberships m
    where m.organization_id = new.organization_id
      and m.deleted_at is null
      and (m.store_id is null or m.store_id = new.store_id)
      and m.profile_id != new.created_by
  loop
    insert into public.notifications (profile_id, title, body, type)
    values (member.profile_id, 'deliveries.newDeliveryNotification', left(new.title, 100), 'delivery_created');
  end loop;

  return new;
end;
$$;

create trigger notify_delivery_created
  after insert on public.delivery_items
  for each row execute function public.notify_delivery_created();

-- Replace notify_return_created so urgent (high/critical priority) returns
-- get a distinct notification type — lets the client show them with a
-- different icon/color instead of looking identical to a routine return.
create or replace function public.notify_return_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member record;
  notif_type text;
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
