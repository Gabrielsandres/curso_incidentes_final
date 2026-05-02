---
phase: 05-b2b-institution-manager
plan: 03
subsystem: data-layer
tags: [zod, supabase-queries, batched-progress, types, rls, admin-bypass, lib]

# Dependency graph
requires:
  - phase: 05-b2b-institution-manager
    provides: Plan 05-02 it.todo scaffolds at src/lib/institutions/queries.test.ts and schema.test.ts
  - phase: 01-foundation
    provides: institutions / institution_members / enrollments tables and RLS (migration 0013); profiles / lessons / modules / course_certificates tables; user_role enum (migration 0012)
provides:
  - Server-only data layer for the Phase 5 (B2B Institution Manager) surface
  - Composite TypeScript types for the gestor matrix + admin institution list
  - Zod schemas for institution CRUD + member management (7 schemas)
  - 4 query functions: getInstitutionForManager (RLS-respecting), getInstitutionMembersWithProgress (admin-bypass + 5-query batch), getInstitutionCertificates (admin-bypass), getAdminInstitutionList (server-client)
  - 33 passing unit tests (16 schema + 17 queries) with mocked Supabase chains
affects: [05-04, 05-05, 05-06, 05-07, 05-08]

# Tech tracking
tech-stack:
  added: []  # No new libraries; reuses zod, @supabase/supabase-js, vitest
  patterns:
    - "RLS-bypass via admin client with mandatory inline BYPASS JUSTIFICATION block (D-12 audit trail)"
    - ".nullish() instead of .optional().transform(?? null) for optional Supabase columns (B-4 fix)"
    - "5-query batched per-team progress matrix (no N+1) following getAvailableCourses analog"

key-files:
  created:
    - src/lib/institutions/types.ts
    - src/lib/institutions/schema.ts
    - src/lib/institutions/queries.ts
  modified:
    - src/lib/institutions/queries.test.ts
    - src/lib/institutions/schema.test.ts

key-decisions:
  - "Drop contact_phone from types/schema/queries: the institutions table (migration 0013) has no contact_phone column; including it would have produced a runtime select failure. Aligned with actual DB shape rather than adding a new migration outside this plan's scope."
  - "Mandatory non-optional adminClient parameter for getInstitutionMembersWithProgress and getInstitutionCertificates: makes the bypass intentional at the call site and forces the BYPASS JUSTIFICATION trail."
  - "Batched 5-query matrix verified end-to-end via mocked chains in queries.test.ts (members → enrollments → modules → lesson_progress → reduce); test asserts deleted-lesson exclusion + completionPercentage rounding + expired-enrollment visibility."

patterns-established:
  - "BYPASS JUSTIFICATION comment block: required verbatim block in any function that uses createSupabaseAdminClient or accepts an admin SupabaseClient parameter — references CLAUDE.md and PROJECT.md Concerns; checked by acceptance criteria grep."
  - "InstitutionMemberRole narrow union: institution_members.role is text in the DB (with CHECK constraint); the application layer narrows it to 'student'|'manager' via the InstitutionMemberRole type alias for safer downstream consumption."

requirements-completed: [INST-06, INST-07, INST-08]

# Metrics
duration: 8min
completed: 2026-05-02
---

# Phase 5 Plan 03: Institutions Data Layer Summary

**Server-only types + Zod schemas + 4 batched-query functions for the B2B institution manager surface, with the per-team progress matrix using 5 batched queries (no N+1) and admin-bypass functions carrying the verbatim D-12 audit trail.**

## Performance

- **Duration:** 8 min (effective work)
- **Started:** 2026-05-02T20:48:00Z (worktree created)
- **Completed:** 2026-05-02T20:56:00Z
- **Tasks:** 2 completed
- **Files modified:** 5 (3 created + 2 converted from scaffolds)

## Accomplishments

