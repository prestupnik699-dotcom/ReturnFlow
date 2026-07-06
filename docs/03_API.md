# ReturnFlow API Specification

Version: 1.0

Status:
Production Ready

Backend:
Supabase

Protocol:
HTTPS

Authentication:
JWT (Supabase Auth)

Authorization:
Row Level Security (RLS)

---

# PURPOSE

This document defines every API interaction inside ReturnFlow.

All frontend code must communicate through service layers.

Screens must NEVER call Supabase directly.

Correct:

Screen
↓
Service
↓
Supabase

Incorrect:

Screen
↓
Supabase

---

# API STANDARDS

Every request returns:

Success

or

Error

Never return undefined.

Never swallow errors.

Always return typed objects.

---

# RESPONSE FORMAT

Success

{
 success: true,
 data: ...
}

Error

{
 success: false,
 error: {
   code: "...",
   message: "..."
 }
}

---

# AUTH MODULE

LOGIN

Email + Password

POST

/auth/login

Response

User

Access Token

Refresh Token

Permissions

Selected Store

Organization

---

REGISTER

Invitation Code Required

POST

/auth/register

---

LOGOUT

POST

/auth/logout

---

REFRESH TOKEN

POST

/auth/refresh

---

CHANGE PASSWORD

POST

/auth/password/change

---

FORGOT PASSWORD

POST

/auth/password/reset

---

# ORGANIZATIONS

GET

/organizations

Returns all organizations available to user.

---

GET

/organization/:id

Returns organization details.

---

POST

/organization

Create organization.

Owner only.

---

PATCH

/organization/:id

Update organization.

---

DELETE

/organization/:id

Owner only.

---

# STORES

GET

/stores

List stores.

---

POST

/store

Create store.

---

PATCH

/store/:id

Edit store.

---

DELETE

/store/:id

Soft Delete.

---

# USERS

GET

/users

Organization users.

---

POST

/users/invite

Invite employee.

---

PATCH

/users/:id

Edit profile.

---

PATCH

/users/:id/role

Change role.

---

DELETE

/users/:id

Remove access.

---

# SUPPLIERS

GET

/suppliers

---

POST

/supplier

---

PATCH

/supplier/:id

---

DELETE

/supplier/:id

Soft delete only.

---

# RETURNS

GET

/returns

Supports:

Search

Pagination

Filters

Sorting

---

GET

/returns/:id

Return details.

---

POST

/returns

Create return item.

---

PATCH

/returns/:id

Edit return.

---

POST

/returns/:id/complete

Mark as returned.

---

POST

/returns/:id/comment

Add comment.

---

POST

/returns/:id/image

Upload image.

---

DELETE

/returns/:id

Soft Delete.

---

# SEARCH

GET

/search

Supports

Returns

Suppliers

Users

Announcements

---

# CHAT

GET

/chat/rooms

---

GET

/chat/:room

---

POST

/chat/send

---

PATCH

/chat/message/:id

---

DELETE

/chat/message/:id

Soft delete.

---

# ANNOUNCEMENTS

GET

/announcements

---

POST

/announcement

Admin only.

---

PATCH

/announcement/:id

---

DELETE

/announcement/:id

---

# STATISTICS

GET

/statistics/today

---

GET

/statistics/week

---

GET

/statistics/month

---

GET

/statistics/suppliers

---

GET

/statistics/employees

---

# EXPORT

POST

/export/pdf

---

POST

/export/excel

---

# NOTIFICATIONS

GET

/notifications

---

PATCH

/notifications/read

---

PATCH

/notifications/read-all

---

# SETTINGS

GET

/settings

---

PATCH

/settings

---

# OFFLINE SYNC

POST

/sync

Uploads pending offline changes.

Returns:

Conflicts

Completed operations

Errors

---

# VALIDATION

Every request validates:

Authentication

Authorization

Input schema

Organization

Store access

Role

---

# RATE LIMITING

Protect:

Login

Password reset

Invitation

Exports

Chat spam

---

# FILE UPLOAD

Allowed:

jpg

jpeg

png

webp

Maximum:

10 MB

Images compressed automatically.

---

# ERROR CODES

400

Bad Request

401

Unauthorized

403

Forbidden

404

Not Found

409

Conflict

422

Validation Error

429

Too Many Requests

500

Internal Server Error

---

# LOGGING

Every important action generates:

Activity Log

Audit Log

Statistics Event

---

# SECURITY

Never expose:

Passwords

Tokens

Internal IDs

Private metadata

---

# FUTURE API (Version 2.0)

Barcode

AI Recognition

Voice Input

ERP Integration

Public API

Webhook Support