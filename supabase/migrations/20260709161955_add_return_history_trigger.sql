create or replace function public.log_return_item_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.return_history (return_item_id, user_id, action, old_value, new_value)
    values (new.id, public.current_profile_id(), 'created', null, jsonb_build_object('status', new.status, 'priority', new.priority));
    return new;
  end if;

  if TG_OP = 'UPDATE' and old.status is distinct from new.status then
    insert into public.return_history (return_item_id, user_id, action, old_value, new_value)
    values (
      new.id,
      public.current_profile_id(),
      'status_changed',
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;

  return new;
end;
$$;

create trigger log_return_item_history
  after insert or update on public.return_items
  for each row execute function public.log_return_item_history();