- Created `src/lib/institutions/{types,schema,queries}.ts` (574 lines of production code) implementing the full Phase 5 data layer: 8 exported types, 7 exported Zod schemas, 4 query functions.
- Converted Wave 0 it.todo scaffolds at `src/lib/institutions/{queries,schema}.test.ts` into 33 passing assertions covering INST-06 isolation, ENR-04 expired-enrollment visibility, completionPercentage rounding, deleted-lesson exclusion, and certificate ordering.
- Both admin-bypass query functions (`getInstitutionMembersWithProgress`, `getInstitutionCertificates`) carry the verbatim **BYPASS JUSTIFICATION** comment block referencing CLAUDE.md + PROJECT.md Concerns (per D-12).
- Adopted the **B-4 schema fix**: `contact_email` uses `z.preprocess(normalizeOptionalText, z.string().email().nullish())` instead of the fragile `.optional().transform(v => v ?? null)` chain previously seen in `courses/schema.ts` `description`.

## Task Commits

Each task was committed atomically:

1. **Task 1: types + schema + schema.test conversion** — `0bdc5fd` (feat)
2. **Task 2: queries (4 functions) + queries.test conversion** — `63ea1dc` (feat)

_Final docs commit (this SUMMARY) tracked separately by orchestrator._

## Files Created

- `src/lib/institutions/types.ts` (68 lines) — `InstitutionRow`, `InstitutionInsert`, `InstitutionUpdate`, `InstitutionMemberRow`, `InstitutionMemberRole` (narrowed text union), `InstitutionWithStats` (admin list augmented with memberCount + hasManager), `InstitutionMemberWithProfile`, `MatrixCell`, `InstitutionMemberWithProgress`, `InstitutionCertificateRow`.
- `src/lib/institutions/schema.ts` (101 lines) — 7 Zod schemas with pt-BR error messages: `createInstitutionSchema`, `updateInstitutionSchema`, `attachMemberSchema`, `inviteMemberSchema`, `promoteManagerSchema`, `demoteManagerSchema` (alias), `detachMemberSchema` (alias). Uses `slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/`.
- `src/lib/institutions/queries.ts` (405 lines) — 4 server-only data-access functions:
  - `getInstitutionForManager(client?, userId)` — RLS-respecting, returns the institution where user has role='manager'; null on orphan.
  - `getInstitutionMembersWithProgress(adminClient, institutionId)` — 5 batched queries (members → enrollments → modules+lessons → lesson_progress → reduce); admin bypass with verbatim BYPASS JUSTIFICATION block.
  - `getInstitutionCertificates(adminClient, institutionId)` — 2 batched queries; admin bypass; ordered by `issued_at DESC`.
  - `getAdminInstitutionList(client?)` — server client; returns `InstitutionWithStats[]` with memberCount + hasManager flags.

## Files Modified

- `src/lib/institutions/queries.test.ts` (52 → 592 lines) — 12 it.todos converted to 17 passing assertions, including chain factories that mirror the actual Supabase query builder shape.
- `src/lib/institutions/schema.test.ts` (57 → 235 lines) — 18 it.todos converted to 16 passing assertions (a few logically merged because they assert the same data shape, e.g., demoteManagerSchema and detachMemberSchema sanity checks).

## Test Results

```
src/lib/institutions/schema.test.ts   16 tests passing
src/lib/institutions/queries.test.ts  17 tests passing
                                      ----
                                      33 tests passing  (0 todo, 0 skipped)
```

Full repo run (`npm run test:ci`):
- 29 test files passed
- 170 tests passing (+33 from this plan)
- 39 todo (todos belong to **other** plans in Phase 5: 05-04 middleware, 05-05/06 server actions, 05-07/08 admin pages — not in scope for 05-03)
- 0 failing

## Verification

- `npm run typecheck` — exits 0
- `npm run lint` — exits 0 (zero warnings, zero errors; `--max-warnings=0` policy honored)
- `npx vitest run src/lib/institutions/` — 33/33 passing
- `npm run test:ci` — 170 passing, 39 todo, 0 failing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Removed `contact_phone` from types/schema/queries**

