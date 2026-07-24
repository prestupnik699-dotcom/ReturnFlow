-- ============================================================
-- reminders — free-text, date-anchored notes with two scheduled pushes
-- (day-before + due-day), reusing the existing notifications/send-push
-- pipeline rather than a new delivery path.
-- ============================================================

create type public.reminder_status as enum ('active', 'done', 'dismissed');

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  title text not null,
  due_date date not null,
  status public.reminder_status not null default 'active',
  related_supplier_id uuid references public.suppliers(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  -- Set once each scheduled ping actually fires, so the hourly cron pass
  -- below never sends the same reminder's day-before or due-day push
  -- twice even though it re-checks every active reminder every hour.
  notified_before_at timestamptz,
  notified_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reminders_organization_id_idx on public.reminders(organization_id);
create index reminders_due_date_idx on public.reminders(due_date);

create trigger set_reminders_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

alter table public.reminders enable row level security;

create policy reminders_select on public.reminders
  for select
  using (public.has_org_access(organization_id));

create policy reminders_insert on public.reminders
  for insert
  with check (
    created_by = public.current_profile_id()
    and public.has_org_access(organization_id)
  );

-- Only the creator can edit or delete their own reminder — reminders are
-- personal notes-with-a-date, not a shared team resource like returns.
create policy reminders_update on public.reminders
  for update
  using (created_by = public.current_profile_id())
  with check (created_by = public.current_profile_id());

create policy reminders_delete on public.reminders
  for delete
  using (created_by = public.current_profile_id());

-- ============================================================
-- reminder_recipients — who gets notified. The creator is always
-- inserted as a row here (enforced client-side, mirrored by the RLS
-- check below), plus whichever teammates they optionally chose.
-- ============================================================

create table public.reminder_recipients (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (reminder_id, profile_id)
);

create index reminder_recipients_reminder_id_idx on public.reminder_recipients(reminder_id);

alter table public.reminder_recipients enable row level security;

create policy reminder_recipients_select on public.reminder_recipients
  for select
  using (
    exists (
      select 1 from public.reminders r
      where r.id = reminder_recipients.reminder_id
        and public.has_org_access(r.organization_id)
    )
  );

create policy reminder_recipients_insert on public.reminder_recipients
  for insert
  with check (
    exists (
      select 1 from public.reminders r
      where r.id = reminder_recipients.reminder_id
        and r.created_by = public.current_profile_id()
    )
  );

create policy reminder_recipients_delete on public.reminder_recipients
  for delete
  using (
    exists (
      select 1 from public.reminders r
      where r.id = reminder_recipients.reminder_id
        and r.created_by = public.current_profile_id()
    )
  );

-- ============================================================
-- Dispatcher: run hourly by pg_cron below. Computes "now" in each
-- organization's own timezone (D-016 convention: organizations.timezone,
-- default 'Asia/Tbilisi') rather than UTC, so the 18:00/09:00 thresholds
-- line up with the store's actual local clock.
-- ============================================================

create or replace function public.dispatch_reminder_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rem record;
  recip record;
begin
  -- Day-before ping: due_date - 1, local time >= 18:00.
  for rem in
    select r.id, r.title
    from public.reminders r
    join public.organizations o on o.id = r.organization_id
    where r.status = 'active'
      and r.notified_before_at is null
      and (timezone(o.timezone, now()))::date = r.due_date - 1
      and extract(hour from timezone(o.timezone, now())) >= 18
  loop
    for recip in
      select profile_id from public.reminder_recipients where reminder_id = rem.id
    loop
      insert into public.notifications (profile_id, title, body, type)
      values (
        recip.profile_id,
        'reminders.dueTomorrowNotification',
        left(rem.title, 100),
        'reminder_due_tomorrow'
      );
    end loop;

    update public.reminders set notified_before_at = now() where id = rem.id;
  end loop;

  -- Due-day ping: due_date itself, local time >= 09:00.
  for rem in
    select r.id, r.title
    from public.reminders r
    join public.organizations o on o.id = r.organization_id
    where r.status = 'active'
      and r.notified_due_at is null
      and (timezone(o.timezone, now()))::date = r.due_date
      and extract(hour from timezone(o.timezone, now())) >= 9
  loop
    for recip in
      select profile_id from public.reminder_recipients where reminder_id = rem.id
    loop
      insert into public.notifications (profile_id, title, body, type)
      values (
        recip.profile_id,
        'reminders.dueTodayNotification',
        left(rem.title, 100),
        'reminder_due_today'
      );
    end loop;

    update public.reminders set notified_due_at = now() where id = rem.id;
  end loop;
end;
$$;

-- ============================================================
-- Schedule: hourly. If pg_cron isn't available on this Supabase plan,
-- this statement fails and the whole migration rolls back — everything
-- above (tables, RLS, the dispatcher function) stays intact either way,
-- since Postgres runs a migration file as one transaction.
-- ============================================================

create extension if not exists pg_cron;

select cron.schedule(
  'dispatch-reminder-notifications',
  '0 * * * *',
  $$select public.dispatch_reminder_notifications();$$
);
