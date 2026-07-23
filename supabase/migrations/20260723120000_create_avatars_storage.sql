-- ============================================================
-- avatars storage bucket — profile photos
-- Path convention: {auth_user_id}/{filename}, so ownership is derivable
-- directly from the path without a join, mirroring how "returns" bucket
-- policies key off a folder-name id.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public bucket (public = true above) already allows anyone to READ any
-- object's URL, which is what we want — avatars are visible to
-- teammates/anyone with the link, same as most apps treat profile photos.
-- Only insert/update/delete need to be restricted to the owner.

create policy avatars_storage_insert on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_storage_update on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_storage_delete on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
