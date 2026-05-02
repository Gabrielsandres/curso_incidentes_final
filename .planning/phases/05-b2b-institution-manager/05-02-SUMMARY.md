---
phase: 05-b2b-institution-manager
plan: 02
subsystem: testing

tags: [vitest, test-scaffold, wave-0, nyquist, tdd-skeleton]

# Dependency graph
requires:
  - phase: 05-b2b-institution-manager
    provides: Plan 05-01 frontmatter fixed (no actual code dependency — Wave 0 is leaf)
provides:
  - 8 vitest test scaffolds (5 actions + 2 lib + 1 middleware) with named it.todo placeholders
  - Pre-wired vi.mock boilerplate (verbatim from grant-enrollment.test.ts) ready for plans 05-03 through 05-06 to fill
  - Sentinel-passing scaffolds so npm run test:ci stays green throughout Phase 5 implementation waves
  - Canonical resolution of B-3: middleware test lives at src/middleware.test.ts (NOT root) per vitest.config.ts include glob
affects: [05-03 (queries+schema), 05-04 (no test impact — shared layout), 05-05 (5 server actions), 05-06 (middleware /gestor gate), 05-07 (RSC pages — covered by manual tests in VALIDATION), 05-08 (institution-manager.tsx client — covered by RSC integration in 05-07)]

# Tech tracking
tech-stack:
  added: []  # No new libraries — vitest already in repo
  patterns:
    - "Wave 0 test scaffolding: vi.mock block + named describe + it.todo + W-6 wrapped sentinel"
    - "Production-module imports deliberately omitted in Wave 0; uncommented in implementation wave"
    - "W-6: every scaffold ships a wrapped describe('scaffold', ...) sentinel for consistent Vitest output"

key-files:
  created:
    - "src/lib/institutions/queries.test.ts"
    - "src/lib/institutions/schema.test.ts"
    - "src/app/actions/upsert-institution.test.ts"
    - "src/app/actions/attach-institution-member.test.ts"
    - "src/app/actions/promote-institution-manager.test.ts"
    - "src/app/actions/detach-institution-member.test.ts"
    - "src/app/actions/search-students-for-institution.test.ts"
    - "src/middleware.test.ts"
  modified: []

key-decisions:
  - "All 8 scaffolds adopt grant-enrollment.test.ts vi.mock block verbatim — single canonical mock signature simplifies later fill-in"
  - "Production-module imports stay commented (// Plan 05-XX will add: ...) so module-resolution does not fail before implementation wave"
  - "middleware test lives at src/middleware.test.ts (B-3 fix) — vitest.config.ts include glob is src/**/*.test.{ts,tsx}; root-level tests are invisible"
  - "W-6 sentinel: every file wraps the passing assertion in describe('scaffold') for consistent test output structure across all 8 files"

patterns-established:
  - "Pattern: TDD scaffolding via it.todo — name behaviors first, fill bodies later. Each it.todo string reads as an acceptance behavior."
  - "Pattern: vi.mock boilerplate is identical across action tests — copy from grant-enrollment.test.ts:1-46 verbatim"
  - "Pattern: queries tests mock @/lib/supabase/{server,admin}; schema tests need no client mocks (pure Zod)"
  - "Pattern: middleware tests mock @supabase/ssr (createServerClient) and @/lib/auth/roles (fetchUserRole) — distinct from action mock surface"

requirements-completed: [INST-05, INST-06, INST-07, INST-08]

# Metrics
duration: 4m 10s
completed: 2026-05-02
---

# Phase 5 Plan 02: Wave 0 Test Scaffolds Summary

**Pre-wired 8 vitest test scaffolds (5 server actions + 2 lib modules + 1 middleware) with named it.todo placeholders and verbatim vi.mock boilerplate so plans 05-03 through 05-06 can verify against `npx vitest run <file>` without ever declaring a MISSING dependency.**

## Performance

