-- storage.buckets has RLS enabled by default with no policies at all,
-- meaning authenticated clients can't even see that the 'avatars' bucket
-- exists — this silently breaks storage.from('avatars').upload(), which
-- needs to resolve the bucket before it ever gets to checking the
-- objects-table policies. The 'returns' bucket never hit this because it
-- predates this project's use of an RLS-enabled buckets table, or was
-- created through a path that didn't require it; avatars is likely the
-- first bucket created after buckets RLS started being enforced.
create policy buckets_select_public on storage.buckets
  for select
  using (public = true);
