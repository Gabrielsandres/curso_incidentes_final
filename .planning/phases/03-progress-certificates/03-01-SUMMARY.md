---
phase: 03-progress-certificates
plan: "01"
subsystem: data-layer
tags: [tdd, progress, soft-delete, queries, types]
dependency_graph:
  requires: []
  provides:
    - ProgressStats.nextLessonId
    - computeNextLessonId
    - getAvailableCourses-soft-delete-filter
  affects:
    - src/app/dashboard/page.tsx
    - src/lib/courses/queries.ts
    - src/lib/courses/types.ts
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN cycle
    - computeNextLessonId helper (sort by module.position, lesson.position)
    - deleted_at in-memory filter on CourseSummaryQueryResult
key_files:
  created: []
  modified:
    - src/lib/courses/types.ts
    - src/lib/courses/queries.ts
    - src/lib/courses/queries.test.ts
decisions:
  - "nextLessonId: null when completedLessons === 0 (D-05 guard) — avoids false resume on courses never started"
  - "computeNextLessonId helper takes modules array + progressMap for pure in-memory sort without extra DB round-trip"
  - "getLessonWithCourseContext injects nextLessonId: null explicitly to satisfy updated ProgressStats type without runtime cost"
  - "Test helper typed as ModuleFixture with deleted_at: string | null to allow mixed fixture arrays"
metrics:
  duration: "~12 min"
  completed: "2026-04-30"
  tasks_completed: 2
  files_changed: 3
requirements:
  - PROG-01
  - PROG-02
  - PROG-03
  - CERT-05
---

# Phase 03 Plan 01: Data Layer — nextLessonId and Soft-Delete Filter Summary

**One-liner:** Extended `ProgressStats` with `nextLessonId: string | null` and added `computeNextLessonId` helper that sorts by `(module.position ASC, lesson.position ASC)` while filtering soft-deleted lessons from both the totalLessons denominator and the next-lesson computation (D-12 fix).

## What Was Built

### types.ts
- Added `nextLessonId: string | null` as fourth field to `ProgressStats`
- `CourseSummary = CourseRow & ProgressStats` automatically gains the field via intersection

### queries.ts
- `CourseSummaryQueryResult` extended: modules gain `position`, lessons gain `position` and `deleted_at`
- `buildProgressStats` updated with optional third parameter `nextLessonId: string | null = null`
- New `computeNextLessonId` helper: sorts modules and active lessons by position, returns first lesson not in progressMap as COMPLETED (or null if all complete)
- `getAvailableCourses` Supabase select updated to fetch `position` and `deleted_at` on both modules and lessons
- `lessonsByCourse` map now filters `!lesson.deleted_at` before collecting lesson IDs (D-12 fix)
- `nextLessonId` computed: `null` when `completedLessons === 0`, otherwise via `computeNextLessonId`
- `getLessonWithCourseContext` return adds `nextLessonId: null` to course spread (type cascade fix)

### queries.test.ts
- New `describe("getAvailableCourses — nextLessonId and deleted_at filter")` block with 5 tests:
  - Teste A: `nextLessonId` null when no progress (`completedLessons === 0`)
  - Teste B: `nextLessonId` = first incomplete lesson UUID ordered by position
  - Teste C: `nextLessonId` null when 100% complete
  - Teste D: soft-deleted lessons excluded from `totalLessons` count
  - Teste E: soft-deleted lessons never returned as `nextLessonId`

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test) | `50378f1` | PASSED — 5 new tests failed as expected before implementation |
| GREEN (feat) | `7429b02` | PASSED — all 11 tests pass after implementation |
| REFACTOR | N/A | Not needed — code was clean on first pass |

## Verification Results

| Check | Result |
|-------|--------|
| `npx vitest run src/lib/courses/queries.test.ts` | 11/11 passed |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `grep nextLessonId src/lib/courses/types.ts` | line 16: `nextLessonId: string \| null` |
| `grep "nextLessonId: null" src/lib/courses/queries.ts` | line 458 (getLessonWithCourseContext) |
| `grep deleted_at src/lib/courses/queries.ts` | filter present in lessonsByCourse map (line 167) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error on test helper — deleted_at type mismatch**
- **Found during:** Task 2 (typecheck after GREEN implementation)
- **Issue:** `makeAvailableCoursesClient` parameter was typed as `typeof standardModules` which inferred `deleted_at: null` (literal null), causing TS2345 when passing fixtures with `deleted_at: "2026-01-01T..."` (string)
- **Fix:** Extracted explicit `ModuleFixture` type alias with `deleted_at: string | null` and used it as the parameter type
- **Files modified:** `src/lib/courses/queries.test.ts`
- **Commit:** Included in `7429b02` (GREEN commit)

## Known Stubs

None — all fields are computed from real DB data via the existing query infrastructure.

## Threat Flags

None — `nextLessonId` is derived from the student's own enrolled course data, already restricted by RLS via `.not("published_at","is",null).is("archived_at",null)`. No new trust boundary introduced.

## Self-Check: PASSED

- [x] `src/lib/courses/types.ts` modified — confirmed by git log `7429b02`
- [x] `src/lib/courses/queries.ts` modified — confirmed by git log `7429b02`
- [x] `src/lib/courses/queries.test.ts` modified — confirmed by git log `50378f1` + `7429b02`
- [x] RED commit `50378f1` exists in git log
- [x] GREEN commit `7429b02` exists in git log
- [x] All 11 tests pass
- [x] TypeScript typecheck exits 0
- [x] ESLint exits 0