- **Found during:** Task 1 read-first phase (cross-referencing plan interfaces against `src/lib/database.types.ts` and `supabase/migrations/0013_institutions_enrollments.sql`).
- **Issue:** Plan 05-03 `<interfaces>` block (line 92) declared `contact_phone: string | null` on the institutions Row, and Task 1 specified including `contact_phone` in `baseInstitutionSchema`, types, and the `select()` clauses of `getInstitutionForManager` + `getAdminInstitutionList`. However, the production schema (migration 0013, lines 60–67) creates `institutions(id, name, slug, contact_email, created_at, updated_at)` — there is no `contact_phone` column. `database.types.ts` lines 446–471 confirm the absence. Including `contact_phone` would have produced a Postgres error at runtime ("column institutions.contact_phone does not exist") on every Phase 5 read.
- **Fix:** Dropped `contact_phone` from `types.ts` (`InstitutionRow` already typed via `Database`), from `schema.ts` (no `contact_phone` field on `baseInstitutionSchema`), and from `queries.ts` `select()` clauses. The plan's `truths` line about 7 Zod schemas is preserved (still 7); types still mirror the actual DB shape via `Database["public"]["Tables"]["institutions"]["Row"]`.
- **Files modified:** `src/lib/institutions/types.ts`, `src/lib/institutions/schema.ts`, `src/lib/institutions/queries.ts`, `src/lib/institutions/schema.test.ts` (test for `contact_phone` not written; was not a required it.todo in the Wave 0 scaffold).
- **Commit:** `0bdc5fd` (Task 1) and `63ea1dc` (Task 2 — kept queries aligned).
- **Forward note:** if Phase 5 UI later needs a phone column, the right path is a new migration (e.g., `0016_add_institutions_contact_phone.sql`) + regenerated `database.types.ts` + extension of `baseInstitutionSchema`. Captured as **deferred-item** below.
- **Architectural alternative considered (Rule 4):** adding migration 0016 in this plan was rejected because (a) operator already had to apply 0015 mid-phase (per init context), introducing another mid-phase migration adds operator burden, and (b) UI-SPEC §Copywriting Contract for the institution form does not yet require a phone field on the v1 manager surface. Adding the column can ride a future contact-detail enrichment plan.

## Deferred Items

- **Add `contact_phone` column to institutions table** if UI-SPEC ever requires it. Path: new migration `0016_*.sql` + regenerate `database.types.ts` + extend `baseInstitutionSchema` with `contact_phone: z.preprocess(normalizeOptionalText, z.string().nullish())`.

## Threat Surface Scan

No new security-relevant surface beyond what the plan's `<threat_model>` covers. The two admin-bypass functions (`getInstitutionMembersWithProgress`, `getInstitutionCertificates`) are flagged inline with BYPASS JUSTIFICATION blocks per T-05-03-01 mitigation. Explicit `.eq("institution_id", institutionId)` is the first filter in both functions, scoping the bypass to the institution whose members the manager is authorized to see.

No new threat flags discovered.

## Unblocks

This plan unblocks the following downstream plans:

- **05-04** — middleware GESTOR_ROUTES integration (consumes `getInstitutionForManager`)
- **05-05** — server actions (`upsert-institution`, `attach-institution-member`, `promote-institution-manager`, `detach-institution-member`) — all import schemas from `@/lib/institutions/schema`
- **05-07** — `/admin/instituicoes` admin pages (consume `getAdminInstitutionList`)
- **05-08** — `/gestor` manager dashboard (consumes `getInstitutionForManager` + `getInstitutionMembersWithProgress` + `getInstitutionCertificates`)

## Self-Check: PASSED

Verified all claims before marking complete:

- `src/lib/institutions/types.ts` — FOUND (68 lines, 10 exports)
- `src/lib/institutions/schema.ts` — FOUND (101 lines, 7 exported schemas)
- `src/lib/institutions/queries.ts` — FOUND (405 lines, 4 exported functions)
- `src/lib/institutions/queries.test.ts` — FOUND (592 lines, 17 passing tests, 0 it.todo)
- `src/lib/institutions/schema.test.ts` — FOUND (235 lines, 16 passing tests, 0 it.todo)
- Commit `0bdc5fd` — FOUND in `git log`
- Commit `63ea1dc` — FOUND in `git log`
- BYPASS JUSTIFICATION block count: 2 (matches plan acceptance criteria) — VERIFIED via `grep -c "BYPASS JUSTIFICATION" src/lib/institutions/queries.ts`
- `getInstitutionForManager` does NOT import `createSupabaseAdminClient` — VERIFIED (file does not import that symbol at all; admin bypass is via the caller-supplied `adminClient` parameter)
- `npm run typecheck` — exits 0
- `npm run lint` — exits 0
- `npx vitest run src/lib/institutions/` — 33/33 passing
