-- Critical fix: notify_return_created (urgent variant) and
-- notify_delivery_created insert 'urgent_return_created' and
-- 'delivery_created' respectively, but notification_type never had those
-- values added — every urgent return or delivery created since those
-- triggers were added would fail this INSERT with an invalid enum value,
-- and since triggers run in the same transaction as the row that fired
-- them, that failure rolls back the whole operation, not just the
-- notification.
alter type public.notification_type add value if not exists 'urgent_return_created';
alter type public.notification_type add value if not exists 'delivery_created';
