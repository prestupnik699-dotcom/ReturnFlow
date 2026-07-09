create or replace function public.log_return_comment_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.return_history (return_item_id, user_id, action, old_value, new_value)
  values (new.return_item_id, new.author_id, 'comment_added', null, jsonb_build_object('comment_id', new.id));
  return new;
end;
$$;

create trigger log_return_comment_history
  after insert on public.return_comments
  for each row execute function public.log_return_comment_history();
