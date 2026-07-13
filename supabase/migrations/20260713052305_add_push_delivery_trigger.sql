create extension if not exists pg_net with schema extensions;

-- The anon key is intentionally not a secret (it's already public in the
-- client bundle, protected by RLS everywhere) — sending it as the bearer
-- token here just satisfies the Edge Function's default JWT check.
create or replace function public.send_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://hdqabdsjmluiwqqjeohj.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_oSkW8qfH88O8hnfgKY0C3g_RRubwRpk'
    ),
    body := jsonb_build_object('notification_id', new.id)
  );
  return new;
end;
$$;

create trigger send_push_on_notification
  after insert on public.notifications
  for each row execute function public.send_push_on_notification();

-- Second notification source (D-034), same pattern as notify_chat_message.
create or replace function public.notify_return_created()
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
    values (member.profile_id, 'returns.newReturnNotification', left(new.title, 100), 'return_created');
  end loop;

  return new;
end;
$$;

create trigger notify_return_created
  after insert on public.return_items
  for each row execute function public.notify_return_created();
