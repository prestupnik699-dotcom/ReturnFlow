-- ============================================================
-- Support multiple photos per invoice (multi-page invoices).
-- photo_url (single text) becomes photo_urls (text array) — existing
-- single values are preserved as one-element arrays. Storage paths
-- follow {invoice_id}/photo-{n}.jpg, still keyed by the owning row's
-- id per the existing storage RLS policies (no policy change needed
-- since those only check the folder name, not the filename).
-- ============================================================
alter table public.delivery_invoices
  add column photo_urls text[] not null default '{}';

update public.delivery_invoices
  set photo_urls = array[photo_url]
  where photo_url is not null;

alter table public.delivery_invoices
  drop column photo_url;
