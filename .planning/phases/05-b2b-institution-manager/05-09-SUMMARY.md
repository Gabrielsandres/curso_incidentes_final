---
phase: 05-b2b-institution-manager
plan: 09
subsystem: deploy-docs-uat
tags: [docs, deploy-checklist, uat, phase-gate, blocking]
requirements: [INST-05, INST-06, INST-07, INST-08, EMAIL-03]
status: awaiting-uat-checkpoint
dependency_graph:
  requires:
    - 05-01 (migration 0015 applied)
    - 05-04 (Edge Function deployed + Auth panel template pasted)
    - 05-06 (middleware /gestor ring + orphan-manager flash)
    - 05-07 (admin /admin/instituicoes/* UI)
    - 05-08 (manager dashboard /gestor)
  provides:
    - docs/DEPLOY-CHECKLIST.md §Phase 5 — Configuração Manual Adicional (operator-facing pre-prod runbook)
    - End-to-end UAT validation gate for all 5 ROADMAP success criteria
    - Closeout marks for ROADMAP/REQUIREMENTS/STATE/PROJECT (Task 3, post-UAT)
  affects:
    - .planning/ROADMAP.md (Phase 5 → Complete)
    - .planning/REQUIREMENTS.md (INST-05/06/07/08 + EMAIL-03 traceability already Complete; v1 list checkboxes verified)
    - .planning/STATE.md (Phase 5 complete; 30/30 plans)
    - .planning/PROJECT.md Phase Completion Log (append Phase 5 entry)
tech-stack:
  added: []
  patterns:
    - Operator runbook (markdown checklist) in docs/ — same pattern as Phase 1 §3-5
    - Blocking UAT checkpoint (`checkpoint:human-verify gate="blocking"`) — same pattern as Phase 4 plan 04-05
key-files:
  created: []
  modified:
    - docs/DEPLOY-CHECKLIST.md (+60 lines: migration 0015 entry, separate-query warning, Phase 5 manual section, footer)
decisions:
  - "[Rule 1 - Bug] Plan referenced migration 0014_promote_institution_manager_rpc.sql but actual filename on disk is 0015 (Phase 2 reserved 0014 for catalog_metadata; documented in 05-01-SUMMARY decisions). Used disk reality and added a clarifying note in the migration list entry pointing to the gap."
metrics:
  duration: ~12 min (Task 1 autonomous; Task 2 blocking on operator UAT)
  completed_date: "2026-05-02 (Task 1 only; full closure pending UAT)"
  tasks_total: 3
  tasks_done_autonomous: 1
  tasks_blocked_on_operator: 1
  tasks_pending_post_uat: 1
---

# Phase 5 Plan 09: Phase Closeout — Deploy Checklist + UAT + Tracking — Summary (Partial)

> **Status:** Task 1 (deploy checklist update) complete. Task 2 (BLOCKING UAT covering all 5 ROADMAP success criteria) is awaiting operator action. Task 3 (ROADMAP/REQUIREMENTS/STATE/PROJECT closeout) only proceeds after operator returns "uat-pass" signal.

This SUMMARY will be expanded after the UAT gate clears.

## What Was Built (Task 1)

### Updated `docs/DEPLOY-CHECKLIST.md` (+60 lines)

Three surgical additions to the canonical pre-prod operator runbook:

1. **Migration list entry (§2 Migrações Pendentes):**
   - Added entry `14. 0015_promote_institution_manager_rpc.sql` with description (atomic promote/demote SECURITY DEFINER RPCs, prevents partial-failure "two managers" state).
   - Inline note flags the gap: "Migração 0014_catalog_metadata.sql é entregue pela Phase 2; quando aplicada, será inserida nesta lista entre 0013 e 0015."
   - Appended a new ⚠️ warning paragraph for 0015 mirroring the existing 0012/0013 separate-query guidance, with verification SQL (`select proname from pg_proc where proname in ('promote_institution_manager','demote_institution_manager');` should return 2 rows).

2. **New §Phase 5 — Configuração Manual Adicional** (between §2 and §3):
   - **§1 Deploy do Edge Function `Criar-usuario`** — `supabase functions deploy Criar-usuario` command + verification path.
   - **§2 Template pt-BR no Supabase Auth Panel (EMAIL-03)** — explicitly names `docs/email-templates.md` as **Source of truth**, includes:
     - W-2 cross-reference: distinguishes drift-detection re-paste (if 05-04 Task 4 was completed) from first-time paste (fresh environment).
     - I-1 operator warning: documents the trailing-space cosmetic limitation when Subject is rendered without `institution_name` (B2C path via `/admin/usuarios`).
     - 7-step paste procedure + drift-detection guidance.
   - **§3 Smoke-test Phase 5 pós-deploy** — 9-item checklist covering list page, create institution, invite institutional, role gating (admin/manager/student/orphan), orphan-manager redirect-with-banner, and cleanup SQL.

3. **Footer:** added `*Last updated: 2026-05-02 after Phase 5 (B2B Institution Manager) completion*`.

### Verification (Task 1 acceptance — all PASS)

```
$ grep -c "0015_promote_institution_manager_rpc" docs/DEPLOY-CHECKLIST.md   # 2 ✓ (list entry + warning)
$ grep -c "Phase 5 — Configuração Manual"          docs/DEPLOY-CHECKLIST.md  # 1 ✓
$ grep -c "supabase functions deploy Criar-usuario" docs/DEPLOY-CHECKLIST.md  # 1 ✓
$ grep -c "Source of truth"                          docs/DEPLOY-CHECKLIST.md # 1 ✓
$ git diff --stat docs/DEPLOY-CHECKLIST.md                                    # +60 -0 ✓
$ git diff --diff-filter=D HEAD~1 HEAD                                        # (empty — no deletions) ✓
```

Existing sections (env vars table §1, migrations 1-13, smoke tests §3.1-3.6, Resend §4, Rollback §5, CI Notes) are unchanged.

## Commit History (so far)

| Task | Commit | Description |
|------|--------|-------------|
| 1    | `a5e69bc` | docs(05-09): add Phase 5 deploy steps to DEPLOY-CHECKLIST.md |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration filename mismatch — plan said `0014`, disk reality is `0015`**

- **Found during:** Task 1 (preparing the migration list entry)
- **Issue:** Plan instructions repeatedly reference `0014_promote_institution_manager_rpc.sql` (e.g., "insert IMMEDIATELY AFTER `13. 0013_institutions_enrollments.sql`" with bullet `14. 0014_promote_institution_manager_rpc.sql`). The migration on disk is actually `supabase/migrations/0015_promote_institution_manager_rpc.sql` because Phase 2's catalog work created `0014_catalog_metadata.sql` first. This rename is already documented in `05-01-SUMMARY.md` (decisions: "Renumbered plan-spec 0014 → 0015"). The user's prompt also confirms `0015_promote_institution_manager_rpc.sql`.
- **Fix:** Used disk reality (`0015`). Added an inline parenthetical in the new list entry pointing to the 0014 gap and a follow-up note in the warning paragraph so operators don't think we skipped a migration.
- **Files modified:** `docs/DEPLOY-CHECKLIST.md` (lines 48, 54)
- **Commit:** `a5e69bc`

### Architectural Asks

None.

## Task 2 Status — BLOCKING UAT (Awaiting Operator)

The 5 ROADMAP success criteria + 3 bonus checks (orphan, auto-demote, soft-detach) need to be exercised end-to-end against the live (or staging) Supabase project with real accounts. This SUMMARY will be expanded with the UAT results matrix once the operator returns "uat-pass".

## Task 3 Status — Pending UAT Pass

Closeout updates to ROADMAP.md, REQUIREMENTS.md, STATE.md, PROJECT.md will execute after UAT clears.

## Self-Check: PASSED (partial — Task 1 only)

- File `docs/DEPLOY-CHECKLIST.md` exists and was modified — VERIFIED
- Commit `a5e69bc` exists in `git log --oneline` — VERIFIED
- All 4 acceptance grep checks pass — VERIFIED
- No unintended deletions in commit — VERIFIED (`git diff --diff-filter=D HEAD~1 HEAD` is empty)

---

*Summary status: PARTIAL — written after Task 1 commit, before BLOCKING UAT checkpoint. Will be finalized after UAT pass + Task 3 closure.*
