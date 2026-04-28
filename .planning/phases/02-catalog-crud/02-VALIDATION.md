---
phase: 2
slug: catalog-crud
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-28
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Wave 0 — Resolution

TDD-within-task pattern continues from Phase 1. Each implementation task creates its test file (or extends an existing one) BEFORE writing the implementation code. The test files listed below are created within their respective tasks; no separate Wave 0 is needed.

The planner SHOULD set `nyquist_compliant: true` and `wave_0_complete: true` once the PLAN.md files reflect the TDD ordering with `<read_first>` blocks pointing to the test file as STEP 1.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (config in `vitest.config.ts`, `environment: "node"`) |
| **Config file** | `vitest.config.ts` (already in repo) |
| **Quick run command** | `npx vitest run <touched test files>` |
| **Full suite command** | `npm run test:ci` (or `npx vitest run` if reporter race on Windows) |
| **Estimated runtime** | ~2 seconds for quick, ~3 seconds for full |

---

## Sampling Rate

- **After every task commit:** Run quick command for the file being modified
- **After every plan wave:** Run `npm run test:ci` (or `npx vitest run` fallback)
- **Before `/gsd-verify-work`:** `npm run lint && npm run typecheck && npm run test:ci && npm run build` must all be green (CI parity per OPS-04)
- **Max feedback latency:** 30 seconds (full suite + build)

---

## Per-Task Verification Map

> Filled by the planner during task generation. Each task's `<acceptance_criteria>` block links here.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-XX-XX | XX | N | CAT-01 | T-XX | Course CRUD with status timestamps | unit (TDD) | `npx vitest run src/lib/courses/schema.test.ts src/app/actions/upsert-course.test.ts` | mixed | ⬜ pending |
| 2-XX-XX | XX | N | CAT-02 | T-XX | Module CRUD + reorder swap atomicity | unit | `npx vitest run src/app/actions/manage-module.test.ts` | created within task | ⬜ pending |
| 2-XX-XX | XX | N | CAT-03 | T-XX | Lesson CRUD + soft delete | unit | `npx vitest run src/app/actions/manage-lesson.test.ts` | created within task | ⬜ pending |
| 2-XX-XX | XX | N | CAT-04 | T-XX | Material upload with MIME whitelist | unit | `npx vitest run src/lib/materials/storage.test.ts` | created within task | ⬜ pending |
| 2-XX-XX | XX | N | CAT-05 | T-XX | Visibility derived from published_at | unit + manual SQL | `npx vitest run src/lib/courses/queries.test.ts` + RLS smoke | augments existing | ⬜ pending |
| 2-XX-XX | XX | N | CAT-06 | T-XX | Slug uniqueness — Postgres 23505 catch | unit | `npx vitest run src/app/actions/upsert-course.test.ts -t "slug collision"` | augments existing | ⬜ pending |
| 2-XX-XX | XX | N | CAT-07 | T-XX | Archive preserves history | unit + manual | RLS smoke: aluno não vê arquivado mas certificado ainda existe | n/a | ⬜ pending |
| 2-XX-XX | XX | N | ENR-03 | T-XX | Admin grant via dialog (existing + invite) | unit | `npx vitest run src/app/actions/grant-enrollment.test.ts` | created within task | ⬜ pending |
| 2-XX-XX | XX | N | MKT-02 | T-XX | UTM capture in institutional form | unit | `npx vitest run src/lib/marketing/institutional-lead-schema.test.ts` | augments existing | ⬜ pending |
| 2-XX-XX | XX | N | MKT-01 | — | Landing preserved (no regression) | manual | open `/` and confirm 11 sections render | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

The planner MUST adjust task IDs to match actual PLAN.md numbering. Above is the expected shape based on RESEARCH.md and the 10 phase requirements.

---

## Wave 0 Requirements

All Wave 0 test files are created within their respective implementation tasks (TDD-within-task pattern from Phase 1). No separate Wave 0 plan is needed.

