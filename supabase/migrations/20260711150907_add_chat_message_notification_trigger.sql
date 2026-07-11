create or replace function public.notify_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  room public.chat_rooms;
  member record;
begin
  select * into room from public.chat_rooms where id = new.room_id;

  for member in
    select distinct m.profile_id
    from public.memberships m
    where m.organization_id = room.organization_id
      and m.deleted_at is null
      and (room.store_id is null or m.store_id is null or m.store_id = room.store_id)
      and m.profile_id != new.author_id
  loop
    insert into public.notifications (profile_id, title, body, type)
    values (member.profile_id, 'chat.newMessage', left(new.message, 100), 'chat_message');
  end loop;

  return new;
end;
$$;

create trigger notify_chat_message
  after insert on public.chat_messages
  for each row execute function public.notify_chat_message();
