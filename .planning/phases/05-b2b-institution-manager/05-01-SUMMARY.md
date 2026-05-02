---
phase: 05-b2b-institution-manager
plan: 01
subsystem: supabase-rpc
tags: [supabase, migration, rpc, security-definer, atomic-promote]
requirements: [INST-08]
status: awaiting-operator-checkpoint
dependency_graph:
  requires:
    - 0013_institutions_enrollments.sql (institution_members table + is_member_of_institution helper analog)
    - profiles.role enum value 'institution_manager' (shipped 0012)
  provides:
    - public.promote_institution_manager(uuid, uuid) RPC
    - public.demote_institution_manager(uuid, uuid) RPC
    - typed RPC surface in Database['public']['Functions']
  affects:
    - 05-05 (server actions for promote/demote — UNBLOCKED once operator applies migration)
    - 05-04 (managers admin UI — calls 05-05 actions)
tech-stack:
  added: []
  patterns:
    - SECURITY DEFINER PL/pgSQL function with `set search_path = public` lockdown (mirrors 0013 is_member_of_institution)
    - Service-role-only execute grant (revoke from public/anon/authenticated → grant execute to service_role)
    - PostgREST single-transaction RPC for atomic multi-row UPDATE
key-files:
  created:
    - supabase/migrations/0015_promote_institution_manager_rpc.sql
    - .planning/phases/05-b2b-institution-manager/05-01-SUMMARY.md
  modified:
    - src/lib/database.types.ts (Functions block: stub → typed entries)
    - README.md (migration ledger: +1 bullet line)
decisions:
  - Renumbered plan-spec 0014 → 0015 because 0014_catalog_metadata.sql already on disk (Phase 4). Content identical to plan, only filename differs.
metrics:
  duration: ~10 min (autonomous tasks 1-3; Task 4 awaiting operator)
  completed_date: "2026-05-02"
  tasks_total: 4
  tasks_done_autonomous: 3
  tasks_blocked_on_operator: 1
---

# Phase 5 Plan 01: Atomic Promote/Demote Institution Manager RPC — Summary

Atomic Postgres SECURITY DEFINER RPCs (`promote_institution_manager`, `demote_institution_manager`) with locked `search_path = public`, service-role-only execute, and inline guards that reset `profiles.role` back to `student` when a demoted user has no remaining manager seats globally — mirrors the `is_member_of_institution` helper pattern from migration 0013.

## What Was Built

### 1. Migration `0015_promote_institution_manager_rpc.sql` (119 lines, SHA-256 `efc78908ee6fd345273e5497992ad515801b29635831e0f2285fe631be6a30dc`)

Two PL/pgSQL functions, both `language plpgsql security definer set search_path = public returns void`:

- **`promote_institution_manager(p_institution_id uuid, p_new_manager_profile_id uuid)`** — within a single PostgREST transaction:
  1. Looks up the prior manager (excluding the user being promoted) in `institution_members`.
  2. Updates `profiles.role = 'institution_manager'` for the new manager.
  3. Updates the new manager's `institution_members.role = 'manager'`.
  4. If a prior manager exists, demotes them in this institution (`institution_members.role = 'student'`); if they hold no other manager seats globally, also resets their `profiles.role` to `'student'`.
- **`demote_institution_manager(p_institution_id uuid, p_profile_id uuid)`** — used by the UI "Rebaixar a aluno" path:
  1. Sets the user's `institution_members.role = 'student'` for that institution.
  2. If the user has no other manager seats anywhere, resets `profiles.role = 'student'`.

Both functions: `revoke all from public, anon, authenticated` → `grant execute to service_role` only. No `create policy`, `alter table`, `create table`, or `drop` statements (additive function-only migration).

### 2. `src/lib/database.types.ts` — typed RPC surface

Replaced the empty `Functions: { [_ in never]: never }` stub with explicit typed entries:

```typescript
Functions: {
  promote_institution_manager: {
    Args: { p_institution_id: string; p_new_manager_profile_id: string };
    Returns: undefined;
  };
  demote_institution_manager: {
    Args: { p_institution_id: string; p_profile_id: string };
    Returns: undefined;
  };
};
```

uuid → string mapping follows supabase-js typegen convention (verified against existing rows like `profiles.id: string`). `Returns: undefined` matches `returns void`.

### 3. `README.md` — migration ledger

