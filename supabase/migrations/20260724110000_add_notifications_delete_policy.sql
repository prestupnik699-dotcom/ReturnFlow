-- notifications currently only has select/update policies (own rows
-- only) — no delete policy exists, so any client-side delete attempt
-- would silently fail under RLS. Adding delete scoped to the owning
-- profile, same convention as notifications_select_own/update_own.
create policy notifications_delete_own on public.notifications
  for delete
  using (profile_id = public.current_profile_id());
