create or replace function public.log_return_image_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.return_history (return_item_id, user_id, action, old_value, new_value)
  values (new.return_item_id, new.uploaded_by, 'photo_added', null, jsonb_build_object('image_id', new.id));
  return new;
end;
$$;

create trigger log_return_image_history
  after insert on public.return_images
  for each row execute function public.log_return_image_history();
