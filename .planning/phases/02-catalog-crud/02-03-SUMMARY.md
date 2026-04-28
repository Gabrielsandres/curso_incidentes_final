---
phase: 02-catalog-crud
plan: "03"
subsystem: courses
tags: [modules, lessons, soft-delete, reorder, tdd, actions, pt-BR]

# Dependency graph
requires:
  - "02-01: Migration 0014 — modules.deleted_at + lessons.deleted_at columns"
  - "02-02: getAdminCourseList + student lifecycle filter in getAvailableCourses"
provides:
  - "updateModuleAction / deleteModuleAction / reorderModuleAction in update-module.ts"
  - "updateLessonAction / deleteLessonAction / restoreLessonAction / reorderLessonAction in update-lesson.ts"
  - "updateModuleSchema / deleteModuleSchema / reorderModuleSchema in modules/schema.ts"
  - "updateLessonSchema / deleteLessonSchema / restoreLessonSchema / reorderLessonSchema in lessons/schema.ts"
  - "getCourseWithContent now filters soft-deleted modules and lessons (T-02-T3 mitigation)"
affects:
  - "src/app/curso/[slug] — soft-deleted modules/lessons no longer visible to students"
  - "src/app/admin/cursos (plan 02-05) — will call deleteModuleAction, reorderModuleAction, etc."

# Tech stack
tech_stack:
  added: []
  patterns:
    - "Soft delete via UPDATE deleted_at=now() — no hard DELETE, preserves lesson_progress FK integrity"
    - "Restore via UPDATE deleted_at=null (restoreLessonAction)"
    - "Sequential position swap (two UPDATEs) for reorder — T-02-T6 accepted low-severity"
    - "Neighbor lookup with .is('deleted_at', null) to skip soft-deleted items in reorder"
    - "Post-query JS filter on getCourseWithContent for student path (not RLS policy)"
    - "z.preprocess null-guard for optional string fields from FormData (null → undefined)"

# Key files
key_files:
  created:
    - src/app/actions/update-module.ts
    - src/app/actions/update-lesson.ts
    - src/app/actions/manage-module.test.ts
    - src/app/actions/manage-lesson.test.ts
  modified:
    - src/lib/modules/schema.ts
    - src/lib/lessons/schema.ts
    - src/lib/courses/queries.ts
    - src/lib/courses/queries.test.ts

# Decisions
decisions:
  - "Soft delete uses UPDATE deleted_at=now() — hard DELETE would orphan lesson_progress rows and break certificate eligibility history"
  - "Restore only on lessons (not modules) per CAT-03 scope — module restore deferred to admin UI plan 02-05"
  - "Reorder swap is two sequential UPDATEs (not atomic) — T-02-T6 accepted at low severity; cosmetic-only risk, no UNIQUE constraint on position"
  - "Student path filter applied as JS post-query filter (not nested .is() Supabase filter) — RESEARCH Q3 recommended this; simpler, avoids complex nested RPC in Supabase chained select"
  - "Optional description/videoProvider/videoExternalId fields use z.preprocess null-guard — FormData.get() returns null for missing fields, Zod .optional() only handles undefined"

# Metrics
metrics:
  duration: "~30 minutes"
  completed: "2026-04-28"
  tasks_completed: 2
  files_changed: 8
---

# Phase 2 Plan 03: Module and Lesson CRUD — soft-delete, restore, reorder, and student-path filter

**One-liner:** Module/lesson soft-delete+reorder actions with requireAdminUser() guard, restoreLessonAction setting deleted_at=null, and getCourseWithContent JS filter excluding soft-deleted items from the student player.

## Tasks Completed

| Task | Name | Commit | Key files |
|------|------|--------|-----------|
| 1 (RED) | Extend module + lesson schemas + write failing tests | 0755971 | modules/schema.ts, lessons/schema.ts, manage-module.test.ts, manage-lesson.test.ts |
| 2 (GREEN) | Implement actions + soft-delete filter in getCourseWithContent | 0a003e1 | update-module.ts, update-lesson.ts, queries.ts, queries.test.ts |

## Test Results

- manage-module.test.ts: 4/4 passing (non-admin guard, updateModule success, deleteModule soft-delete, reorderModule swap)
- manage-lesson.test.ts: 4/4 passing (non-admin guard, deleteLesson soft-delete+message, restoreLesson, reorderLesson swap)
- queries.test.ts: 6/6 passing (5 existing + 1 new T-02-T3 filter test)
- Full suite: 61/61 passing across 15 test files

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed null-handling for optional string fields in updateModuleSchema and updateLessonSchema**
- **Found during:** Task 2 GREEN phase — first test run after creating update-module.ts
- **Issue:** `FormData.get('description')` returns `null` when the field is not set. The planned schema used `z.string().trim().optional()` which only accepts `undefined` for the optional case — passing `null` caused a Zod `invalid_type` error, triggering "Revise os dados informados." instead of reaching the admin guard check.
- **Fix:** Wrapped optional string fields in `z.preprocess((v) => (v === null || v === undefined ? undefined : v), ...)` so that both `null` and `undefined` inputs are treated as absent. Extracted a `nullableOptionalString` helper in lessons/schema.ts to avoid repetition.
- **Files modified:** src/lib/modules/schema.ts, src/lib/lessons/schema.ts
- **Commit:** 0a003e1

## Threat Model Compliance

- **T-02-T1** (Elevation of Privilege): All 7 actions call `requireAdminUser()` as the first async op after schema parse. Non-admin returns `{ success: false, message: "Você não tem permissão para gerenciar módulos/aulas." }`.
- **T-02-T3** (Information Disclosure — student player): `getCourseWithContent` applies `.filter((m) => !m.deleted_at)` on modules and `.filter((l) => !l.deleted_at)` on lessons before returning to student path. Test in queries.test.ts verifies both filters.
- **T-02-T6** (Tampering — position swap): Accepted low severity. Two sequential UPDATEs in app layer. Neighbor lookup uses `.is("deleted_at", null)` to skip soft-deleted items. No UNIQUE constraint on position (intentional).

## Known Stubs

None — all actions are fully wired with real Supabase queries. The admin UI that calls these actions is deferred to plan 02-05.

## Threat Flags

None — no new network endpoints. All mutations go through `"use server"` actions with `requireAdminUser()`. No new trust boundaries introduced.

## Self-Check: PASSED

Files verified:
- src/app/actions/update-module.ts: FOUND (updateModuleAction, deleteModuleAction, reorderModuleAction)
- src/app/actions/update-lesson.ts: FOUND (updateLessonAction, deleteLessonAction, restoreLessonAction, reorderLessonAction)
- src/app/actions/manage-module.test.ts: FOUND
- src/app/actions/manage-lesson.test.ts: FOUND
- src/lib/modules/schema.ts: FOUND (updateModuleSchema, deleteModuleSchema, reorderModuleSchema)
- src/lib/lessons/schema.ts: FOUND (updateLessonSchema, deleteLessonSchema, restoreLessonSchema, reorderLessonSchema)
- src/lib/courses/queries.ts: FOUND (deleted_at filter applied)
- src/lib/courses/queries.test.ts: FOUND (T-02-T3 filter test added)

Commits verified:
- 0755971: feat(02-03): add module/lesson update/remove/restore/reorder schemas + RED tests
- 0a003e1: feat(02-03): implement update-module/lesson actions, soft-delete filter in getCourseWithContent (TDD GREEN)
