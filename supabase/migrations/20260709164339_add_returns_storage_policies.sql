-- Path convention: {return_item_id}/{filename}. Access is derived by joining
-- back to return_items, mirroring the return_images table policies exactly.

create policy returns_storage_select on storage.objects
  for select
  using (
    bucket_id = 'returns'
    and exists (
      select 1 from public.return_items ri
      where ri.id::text = (storage.foldername(name))[1]
        and public.has_store_access(ri.organization_id, ri.store_id)
    )
  );

create policy returns_storage_insert on storage.objects
  for insert
  with check (
    bucket_id = 'returns'
    and exists (
      select 1 from public.return_items ri
      where ri.id::text = (storage.foldername(name))[1]
        and public.has_store_role(
          ri.organization_id, ri.store_id,
          array['Owner','Administrator','StoreManager','Receiver','Employee']::public.membership_role[]
        )
    )
  );

create policy returns_storage_delete on storage.objects
  for delete
  using (
    bucket_id = 'returns'
    and (
      owner = auth.uid()
      or exists (
        select 1 from public.return_items ri
        where ri.id::text = (storage.foldername(name))[1]
          and public.has_store_role(ri.organization_id, ri.store_id, array['Owner','Administrator','StoreManager']::public.membership_role[])
      )
    )
  );
