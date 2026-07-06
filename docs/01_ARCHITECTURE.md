# 📄 01_ARCHITECTURE.md

```markdown
# ReturnFlow Architecture

Version: 1.0

Status: Active

Document Owner: Product Architecture

---

# 1. Purpose

This document defines the complete software architecture of the ReturnFlow application.

Every developer and AI assistant must follow this architecture.

Changing architecture requires explicit approval.

---

# 2. Application Goals

The architecture must provide:

- High performance
- Scalability
- Offline support
- Easy maintenance
- Clear separation of responsibilities
- Modular development
- Easy future expansion
- Enterprise-level stability

---

# 3. Technology Stack

Mobile

- React Native
- Expo

Programming Language

- TypeScript (Strict Mode)

Backend

- Supabase

Database

- PostgreSQL

Authentication

- Supabase Auth

Storage

- Supabase Storage

Push Notifications

- Expo Notifications

Navigation

- Expo Router

Forms

- React Hook Form

Validation

- Zod

State Management

- Zustand

Server State

- TanStack Query (React Query)

Localization

- i18next

Charts

- Victory Native XL (or equivalent)

Date Handling

- date-fns

---

# 4. Architecture Style

Feature-Based Architecture

Each feature owns its:

- Screens
- Components
- Hooks
- Services
- Types
- Validation
- API
- Tests

Features must be independent.

---

# 5. Root Folder Structure

app/

src/

assets/

docs/

---

Inside src:

components/

features/

hooks/

services/

stores/

types/

theme/

constants/

lib/

localization/

utils/

---

# 6. Feature Structure

Example:

features/

returns/

components/

screens/

hooks/

services/

types/

validators/

constants/

Each feature must not directly modify another feature.

Communication should happen through services or shared modules.

---

# 7. Shared Components

Shared components belong only here:

src/components

Examples:

Button

Input

Card

Avatar

Badge

Modal

EmptyState

Loading

ErrorView

SearchBar

FloatingButton

ImageViewer

Never duplicate shared UI.

---

# 8. State Management

Use Zustand only for:

- User
- Authentication
- Selected Store
- Theme
- Language
- Notification Settings

Do NOT store server data inside Zustand.

---

# 9. Server State

Use TanStack Query for:

Returns

Suppliers

Statistics

Chat

Announcements

Stores

Organizations

Benefits:

Caching

Automatic refetch

Optimistic updates

Offline support

Retry

---

# 10. Forms

All forms must use:

React Hook Form

Validation:

Zod

No manual validation.

---

# 11. API Layer

Every feature owns its own API service.

Example:

returns.service.ts

suppliers.service.ts

chat.service.ts

Never call Supabase directly from screens.

---

# 12. Theme System

Single Theme Provider.

Support:

Light

Dark

System

Colors come only from theme files.

Never hardcode colors.

---

# 13. Typography

Single typography system.

Sizes:

xs

sm

md

lg

xl

2xl

Weights:

Regular

Medium

SemiBold

Bold

No custom sizes inside screens.

---

# 14. Icons

Single icon library.

Consistent icon style.

Never mix icon packs without approval.

---

# 15. Images

Store images in Supabase Storage.

Generate thumbnails.

Lazy load images.

Compress before upload.

Support multiple photos.

---

# 16. Localization

Folder:

localization/

Supported:

Georgian

English

Russian

Every string must have translation keys.

---

# 17. Error Handling

Global Error Boundary.

Feature-level errors.

Network errors.

Validation errors.

Friendly messages only.

---

# 18. Logging

Development:

Console logs allowed.

Production:

No debug logs.

Use centralized logging service if introduced later.

---

# 19. Offline Strategy

Offline-first.

Local queue.

Automatic synchronization.

Conflict resolution policy documented separately.

User should never lose data.

---

# 20. Security

Supabase Row Level Security enabled.

Permission checks on backend.

JWT authentication.

No sensitive data stored insecurely.

---

# 21. File Naming

Components:

PascalCase

Example:

ReturnCard.tsx

Hooks:

useSomething.ts

Example:

useReturns.ts

Services:

returns.service.ts

Types:

returns.types.ts

Validators:

returns.schema.ts

---

# 22. Performance Targets

App launch

< 2 seconds

Open Returns screen

< 1 second

Search

Instant

Scrolling

60 FPS target

Image loading

Progressive

---

# 23. Scalability

Architecture must support:

100+ stores

10,000+ return records

Thousands of images

Hundreds of users

Future web admin panel

Future Version 2.0 modules

Without major restructuring.

---

# 24. Design Principles

Simple

Fast

Predictable

Minimal

Professional

Commercial

Every interaction should reduce employee workload.

---

# 25. Architecture Rules Summary

Always:

Keep modules independent.

Reuse components.

Separate UI from business logic.

Separate API from screens.

Separate validation from UI.

Never duplicate logic.

Never bypass architecture.

Always think long-term.
```

