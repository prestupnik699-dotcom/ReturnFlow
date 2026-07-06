# ReturnFlow Database

Version: 1.0

Database Engine:
PostgreSQL (Supabase)

Status:
Production Ready

---

# PURPOSE

This document defines the complete database schema for ReturnFlow.

The database must support:

• Multiple organizations
• Multiple stores
• Multiple users
• Multiple suppliers
• Offline synchronization
• Statistics
• Chat
• Announcements
• Activity Logs
• Future Version 2.0 features

All tables must support scalability.

---

# DATABASE PRINCIPLES

✔ UUID Primary Keys

✔ Foreign Keys

✔ Soft Delete

✔ Created At

✔ Updated At

✔ Row Level Security

✔ Indexed Search

✔ Audit Logs

✔ No duplicated data

---

# TABLE LIST

01 organizations

02 stores

03 profiles

04 memberships

05 suppliers

06 return_items

07 return_images

08 return_comments

09 return_history

10 chat_rooms

11 chat_messages

12 announcements

13 notifications

14 activity_logs

15 app_settings

16 export_history

17 sync_queue

18 audit_logs

---

=================================================

TABLE:
organizations

=================================================

Purpose:

Company that owns one or more stores.

Columns

id UUID PK

name TEXT

logo_url TEXT

primary_color TEXT

country TEXT

default_language TEXT

timezone TEXT

created_at TIMESTAMP

updated_at TIMESTAMP

deleted_at TIMESTAMP NULL

---

One organization

↓

Many stores

Many users

Many suppliers

---

=================================================

TABLE:
stores

=================================================

id UUID PK

organization_id UUID FK

name TEXT

city TEXT

address TEXT

phone TEXT NULL

is_active BOOLEAN

created_at

updated_at

deleted_at

---

Relationship

Organization

↓

Stores

---

=================================================

TABLE:
profiles

=================================================

User profile.

id UUID PK

auth_user_id UUID UNIQUE

first_name TEXT

last_name TEXT

photo_url TEXT

phone TEXT

language TEXT

theme TEXT

status TEXT

created_at

updated_at

---

Status values

active

vacation

blocked

deleted

---

=================================================

TABLE:
memberships

=================================================

This table connects users to organizations and stores.

id UUID

profile_id FK

organization_id FK

store_id FK

role

created_at

---

Roles

Owner

Administrator

StoreManager

Receiver

Employee

Viewer

---

One user may belong to multiple stores.

---

=================================================

TABLE:
suppliers

=================================================

id UUID

organization_id FK

name

contact_name

phone

email

favorite BOOLEAN

is_active BOOLEAN

created_at

updated_at

deleted_at

---

=================================================

TABLE:
return_items

=================================================

This is the heart of the application.

id UUID

organization_id FK

store_id FK

supplier_id FK

created_by FK

title

quantity

reason

comment

status

priority

returned_by FK NULL

returned_at NULL

created_at

updated_at

deleted_at

---

Status

pending

urgent

returned

archived

deleted

---

Priority

low

normal

high

critical

---

=================================================

TABLE:
return_images

=================================================

id UUID

return_item_id FK

image_url

thumbnail_url

uploaded_by

created_at

---

Supports unlimited images.

---

=================================================

TABLE:
return_comments

=================================================

id UUID

return_item_id FK

author_id FK

comment

created_at

edited_at

deleted_at

---

=================================================

TABLE:
return_history

=================================================

Stores every action.

id UUID

return_item_id FK

user_id FK

action

old_value JSONB

new_value JSONB

created_at

---

Examples

Created

Edited

Status Changed

Returned

Photo Added

Comment Added

Deleted

---

=================================================

TABLE:
chat_rooms

=================================================

id UUID

organization_id

store_id

type

created_at

---

Types

General

Returns

Announcements

Private (future)

---

=================================================

TABLE:
chat_messages

=================================================

id UUID

room_id FK

author_id FK

message

attachments JSONB

created_at

edited_at

deleted_at

---

=================================================

TABLE:
announcements

=================================================

id UUID

organization_id

store_id

author_id

title

message

is_pinned

created_at

expires_at

---

=================================================

TABLE:
notifications

=================================================

id UUID

profile_id

title

body

type

is_read

created_at

---

=================================================

TABLE:
activity_logs

=================================================

Stores all activity.

id UUID

organization_id

store_id

user_id

action

entity

entity_id

created_at

---

Examples

Created Return

Deleted Supplier

User Login

Announcement Created

Store Created

---

=================================================

TABLE:
app_settings

=================================================

Organization settings.

id UUID

organization_id

urgent_days

default_language

allow_exports

allow_chat

allow_comments

theme_color

created_at

updated_at

---

=================================================

TABLE:
export_history

=================================================

id UUID

user_id

type

filters JSONB

file_url

created_at

---

=================================================

TABLE:
sync_queue

=================================================

Offline queue.

id UUID

profile_id

operation

payload JSONB

status

retry_count

created_at

updated_at

---

Status

pending

processing

completed

failed

---

=================================================

TABLE:
audit_logs

=================================================

Security log.

id UUID

user_id

ip_address

device

action

metadata JSONB

created_at

---

SECURITY

Every table

Created At

Updated At

Soft Delete

UUID

RLS Enabled

Foreign Keys

Indexes

---

INDEXES

Create indexes for:

organization_id

store_id

supplier_id

status

priority

created_at

returned_at

room_id

author_id

Search fields

---

FULL TEXT SEARCH

Enable search for:

Return title

Supplier name

Comments

Announcements

Chat

---

BACKUP STRATEGY

Daily backups

Point-in-time recovery

Automatic Supabase backups

---

MIGRATION POLICY

Never edit existing migrations.

Always create new migration files.

---

VERSION POLICY

Database Version

1.0

Stable

No breaking changes allowed without migration.