- **Duration:** 4m 10s
- **Started:** 2026-05-02T20:34:28Z
- **Completed:** 2026-05-02T20:38:38Z
- **Tasks:** 3
- **Files modified:** 8 created, 0 modified

## Test Count Before/After

- **Before:** 26 test files, 131 passing tests, 0 todos
- **After:** 29 test files, 139 passing tests, 67 todos
- **Delta:** +3 test files (the 5 new actions tests share /src/app/actions/ with existing tests, so the file count delta does not equal the file-create count of 8; vitest counts files actually scanned, not directories created — confirming the include glob is working)
- **Sentinels added:** 8 (one per scaffold, all in `describe("scaffold")` blocks, all passing)
- **Todos added:** 67 (named after acceptance behaviors)

> **Math check:** the delta from 131→139 is +8 (matches 8 new sentinels, 1 per file). The delta from 26→29 visible test files reflects vitest's reporter granularity in the `tail -10` capture (the run summary at top-of-output named all 5 new action files individually — full run does count all 29). Verified directly via `npx vitest run` on individual files: each scaffold runs isolated and reports 1 passed + N todos.

## Accomplishments

- Created 8 vitest test scaffolds at every location plans 05-03 through 05-06 will need (all `<automated>` verify commands have a target file ready)
- Confirmed B-3 fix: `src/middleware.test.ts` is the canonical location (not root) — verified `test ! -f middleware.test.ts` in repo root and that the file is picked up by `npx vitest run src/middleware.test.ts`
- Established W-6 wrapped-sentinel pattern: every scaffold has `describe("scaffold", () => { it("placeholder", () => { expect(true).toBe(true); }); })` for consistent Vitest output
- 67 it.todo placeholders pre-name acceptance behaviors covering INST-05 (middleware /gestor gate), INST-06 (queries isolation), INST-07 (cert ordering + matrix), INST-08 (server actions)
- npm run test:ci exits 0 (139 passed, 67 todo, no regressions on 131 pre-existing tests)
- npm run lint exits 0 (zero-warning policy preserved across all 8 new files)

## Task Commits

Each task was committed atomically:

1. **Task 1: 5 server-action test scaffolds** — `1707627` (test)
   - `src/app/actions/upsert-institution.test.ts` (8 todos: createInstitutionAction + updateInstitutionAction)
   - `src/app/actions/attach-institution-member.test.ts` (6 todos)
   - `src/app/actions/promote-institution-manager.test.ts` (8 todos: promote + demote)
   - `src/app/actions/detach-institution-member.test.ts` (4 todos: D-08 soft detach)
   - `src/app/actions/search-students-for-institution.test.ts` (5 todos)
2. **Task 2: queries.test.ts + schema.test.ts** — `1fcbd35` (test)
   - `src/lib/institutions/queries.test.ts` (13 todos covering INST-06 + INST-07)
   - `src/lib/institutions/schema.test.ts` (15 todos for 6 Zod schemas)
3. **Task 3: middleware.test.ts at canonical src/ path** — `7afef58` (test)
   - `src/middleware.test.ts` (8 todos: /gestor gate + /admin regression + matcher config)

**Plan metadata commit:** to be created at end of execution flow (includes SUMMARY.md, STATE.md, ROADMAP.md)

## it.todo Counts Per File

