-- Supabase Storage performs an INSERT ... RETURNING * after every upload
-- to hand the object's metadata back to the client. Without a matching
-- SELECT policy, Postgres can't satisfy that RETURNING clause under RLS,
-- and the *entire* insert is rejected as a policy violation — even
-- though the INSERT policy itself was correct. This is a well-documented
-- Supabase gotcha, not specific to this bucket's insert/update/delete
-- policies (see: Storage error 403 "new row violates row-level security
-- policy" on upload, Supabase troubleshooting docs).
create policy avatars_storage_select on storage.objects
  for select
  using (bucket_id = 'avatars');
