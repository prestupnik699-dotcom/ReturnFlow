insert into public.chat_rooms (organization_id, store_id, type)
select s.organization_id, s.id, 'General'
from public.stores s
where s.deleted_at is null
  and not exists (
    select 1 from public.chat_rooms cr
    where cr.store_id = s.id and cr.type = 'General'
  );
