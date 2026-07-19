-- Optional unit price per return item — nullable because historical
-- records won't have it and price isn't always known at the moment of
-- logging a return. Needed to compute a real monetary total for the
-- accountant-facing export (quantity alone isn't enough to reconcile
-- against rs.ge invoices).
alter table public.return_items
  add column unit_price numeric(12, 2);

alter table public.return_items
  add constraint return_items_unit_price_non_negative check (unit_price is null or unit_price >= 0);