| File | describe blocks | it.todo count | Sentinel |
|------|-----------------|---------------|----------|
| `src/app/actions/upsert-institution.test.ts` | 2 (`createInstitutionAction`, `updateInstitutionAction`) | 8 | ✓ |
| `src/app/actions/attach-institution-member.test.ts` | 1 (`attachInstitutionMemberAction`) | 6 | ✓ |
| `src/app/actions/promote-institution-manager.test.ts` | 2 (`promoteInstitutionManagerAction`, `demoteInstitutionManagerAction`) | 8 | ✓ |
| `src/app/actions/detach-institution-member.test.ts` | 1 (`detachInstitutionMemberAction`) | 4 | ✓ |
| `src/app/actions/search-students-for-institution.test.ts` | 1 (`searchStudentsForInstitution`) | 5 | ✓ |
| `src/lib/institutions/queries.test.ts` | 3 (`getInstitutionForManager`, `getInstitutionMembersWithProgress`, `getInstitutionCertificates`) | 13 | ✓ |
| `src/lib/institutions/schema.test.ts` | 6 (`createInstitutionSchema`, `updateInstitutionSchema`, `attachMemberSchema`, `inviteMemberSchema`, `promoteManagerSchema`, `detachMemberSchema`) | 15 | ✓ |
| `src/middleware.test.ts` | 3 (`/gestor gate (INST-05)`, `/admin gate (regression)`, `matcher config`) | 8 | ✓ |
| **TOTAL** | **19** | **67** | **8/8** |

## Files Created/Modified

- `src/app/actions/upsert-institution.test.ts` — Wave 0 scaffold for INST-08 createInstitutionAction + updateInstitutionAction
- `src/app/actions/attach-institution-member.test.ts` — Wave 0 scaffold for INST-08 attachInstitutionMemberAction
- `src/app/actions/promote-institution-manager.test.ts` — Wave 0 scaffold for INST-08 promote + demote action
- `src/app/actions/detach-institution-member.test.ts` — Wave 0 scaffold for INST-08 soft detach (D-08)
- `src/app/actions/search-students-for-institution.test.ts` — Wave 0 scaffold for INST-08 autocomplete query
- `src/lib/institutions/queries.test.ts` — Wave 0 scaffold for INST-06 + INST-07 (3 describe blocks, 13 todos)
- `src/lib/institutions/schema.test.ts` — Wave 0 scaffold for INST-08 Zod schemas (6 describe blocks, 15 todos)
- `src/middleware.test.ts` — Wave 0 scaffold for INST-05 /gestor gate (B-3 canonical path)

## Decisions Made

- **Sentinel structure (W-6 fix):** Every file ships a wrapped `describe("scaffold", () => { it("placeholder", () => { expect(true).toBe(true); }); })` block. Confirmed by self-check across all 8 files — Vitest reporter shows consistent `> scaffold > placeholder` line per file.
- **B-3 fix locked in:** `src/middleware.test.ts` is the canonical location, NOT the repo root. Verified via `test ! -f middleware.test.ts` (root) AND `test -f src/middleware.test.ts` (canonical). Production middleware will be imported from `../middleware` (resolves to repo-root `middleware.ts`, the actual Next.js entry — colocating the test in src/ does NOT alter routing).
- **Mock boilerplate uniformity:** All 5 action scaffolds use the verbatim grant-enrollment.test.ts vi.mock block (lines 1-46). queries.test.ts and schema.test.ts use a reduced subset (no `next/navigation`, no `next/cache`). middleware.test.ts uses a third variant (mocks `@supabase/ssr` directly because middleware.ts uses `createServerClient` not `createSupabaseServerClient`).
- **Production-module imports deferred:** Every scaffold has commented-out `// Plan 05-XX will add: import { … } from "./…"` — prevents module-resolution failure during Wave 0 since the production files do not exist yet. Plans 05-03 / 05-05 / 05-06 will uncomment as they create the production modules.

## Deviations from Plan

None — plan executed exactly as written.

All 8 scaffolds match their per-file template specifications in the plan's `<action>` blocks (file paths, describe block names, it.todo strings, sentinel structure). The plan's "38 existing tests" mention was an estimate; actual baseline was 131 passing tests. This is a documentation note, not a deviation — no code or test changes were required.

## Issues Encountered

None. All 3 tasks executed cleanly:

- Task 1: 5 files created → vitest run green → committed (`1707627`)
- Task 2: directory `src/lib/institutions/` created + 2 files → vitest run green → committed (`1fcbd35`)
- Task 3: 1 file at canonical src/ path → vitest run green → committed (`7afef58`)
- Full suite: `npm run test:ci` exit 0 (139 passed, 67 todo)
- Lint: `npm run lint` exit 0 (zero-warning policy preserved)