- [ ] `src/lib/courses/schema.test.ts` — augmented (existing) with publish/archive cases
- [ ] `src/lib/courses/queries.test.ts` — augmented with archived/soft-deleted filtering
- [ ] `src/app/actions/upsert-course.test.ts` — created within slug collision task
- [ ] `src/app/actions/manage-module.test.ts` — created within module CRUD task
- [ ] `src/app/actions/manage-lesson.test.ts` — created within lesson CRUD + soft delete task
- [ ] `src/app/actions/grant-enrollment.test.ts` — created within ENR-03 task
- [ ] `src/lib/materials/storage.test.ts` — created within MIME whitelist task
- [ ] `src/lib/courses/slugify.test.ts` — created with the slugify utility
- [ ] `src/lib/marketing/institutional-lead-schema.test.ts` — augmented with UTM cases
- [ ] No new framework install needed — Vitest 4.x already in `package.json`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration 0014 applies cleanly with idempotent ALTER | All Phase 2 schema reqs | No automated migration runner (CLAUDE.md); ALTER must succeed against live DB | 1) Apply `0014_catalog_metadata.sql` to dev DB. 2) Verify columns exist via `\d courses`, `\d lessons`, `\d modules`, `\d institutional_leads`. 3) Verify `lessons.video_url` is now nullable. 4) Re-run 0014 (locally) — should be idempotent (no errors). |
| RLS — aluno não vê curso arquivado | CAT-07 | RLS depends on live auth session | Set role authenticated for a test student user with enrollment to course X. UPDATE courses SET archived_at = now() WHERE id = X. Re-query courses — must return 0 rows for that user. Re-set archived_at = NULL — must return again. |
| RLS — aluno não vê aula com deleted_at | CAT-03/D-02 | Same | UPDATE lessons SET deleted_at = now() WHERE id = L. As authenticated student, query lesson_progress for L's module — lesson must be hidden from getCourseWithContent. Admin (service-role) still sees it. |
| Archive preserves certificates | CAT-07 | E2E behavior | After archiving a course where a student has a certificate, query `certificates` table — row still exists; `/meus-certificados` for that student still lists the certificate; PDF download still works. |
| Material upload — MIME whitelist enforces | CAT-04 / D-08 | Browser file upload e2e | Try uploading: a .pdf (PASS), a .docx (PASS), a .png (PASS), a .exe (REJECT with pt-BR error), a .zip (REJECT). Both client preview and server response must reject the disallowed types. |
| Reorder atomicity under concurrent clicks | CAT-02 / CAT-03 | Race condition | (Manual smoke — not blocking) Open admin page in two browser tabs simultaneously; click ↑ on the same lesson in both at sub-second intervals. Final state must be consistent (no duplicate or skipped positions). |
| Grant access flow — existing user | ENR-03 / D-10 | E2E auth flow | Log in as admin. Open /admin/cursos/[slug]/alunos. Click "Conceder acesso", enter email of an existing student. Confirm. Student should now see the course in /dashboard. |
| Grant access flow — new user (invite) | ENR-03 / D-10 | E2E auth flow | Same as above, but enter email of a non-existent user. Confirm "send invite + grant". Open the invite email (or the Supabase Auth admin → users) and confirm the invite. After accepting, the student sees the course. |
| UTM capture in institutional form | MKT-02 | E2E URL behavior | Visit `/?utm_source=linkedin&utm_medium=post&utm_campaign=mdhe-q2`. Submit institutional form. Verify the inserted row in `institutional_leads` has the three UTM fields populated. Visit `/` without query params and submit — UTM fields are NULL. |
| Landing preserved (MKT-01) | MKT-01 | Visual regression | Open `/` after Phase 2 ships. Verify 11 marketing sections render exactly as before (no missing CTAs, no console errors). Hidden inputs are not visible to the user. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter (planner sets after generating PLANs that match this table)

**Approval:** pending
