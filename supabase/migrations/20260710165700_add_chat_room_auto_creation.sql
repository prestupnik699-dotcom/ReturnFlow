create or replace function public.handle_new_store()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chat_rooms (organization_id, store_id, type)
  values (new.organization_id, new.id, 'General');
  return new;
end;
$$;

create trigger on_store_created
  after insert on public.stores
  for each row execute function public.handle_new_store();