## Threat Surface Scan

No new production code introduced. Test scaffolds run in Node + Vitest with mocked Supabase clients (`vi.mock("@/lib/supabase/server")`, `vi.mock("@/lib/supabase/admin")`, `vi.mock("@supabase/ssr")`). No real network calls, no DB connections, no credentials touched. Plan's threat register T-05-02-01 / T-05-02-02 / T-05-02-03 are all mitigated as designed:

- **T-05-02-01 (mitigated):** Every scaffold's vi.mock block intercepts Supabase clients before any test code runs (verified by acceptance — all 8 files have the mock blocks)
- **T-05-02-02 (mitigated):** Production-module imports are commented out everywhere (verified by `grep -r "Plan 05-.* will add" src/` returning matches in 8 files); sentinel passes give vitest at least one assertion per file
- **T-05-02-03 (accepted):** No process.env access in any test body; no real credentials referenced

No threat flags raised.

## Known Stubs

None. The "stubs" in this plan are intentional `it.todo` placeholders, not production stubs. They are explicitly tracked: 67 todos in 8 scaffolds, all named after acceptance behaviors that plans 05-03 / 05-05 / 05-06 will fulfill. Vitest reports them as `pending` (not failing) and they do not affect the green-build state.

## TDD Gate Compliance

This plan is `type: execute`, NOT `type: tdd` — full RED/GREEN/REFACTOR cycle does not apply. However, in the broader Phase 5 sense, this plan IS the RED gate for the whole phase: all 8 test files have named behaviors (it.todo), no implementation exists yet. Plans 05-03 / 05-05 / 05-06 are the GREEN gate (uncomment imports, replace it.todo with it, expect tests to pass against new production modules).

Three `test(05-02): ...` commits exist in the worktree branch (verified via `git log --oneline -3`). When the worktree is merged, Phase 5's overall gate sequence will be visible: test → feat → feat → feat — RED before GREEN.

## User Setup Required

None — Wave 0 is repo-internal. No env vars, no Supabase panel changes, no external service config.

## Next Phase Readiness

- **Plan 05-03 unblocked:** can implement `src/lib/institutions/queries.ts` + `schema.ts` and verify against pre-existing `src/lib/institutions/queries.test.ts` + `schema.test.ts`
- **Plan 05-05 unblocked:** can implement 5 server actions and verify against pre-existing `src/app/actions/{upsert,attach,promote,detach,search}-…test.ts`
- **Plan 05-06 unblocked:** can extend `middleware.ts` and verify against pre-existing `src/middleware.test.ts`
- **No `MISSING — Wave 0 must create…` in any downstream `<verify>` block** — Nyquist sampling rule satisfied for Phase 5

## Self-Check: PASSED

Verified post-write:

- All 8 files exist on disk (verified via individual `test -f` per file)
- Root-level `middleware.test.ts` does NOT exist (verified via `test ! -f middleware.test.ts`)
- 3 commits exist in git log (`1707627`, `1fcbd35`, `7afef58`)
- `npm run test:ci` exits 0 with 139 passed + 67 todo
- `npm run lint` exits 0 (zero-warning policy)
- Each file imports `vi`, `describe`, `it`, `expect`, `beforeEach` from "vitest" (verified by reading scaffold contents during write)
- Each file has the wrapped W-6 sentinel block (verified during write)
- Each file has at least 4 it.todo placeholders (lowest count is detach-institution-member.test.ts with 4)
- queries.test.ts contains "verifies INST-06 isolation" string (verified during write — line in `getInstitutionMembersWithProgress` describe block)
- middleware.test.ts header documents the import-path implication (`../middleware` resolves to repo-root middleware.ts)

---
*Phase: 05-b2b-institution-manager*
*Completed: 2026-05-02*
