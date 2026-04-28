---
phase: 02-catalog-crud
plan: "02"
subsystem: courses
tags: [courses, slugify, lifecycle, actions, queries, tdd, pt-BR]

# Dependency graph
requires:
  - "02-01: Migration 0014 published_at/archived_at columns in courses table"
provides:
  - "slugify(text): pt-BR-aware URL slug utility (NFKD normalize)"
  - "publishCourseSchema / archiveCourseSchema / unpublishCourseSchema in courses/schema.ts"
  - "publishCourseAction / unpublishCourseAction / archiveCourseAction in upsert-course.ts"
  - "getAdminCourseList(): admin query returning all courses regardless of status"
  - "getAvailableCourses(): student path now filters published_at IS NOT NULL AND archived_at IS NULL"
affects:
  - "src/app/curso/[slug] — only published non-archived courses visible to students"
  - "src/app/admin/cursos (plan 02-05) — will consume getAdminCourseList"

# Tech stack
tech_stack:
  added: []
  patterns:
    - "NFKD normalize + combining-diacritics strip for pt-BR slug generation"
    - "Supabase .not()/.is() chaining for nullable timestamp filters"
    - "requireAdminUser() guard on all lifecycle mutations"
    - "formatSupabaseInsertOrUpdateError() for 23505 slug-collision pt-BR message"

# Key files
key_files:
  created:
    - src/lib/courses/slugify.ts
    - src/lib/courses/slugify.test.ts
    - src/app/actions/upsert-course.test.ts
  modified:
    - src/lib/courses/schema.ts
    - src/lib/courses/queries.ts
    - src/lib/courses/queries.test.ts
    - src/app/actions/upsert-course.ts

# Decisions
decisions:
  - "slugify uses NFKD decompose + U+0300–U+036F strip (not transliteration library) — minimal, zero deps, covers all pt-BR characters"
  - "publishCourseSchema / archiveCourseSchema / unpublishCourseSchema are all aliases of the same z.object({ courseId: uuid }) schema — lifecycle operations share identical input shape"
  - "getAdminCourseList is a separate function (not a forAdmin flag) — cleaner call-site, avoids accidental misuse"
  - "Student filter applied at query layer (.not/.is) not application layer — prevents any over-fetch of draft/archived data"
  - "revalidateCoursePages extended to include /admin/cursos ahead of plan 02-05 — avoids stale cache when admin publishes/archives"

# Metrics
metrics:
  duration: "~25 minutes"
  completed: "2026-04-28"
  tasks_completed: 2
  files_changed: 7
---

# Phase 2 Plan 02: Course Lifecycle Utilities — slugify, lifecycle schemas, actions, and query filters

**One-liner:** NFKD slugify for pt-BR text + publishCourseAction/archiveCourseAction/unpublishCourseAction guarded by requireAdminUser() + student visibility filter on getAvailableCourses + admin-unfiltered getAdminCourseList.

## Tasks Completed

| Task | Name | Commit | Key files |
|------|------|--------|-----------|
| 1 | slugify utility + schema lifecycle extensions | 87c61df | slugify.ts, slugify.test.ts, schema.ts |
| 2a | Lifecycle actions + slug collision test | 8ad411c | upsert-course.ts, upsert-course.test.ts |
| 2b | Queries lifecycle filter + getAdminCourseList | 1eb81f9 | queries.ts, queries.test.ts |

## Test Results

- slugify.test.ts: 7/7 passing (ASCII, pt-BR diacritics, special chars, edge cases)
- schema.test.ts: 3/3 passing (existing tests unaffected)
- upsert-course.test.ts: 5/5 passing (slug collision 23505, admin guard, publish, archive, unpublish)
- queries.test.ts: 5/5 passing (2 existing + 3 new: filter verification, getAdminCourseList)

Total: 20 tests passing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated queries.test.ts mock chain for getAvailableCourses**
- **Found during:** Task 2b verification
- **Issue:** The existing test mock for `getAvailableCourses` used `{ select, order }` chaining only. After adding `.not("published_at","is",null).is("archived_at",null)` to the query, the mock threw `TypeError: supabase.from(...).select(...).not is not a function`
- **Fix:** Added `not: vi.fn().mockReturnThis()` and `is: vi.fn().mockReturnThis()` to the mock, and added 2 new test cases verifying the filter chain is called with correct arguments
- **Files modified:** src/lib/courses/queries.test.ts
- **Commit:** 1eb81f9

## Threat Model Compliance

All T-02 mitigations applied:
- **T-02-T1** (Elevation of Privilege): All three lifecycle actions call `requireAdminUser()` before any Supabase operation. Non-admin returns `{ success: false, message: "Voce nao tem permissao para gerenciar cursos." }`.
- **T-02-T2** (Information Disclosure - slug collision): `formatSupabaseInsertOrUpdateError()` catches `error.code === "23505"` and returns pt-BR message "Ja existe um curso com este slug. Escolha outro slug." — no stack trace serialized.
- **T-02-T4** (Information Disclosure - student visibility): `.not("published_at","is",null).is("archived_at",null)` applied at DB query layer in `getAvailableCourses`; `getAdminCourseList` intentionally unfiltered for admin use.

## Known Stubs

None — all functions are fully wired. `getAdminCourseList` returns real CourseRow data; will be consumed by plan 02-05 admin UI.

## Threat Flags

None — no new network endpoints introduced. All new server actions follow the existing `"use server"` + `requireAdminUser()` pattern. No new trust boundaries.

## Self-Check: PASSED

Files verified:
- src/lib/courses/slugify.ts: FOUND
- src/lib/courses/slugify.test.ts: FOUND
- src/lib/courses/schema.ts: FOUND (publishCourseSchema exported)
- src/lib/courses/queries.ts: FOUND (getAdminCourseList + student filter)
- src/app/actions/upsert-course.ts: FOUND (3 lifecycle actions)
- src/app/actions/upsert-course.test.ts: FOUND

Commits verified:
- 87c61df: feat(02-02): add slugify pt-BR utility (TDD) + lifecycle schemas
- 8ad411c: feat(02-02): add publishCourseAction/unpublishCourseAction/archiveCourseAction with 23505 slug-collision catch
- 1eb81f9: feat(02-02): extend getAvailableCourses with lifecycle filter; add getAdminCourseList