Single-line append after the `0014_catalog_metadata.sql` bullet:
```
- `supabase/migrations/0015_promote_institution_manager_rpc.sql` — RPCs SECURITY DEFINER para promote/demote atômico de gestor de instituição (Phase 5).
```

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | exit 0 (no type errors) |
| `npm run lint` | exit 0 (zero warnings; CLAUDE.md `--max-warnings=0` policy honored) |
| `test -f supabase/migrations/0015_promote_institution_manager_rpc.sql` | OK |
| `grep "create or replace function public.promote_institution_manager"` | 1 match |
| `grep "create or replace function public.demote_institution_manager"` | 1 match |
| `grep "set search_path = public"` | 2 matches (one per function) |
| `grep "grant execute on function ... to service_role"` | 2 matches |
| `grep "create policy\|alter table\|create table\|drop "` in migration | 0 (additive function-only) |
| `grep "0015_promote_institution_manager_rpc"` in README.md | 1 match |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `cf363cd` | `feat(05-01): add migration 0015 promote/demote institution manager RPCs` |
| 2 | `754937a` | `feat(05-01): expose promote/demote institution manager RPCs in database.types.ts` |
| 3 | `db9cac6` | `docs(05-01): add 0015 promote_institution_manager_rpc to README migration ledger` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Migration number collision (0014 → 0015)**

- **Found during:** Task 1 — pre-write file existence check
- **Issue:** Plan specifies `supabase/migrations/0014_promote_institution_manager_rpc.sql`, but `supabase/migrations/0014_catalog_metadata.sql` already exists on disk (shipped during Phase 4 work; also documented in README at line 55). Two migrations with the same NNNN prefix violate CLAUDE.md §Database "applied in numeric order" convention and would create ambiguous ordering for any operator running migrations from a fresh project.
- **Fix:** Renumbered to `0015_promote_institution_manager_rpc.sql`. File contents are byte-for-byte identical to plan spec (only the comment header was extended with a one-paragraph note explaining the renumbering). README ledger entry uses 0015 to match. `database.types.ts` has no filename reference, so unchanged. Threat model is unaffected (same SECURITY DEFINER posture, same search_path lockdown, same service_role-only grants).
- **Files modified:** `supabase/migrations/0015_promote_institution_manager_rpc.sql` (renamed from spec); `README.md` line uses 0015.
- **Commits:** `cf363cd` (migration with 0015 in path), `db9cac6` (README ledger 0015 entry).

## Authentication Gates

None during autonomous tasks. Task 4 is itself the operator gate (apply migration to live Supabase via SQL Editor).

## Threat Flags

None. The plan's `<threat_model>` (T-05-01-01..07) covers all surface introduced by this plan; nothing new was added beyond the spec'd RPCs.

## Known Stubs

None. The two RPCs are fully implemented end-to-end; the typed surface points to real Postgres functions (pending Task 4 apply); README entry references the actual file path.

## What This Unblocks

- **Plan 05-05 (server actions)** — `src/app/actions/promote-institution-manager.ts` and `src/app/actions/demote-institution-manager.ts` can now call `adminClient.rpc("promote_institution_manager", { p_institution_id, p_new_manager_profile_id })` with full TypeScript inference. **Will throw at runtime until Task 4 is completed by the operator** — the typed surface is purely a compile-time signature; the function body lives in the live database.
- **Plan 05-04 (managers admin UI)** — depends on 05-05 actions, transitively unblocked.

## TDD Gate Compliance

Plan frontmatter type is `execute` (not `tdd`); RED/GREEN/REFACTOR sequence not required. No deviation.

## Operator Action Required (Task 4)

See the `## CHECKPOINT REACHED` block returned to the orchestrator. Operator must apply `supabase/migrations/0015_promote_institution_manager_rpc.sql` via Supabase Dashboard → SQL Editor, then verify with the queries listed in the plan's Task 4 `<how-to-verify>` section.

## Self-Check: PASSED

- `[x]` `supabase/migrations/0015_promote_institution_manager_rpc.sql` — FOUND
- `[x]` `.planning/phases/05-b2b-institution-manager/05-01-SUMMARY.md` — FOUND (this file)
- `[x]` Commit `cf363cd` — FOUND
- `[x]` Commit `754937a` — FOUND
- `[x]` Commit `db9cac6` — FOUND
- `[x]` `npm run typecheck` exit 0 — verified
- `[x]` `npm run lint` exit 0 — verified
