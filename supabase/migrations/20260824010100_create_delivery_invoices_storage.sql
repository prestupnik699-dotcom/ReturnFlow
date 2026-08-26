-- ============================================================
-- delivery-invoices storage bucket — photos of received invoices.
-- Same private-bucket pattern as "returns": path is keyed by the
-- owning delivery_invoices row's id (storage.foldername(name))[1],
-- so the row must already exist before its photo is uploaded. The
-- client flow reflects this: extract fields from the photo first
-- (raw image sent directly to the OCR edge function, no storage
-- involved yet), let the person review/edit, THEN create the
-- delivery_invoices row and only after that upload the photo
-- referencing its id — never uploading a photo for data that was
-- reviewed and discarded.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('delivery-invoices', 'delivery-invoices', false)
on conflict (id) do nothing;

create policy delivery_invoices_storage_select on storage.objects
  for select
  using (
    bucket_id = 'delivery-invoices'
    and exists (
      select 1 from public.delivery_invoices di
      where di.id::text = (storage.foldername(name))[1]
        and public.has_store_access(di.organization_id, di.store_id)
    )
  );

create policy delivery_invoices_storage_insert on storage.objects
  for insert
  with check (
    bucket_id = 'delivery-invoices'
    and exists (
      select 1 from public.delivery_invoices di
      where di.id::text = (storage.foldername(name))[1]
        and public.has_store_role(
          di.organization_id, di.store_id,
          array['Owner','StoreManager','Employee']::public.membership_role[]
        )
    )
  );

create policy delivery_invoices_storage_delete on storage.objects
  for delete
  using (
    bucket_id = 'delivery-invoices'
    and (
      owner = auth.uid()
      or exists (
        select 1 from public.delivery_invoices di
        where di.id::text = (storage.foldername(name))[1]
          and public.has_store_role(di.organization_id, di.store_id, array['Owner','StoreManager']::public.membership_role[])
      )
    )
  );
