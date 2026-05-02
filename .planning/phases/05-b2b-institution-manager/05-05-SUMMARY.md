---
phase: 05-b2b-institution-manager
plan: 05
subsystem: server-actions
tags: [server-actions, rpc, admin-gate, zod-parse, sentry, vitest, atomic-promote, soft-detach]
requires: [05-01, 05-03]
provides:
  - createInstitutionAction
  - updateInstitutionAction
  - attachInstitutionMemberAction
  - detachInstitutionMemberAction (soft — D-08)
  - promoteInstitutionManagerAction (RPC-atomic — D-07)
  - demoteInstitutionManagerAction (RPC-atomic — D-07)
  - searchStudentsForInstitution
affects:
  - .planning/phases/05-b2b-institution-manager/05-07-PLAN.md (admin UI now bindable)
tech-stack:
  added: []
  patterns:
    - "Server Actions over API routes (CLAUDE.md preference)"
    - "Zod-first validation with safeParse + flatten().fieldErrors"
    - "requireAdminUser helper (server-side role lookup, never trust FormData)"
    - "RPC delegation for atomic role-flip transactions (Pitfall 3)"
    - "trip-wire admin client mock to prove negative contracts (D-08 soft-detach test)"
key-files:
  created:
    - src/app/actions/upsert-institution.ts
    - src/app/actions/upsert-institution-state.ts
    - src/app/actions/attach-institution-member.ts
    - src/app/actions/attach-institution-member-state.ts
    - src/app/actions/detach-institution-member.ts
    - src/app/actions/detach-institution-member-state.ts
    - src/app/actions/promote-institution-manager.ts
    - src/app/actions/promote-institution-manager-state.ts
    - src/app/actions/search-students-for-institution.ts
  modified:
    - src/app/actions/upsert-institution.test.ts (Wave 0 scaffold → 8 passing tests)
    - src/app/actions/attach-institution-member.test.ts (scaffold → 6 passing tests)
    - src/app/actions/detach-institution-member.test.ts (scaffold → 4 passing tests)
    - src/app/actions/search-students-for-institution.test.ts (scaffold → 8 passing tests)
    - src/app/actions/promote-institution-manager.test.ts (scaffold → 8 passing tests)
    - eslint.config.mjs (added .claude/** to globalIgnores — out-of-scope worktree artifacts)
    - .gitignore (added .claude/worktrees/ — agent worktree build outputs)
decisions:
  - "promote/demote enforce D-07 atomicity at the DB layer via SECURITY DEFINER RPCs (migration 0014). Sequential admin-client UPDATEs are explicitly forbidden in the action body — a partial failure between profiles.role and institution_members.role updates would leave the system in 'two managers' state, violating the 1:1 invariant."
  - "detach is SOFT (D-08): only deletes from institution_members; never touches enrollments or course_certificates. The detach test uses a trip-wire `from()` mock that throws if any other table is accessed — provability is built into the test layer."
  - "search-students-for-institution returns [] (not 401/403) for non-admin callers. Empty-vs-error indistinguishability prevents auth-state leakage through the autocomplete UI (T-05-05-05)."
  - "buildInstitutionPayload only handles {name, slug, contact_email}. The institutions table has no contact_phone column (per 05-03-SUMMARY.md B-4 deviation) — re-introducing it would have caused a runtime Postgres error."
metrics:
  duration: "~20 min"
  completed_date: "2026-05-02"
  tasks_completed: 3
  files_created: 9
  files_modified: 7
  tests_added: 34
  test_pass_rate: "100% (34/34)"
---

# Phase 5 Plan 05: Server Actions Summary

5 admin-only Server Actions (createInstitutionAction, updateInstitutionAction, attachInstitutionMemberAction, detachInstitutionMemberAction, promoteInstitutionManagerAction, demoteInstitutionManagerAction, searchStudentsForInstitution) for the B2B institution manager surface, with 34 passing tests, atomic promote/demote via Postgres RPCs, and provably-soft detach.

## Tasks Completed

| Task | Name                                                              | Commit  | Lines | Tests           |
| ---- | ----------------------------------------------------------------- | ------- | ----- | --------------- |
| 1    | upsert-institution (create + update)                              | 0e48d34 | 181   | 8 passing       |
| 2    | attach + detach + search                                          | 6b862df | 323   | 18 passing (6+4+8) |
| 3    | promote + demote (RPC-atomic)                                     | 3369356 | 169   | 8 passing       |

**Action file SHAs (HEAD = 3369356):**

| File | Lines | Last Commit |
|------|-------|-------------|
| `src/app/actions/upsert-institution.ts` | 181 | 0e48d34 |
| `src/app/actions/attach-institution-member.ts` | 98 | 6b862df |
| `src/app/actions/detach-institution-member.ts` | 94 | 6b862df |
| `src/app/actions/search-students-for-institution.ts` | 131 | 6b862df |
| `src/app/actions/promote-institution-manager.ts` | 169 | 3369356 |

**Test pass count per file (final):**
- `upsert-institution.test.ts` — 8 passing
- `attach-institution-member.test.ts` — 6 passing
- `detach-institution-member.test.ts` — 4 passing
- `search-students-for-institution.test.ts` — 8 passing
- `promote-institution-manager.test.ts` — 8 passing

**Total: 34 / 34 passing.** Zero `it.todo` placeholders remain in any of the 5 institution action test files.

## Verification

| Gate                               | Command                                                                       | Result |
| ---------------------------------- | ----------------------------------------------------------------------------- | ------ |
| typecheck                          | `npm run typecheck`                                                           | PASS   |
| lint (zero-warning)                | `npm run lint`                                                                | PASS   |
| 5 institution action test files    | `npx vitest run src/app/actions/{upsert,attach,detach,search,promote}-*.test.ts` | 34/34  |
| full test suite (no regression)    | `npm run test:ci`                                                             | 199 passing, 0 failing |

## Architecture Notes

### Atomic Promote/Demote (D-07 + Pitfall 3)

`promoteInstitutionManagerAction` and `demoteInstitutionManagerAction` delegate the entire role-flip sequence to migration-0014 SECURITY DEFINER RPCs:

```ts
const { error } = await adminClient.rpc("promote_institution_manager", {
  p_institution_id: parsed.data.institution_id,
  p_new_manager_profile_id: parsed.data.profile_id,
});
```

PostgREST wraps the RPC body in a single transaction, so all four sub-mutations (find prior manager → update profiles.role + institution_members.role for new manager → demote prior manager → reset prior manager's profiles.role if no other manager seats) succeed atomically or roll back together. Sequential admin-client UPDATEs in the action body are explicitly forbidden — a partial failure between the two table updates would violate the "uma instituição = um gestor por vez" invariant from D-07.

The acceptance criteria check `grep -E 'from\("(profiles|institution_members)"\).update' src/app/actions/promote-institution-manager.ts` returns no matches: the RPC is the only mutation path.

### Soft Detach (D-08)

`detachInstitutionMemberAction` only deletes the `institution_members` row. Enrollments and certificates are PRESERVED. RLS revokes manager visibility of this user's progress immediately after the row is removed, but the user keeps access to courses they were already enrolled in and any certificates they earned — history is sacred per CERT-05 spirit.

The test enforces this contract with a trip-wire admin client whose `from()` mock throws on any table other than `institution_members`:

```ts
const fromMock = vi.fn((table: string) => {
  if (table === "institution_members") return membersTable;
  throw new Error(`D-08 violation: detach action must not touch table "${table}"`);
});
```

Any future regression that accidentally adds `from("enrollments")` or `from("course_certificates")` to the detach path will fail this test immediately.

### Search Action Auth Pattern

`searchStudentsForInstitution` is a non-form server action (no `useActionState` consumer) called as `await searchStudentsForInstitution(institutionId, query)`. Unauthenticated and non-admin callers silently get `[]` rather than throwing — the autocomplete UI cannot distinguish empty results from auth failure, which prevents enumeration attacks against the admin gate (T-05-05-05).

Profiles have no email column, so emails come from `auth.admin.listUsers({ page: 1, perPage: 1000 })` (Pitfall 6 cap respected). T-05-05-07 (DoS via repeated listUsers calls) is `accept`-disposition at v1 single-tenant scale.

### Schema Constraint (contact_phone absence)

`buildInstitutionPayload` in `upsert-institution.ts` only emits `{ name, slug, contact_email }`. The institutions table (migration 0013) has no contact_phone column — this was a deliberate 05-03 deviation (B-4 fix). Including a `contact_phone` field in the Insert payload would surface as a Postgres column-not-found error at runtime. The Zod schema also omits the field, keeping the validation surface aligned with the DB.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing eslint failures from sibling worktree build artifacts**
- **Found during:** Task 2 verification (`npm run lint` reported 16157 problems, 2156 errors)
- **Issue:** `npm run lint` was scanning `.claude/worktrees/agent-a8ff4c142f80f0daa/.next/server/**/*.js` — Next.js build outputs from a sibling Claude Code agent worktree. These are generated files (not part of the checked-in source) and have no business being in the lint scope. The eslint config's default `globalIgnores` (`.next/**`, `out/**`, `build/**`) only matches the top-level project; the worktree subfolder slipped through.
- **Verification:** `git stash` of my Task 2 changes showed the same 16157 problems on the unmodified working tree → confirmed pre-existing baseline issue, not caused by this plan.
- **Fix:** Added `'.claude/**'` to `eslint.config.mjs` `globalIgnores` and `.claude/worktrees/` to `.gitignore` so future runs ignore agent worktree build artifacts.
- **Files modified:** `eslint.config.mjs`, `.gitignore`
- **Commit:** 6b862df (bundled with Task 2 to keep the verification-gate fix close to the test-suite changes)
- **Justification:** Without this fix, the plan's `<verification>` step for Task 2 + 3 cannot pass. Per deviation Rule 3, blocking issues should be fixed inline. The fix touches only the lint scope and does not modify any source code.

**2. [Plan-spec adjustment] `buildInstitutionPayload` does not include `contact_phone`**
- **Found during:** Task 1 implementation
- **Issue:** The plan's example code (lines 241-248) destructures `input.contact_phone`, but the institutions table (migration 0013) has no contact_phone column — this was a documented 05-03 deviation (B-4 fix) and was passed through to me explicitly in the executor prompt.
- **Fix:** `buildInstitutionPayload` returns only `{ name, slug, contact_email }`. The Zod schemas in `src/lib/institutions/schema.ts` already omit `contact_phone`, so the Insert/Update payloads align with both the Zod surface and the DB schema.
- **Files modified:** `src/app/actions/upsert-institution.ts` (deviation from plan example, alignment with 05-03 reality)
- **Commit:** 0e48d34
- **Justification:** Spec instruction in the executor prompt explicitly directed this adjustment.

### CLAUDE.md Compliance

| Rule | Verification |
|------|--------------|
| Server Actions preferred over API routes | All 7 mutations are Server Actions (no new API routes). |
| Zod-first validation | Every action uses `safeParse` against the schemas in `src/lib/institutions/schema.ts`. |
| Typed Supabase clients | All `from()` and `rpc()` calls use the `Database<Database>` generic via `createSupabaseAdminClient` / `createSupabaseServerClient`. |
| Lint zero-warning | `npm run lint` passes after the eslint scope fix. |
| Vitest, no jsdom | All tests pure-Node, mocking server modules — no React DOM. |
| pt-BR copy | All user-facing strings are pt-BR (matches UI-SPEC §Error states). |

## Threat Flags

None — surface area matches the plan's `<threat_model>`. No new endpoints, auth paths, file access patterns, or schema changes introduced beyond what 05-01 and 05-03 already enrolled.

## Authentication Gates

None — all actions execute against mocked Supabase clients in tests. No real Supabase auth was attempted.

## Known Stubs

None — every action is fully wired. Plan 05-07 (admin UI) will bind these via `useActionState`.

## Self-Check: PASSED

- [x] `src/app/actions/upsert-institution.ts` — exists (181 lines)
- [x] `src/app/actions/upsert-institution-state.ts` — exists
- [x] `src/app/actions/attach-institution-member.ts` — exists (98 lines)
- [x] `src/app/actions/attach-institution-member-state.ts` — exists
- [x] `src/app/actions/detach-institution-member.ts` — exists (94 lines)
- [x] `src/app/actions/detach-institution-member-state.ts` — exists
- [x] `src/app/actions/search-students-for-institution.ts` — exists (131 lines)
- [x] `src/app/actions/promote-institution-manager.ts` — exists (169 lines)
- [x] `src/app/actions/promote-institution-manager-state.ts` — exists
- [x] All 5 test files contain zero `it.todo` (verified via `grep -c "it.todo"`)
- [x] Commits exist on main: 0e48d34, 6b862df, 3369356
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes (zero warnings)
- [x] `npm run test:ci` passes (199 / 199 non-todo)
- [x] Plan-level acceptance: 34 / 34 institution action tests passing

## Next Phase Readiness

**Plan 05-07 (admin UI) is now UNBLOCKED.** It can wire forms via `useActionState` against:
- `createInstitutionAction` + `updateInstitutionAction` (institution form)
- `attachInstitutionMemberAction` (search-and-attach UX)
- `detachInstitutionMemberAction` (DetachMemberButton)
- `promoteInstitutionManagerAction` + `demoteInstitutionManagerAction` (manager toggle)
- `searchStudentsForInstitution` (autocomplete debounce target)

All `*-state.ts` files export the `initial*FormState` constants the UI will pass to `useActionState` as the initial state.
