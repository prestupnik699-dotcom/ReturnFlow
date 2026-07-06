# `AI_RULES.md`

> **Version:** 1.0
> **Project:** ReturnFlow
> **Status:** Active
> **Priority:** Critical

---

# 1. Purpose

This document defines the mandatory development rules for every AI assistant, software engineer, or contributor working on the ReturnFlow project.

These rules are not recommendations.

They are mandatory.

Breaking these rules may introduce bugs, duplicate code, inconsistent architecture, or data loss.

---

# 2. Project Mission

The goal is to build a commercial-grade mobile application for Android and iOS that manages supplier returns for retail stores.

The application must be:

* Fast
* Reliable
* Beautiful
* Offline-first
* Easy to use
* Scalable
* Maintainable

Every implementation must support these goals.

---

# 3. General Development Principles

The AI must always prioritize:

1. Code quality
2. Readability
3. Maintainability
4. Performance
5. Scalability
6. User experience
7. Security

Never optimize for writing code faster if it decreases quality.

---

# 4. Technology Stack (Mandatory)

The AI must never replace these technologies without explicit approval.

Frontend

* React Native
* Expo
* TypeScript

Backend

* Supabase

Database

* PostgreSQL

Authentication

* Supabase Auth

Storage

* Supabase Storage

---

# 5. Architecture Rules

The AI must follow Feature-Based Architecture.

Do not organize files by type.

Correct:

```text
features/
    returns/
    suppliers/
    chat/
```

Incorrect:

```text
components/
screens/
services/
utils/
```

Everything must belong to a feature.

---

# 6. Single Source of Truth

The following documents always override assumptions:

1. PROJECT_SPECIFICATION.md
2. DATABASE.md
3. API.md
4. ROADMAP.md
5. AI_RULES.md

If there is a conflict, these documents must be followed.

The AI must never invent new behavior.

---

# 7. Forbidden Actions

The AI must never:

❌ Change architecture

❌ Rename database fields

❌ Remove existing features

❌ Rewrite working code without reason

❌ Duplicate components

❌ Introduce breaking changes

❌ Ignore TypeScript errors

❌ Use `any` without approval

❌ Hardcode texts

❌ Hardcode colors

❌ Hardcode IDs

---

# 8. Code Quality Standards

Every new code must:

* Be reusable
* Be typed
* Be documented when necessary
* Be easy to understand
* Follow existing naming conventions
* Avoid duplication (DRY)

---

# 9. File Creation Rules

Before creating a new file the AI must verify:

* Does this file already exist?
* Can the logic be reused?
* Can the feature be extended?

Only create a new file if absolutely necessary.

---

# 10. UI Rules

Every screen must:

* Support Dark Mode
* Support Light Mode
* Support Georgian
* Support English
* Support Russian
* Be responsive
* Work on small devices
* Work on large devices

---

# 11. Performance Rules

Never load unnecessary data.

Always:

* paginate lists
* lazy-load images
* cache requests
* memoize expensive computations

---

# 12. Offline Rules

Every critical action must work offline.

If there is no internet:

* save locally
* sync automatically later
* prevent data loss

Offline support is mandatory.

---

# 13. Security Rules

Never trust the client.

Every permission must be verified on the backend.

Every database query must respect Row Level Security.

---

# 14. Database Rules

Never modify database schema without checking:

DATABASE.md

Never create duplicate tables.

Never duplicate relationships.

Never store calculated values unless required for performance.

---

# 15. Localization Rules

Every visible text must come from localization files.

Never write:

```ts
<Text>Add Product</Text>
```

Correct:

```ts
<Text>{t("returns.addProduct")}</Text>
```

---

# 16. Component Rules

Components must be:

* small
* reusable
* testable
* independent

Avoid components longer than 300 lines unless justified.

---

# 17. Git Rules

Each feature should be implemented in separate commits.

Never combine unrelated changes.

Commit messages must be meaningful.

---

# 18. Error Handling

Every async function must handle:

* loading
* success
* error
* retry

Never fail silently.

---

# 19. Images

Images must:

* be compressed
* support multiple uploads
* upload in background
* show progress
* retry failed uploads

---

# 20. Testing

Every completed feature must pass:

* TypeScript checks
* Lint
* Manual testing
* Functional testing

No feature is considered complete until tested.

---

# 21. UI Philosophy

The user works in a busy retail environment.

Every interaction must be:

* fast
* obvious
* possible with one hand
* understandable in less than three seconds

---

# 22. Development Order

The AI must never skip roadmap steps.

Follow:

ROADMAP.md

Only after one module is complete should the next module begin.

---

# 23. Version Policy

Version 1.0 includes only approved features.

Features planned for Version 2.0 must never be implemented early unless explicitly requested.

---

# 24. Final Rule

If multiple implementation options exist:

Choose the solution that:

* produces cleaner architecture,
* minimizes future maintenance,
* improves scalability,
* reduces bugs,
* keeps the user experience simple.

---

# 25. AI Self-Check (Mandatory)

Before finishing any task, the AI must verify:

* Architecture unchanged ✅
* TypeScript clean ✅
* No duplicated code ✅
* Localization supported ✅
* Dark mode supported ✅
* Offline compatibility preserved ✅
* Database unchanged (unless requested) ✅
* No performance regression ✅
* Compatible with Version 1.0 roadmap ✅