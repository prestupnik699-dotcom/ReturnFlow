-- ============================================================
-- chat_rooms
-- ============================================================
-- See docs/DECISIONS.md D-010: 'Announcements' type reserved, not built as a
-- separate feature in V1 (announcements table below is the real implementation).
-- See docs/DECISIONS.md D-017: store_id nullable, NULL = organization-wide room.
create type public.chat_room_type as enum ('General', 'Returns', 'Announcements', 'Private');

create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  type public.chat_room_type not null,
  created_at timestamptz not null default now()
);

create index chat_rooms_organization_id_idx on public.chat_rooms(organization_id);
create index chat_rooms_store_id_idx on public.chat_rooms(store_id);

alter table public.chat_rooms enable row level security;

-- ============================================================
-- chat_messages
-- ============================================================
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  message text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  search_vector tsvector generated always as (to_tsvector('simple', coalesce(message, ''))) stored
);

create index chat_messages_room_id_idx on public.chat_messages(room_id);
create index chat_messages_author_id_idx on public.chat_messages(author_id);
create index chat_messages_search_vector_idx on public.chat_messages using gin(search_vector);

alter table public.chat_messages enable row level security;

-- ============================================================
-- announcements
-- ============================================================
-- See docs/DECISIONS.md D-011: updated_at/deleted_at added (missing in original spec).
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  message text not null,
  is_pinned boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(message, ''))
  ) stored
);

create index announcements_organization_id_idx on public.announcements(organization_id);
create index announcements_store_id_idx on public.announcements(store_id);
create index announcements_search_vector_idx on public.announcements using gin(search_vector);

create trigger set_announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

alter table public.announcements enable row level security;

-- ============================================================
-- notifications
-- ============================================================
-- See docs/DECISIONS.md D-017 for enum value rationale.
-- See docs/DECISIONS.md D-011: updated_at/deleted_at added (missing in original spec).
create type public.notification_type as enum (
  'return_created',
  'return_urgent',
  'return_returned',
  'comment_added',
  'chat_message',
  'announcement',
  'invitation'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type public.notification_type not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index notifications_profile_id_idx on public.notifications(profile_id);
create index notifications_type_idx on public.notifications(type);

create trigger set_notifications_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;
