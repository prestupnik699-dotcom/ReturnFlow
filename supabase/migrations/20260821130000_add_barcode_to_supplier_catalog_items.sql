alter table public.supplier_catalog_items
  add column barcode text;

create index supplier_catalog_items_barcode_idx on public.supplier_catalog_items(barcode);
