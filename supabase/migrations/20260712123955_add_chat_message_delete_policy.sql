drop policy if exists chat_messages_delete on public.chat_messages;

create policy chat_messages_delete on public.chat_messages
  for update
  using (
    author_id = public.current_profile_id()
    or exists (
      select 1 from public.chat_rooms cr
      where cr.id = chat_messages.room_id
        and public.has_role(cr.organization_id, array['Owner','Administrator']::public.membership_role[])
    )
  )
  with check (
    author_id = public.current_profile_id()
    or exists (
      select 1 from public.chat_rooms cr
      where cr.id = chat_messages.room_id
        and public.has_role(cr.organization_id, array['Owner','Administrator']::public.membership_role[])
    )
  );
