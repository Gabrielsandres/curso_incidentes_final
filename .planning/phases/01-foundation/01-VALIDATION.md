---
phase: 1
slug: foundation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-27
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Wave 0 — Resolution

TDD-within-task pattern adopted — each implementation task creates its own test file (with at least one failing assertion describing expected behavior) BEFORE writing the implementation code. The test files listed as "Wave 0 gaps" (sentry.test.ts, pdf.test.ts, profiles.test.ts; env.test.ts is augmentation of existing) are created within their respective tasks (1-01-02, 1-02-01, 1-02-02). The Wave 0 contract is satisfied because no implementation task references a test file that does not exist within its own commit. Specifically: Task 1-01-02 creates `sentry.test.ts` first (RED), then creates `sentry.ts` (GREEN); Task 1-02-01 creates `pdf.test.ts` first (RED), then edits `pdf.ts` to export the function with the correct timezone (GREEN); Task 1-02-02 creates `profiles.test.ts` first (RED), then appends `ensureProfileExists` to `profiles.ts` (GREEN).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (config in `vitest.config.ts`, `environment: "node"`) |
| **Config file** | `vitest.config.ts` (already in repo) |
| **Quick run command** | `npx vitest run src/lib/env.test.ts src/lib/observability/sentry.test.ts src/lib/certificates/pdf.test.ts src/lib/auth/profiles.test.ts` |
| **Full suite command** | `npm run test:ci` (= `vitest run --reporter=verbose`) |
| **Estimated runtime** | ~6 seconds for quick, ~20 seconds for full |

---

## Sampling Rate

- **After every task commit:** Run quick command for the file being modified
- **After every plan wave:** Run `npm run test:ci`
- **Before `/gsd-verify-work`:** `npm run lint && npm run typecheck && npm run test:ci && npm run build` must all be green (CI parity per OPS-04)
- **Max feedback latency:** 30 seconds (full suite + build)

---

## Per-Task Verification Map

> Filled by the planner during task generation. Each task's `<acceptance_criteria>` block links here. The planner expands this table as PLAN.md files are written.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | OPS-01 | — | App fails to boot in prod when SUPABASE_SERVICE_ROLE_KEY missing | unit (TDD) | `npx vitest run src/lib/env.test.ts` | augments existing | ⬜ pending |
| 1-01-02 | 01 | 1 | OPS-03 | — | Sentry wrapper no-ops when DSN empty | unit (TDD) | `npx vitest run src/lib/observability/sentry.test.ts` | created within task | ⬜ pending |
| 1-02-01 | 02 | 1 | OPS-02 | — | formatCertificateDate emits America/Sao_Paulo date | unit (TDD) | `npx vitest run src/lib/certificates/pdf.test.ts -t "formatCertificateDate"` | created within task | ⬜ pending |
| 1-02-02 | 02 | 1 | (CONCERNS — guardrail) | — | ensureProfileExists creates profile row when missing | unit (TDD) | `npx vitest run src/lib/auth/profiles.test.ts` | created within task | ⬜ pending |
| 1-03-01 | 03 | 2 | INST-01 | — | Migration 0012 adds `institution_manager` to user_role enum | manual SQL | apply 0012 in SQL Editor; SELECT enum_range; assert value present | n/a (SQL) | ⬜ pending |
| 1-03-02 | 03 | 2 | INST-02/03/04, ENR-01/02/04 | — | Migration 0013 creates institutions/institution_members, alters enrollments, RLS active, helper STABLE SECURITY DEFINER | manual SQL + integration | apply 0013 then run RLS smoke test (see Manual-Only) | n/a (SQL) | ⬜ pending |
| 1-04-01 | 04 | 4 | EMAIL-01/02 | — | SMTP via Resend configured at Supabase panel; SPF + DKIM verified at DNS | manual | inbox tests to Gmail + Outlook documented in DEPLOY-CHECKLIST.md | n/a | ⬜ pending |
| 1-05-01 | 05 | 3 | OPS-05, MKT-03 | — | DEPLOY-CHECKLIST.md exists with required env vars, migration order, smoke tests | file check | `test -f docs/DEPLOY-CHECKLIST.md && grep -q SUPABASE_SERVICE_ROLE_KEY docs/DEPLOY-CHECKLIST.md` | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All Wave 0 test files are created within their respective implementation tasks (TDD-within-task pattern). No separate Wave 0 plan is needed.

- [x] `src/lib/env.test.ts` — augmented within Task 1-01-01 (existing file; new `describe` block appended BEFORE superRefine edit)
- [x] `src/lib/observability/sentry.test.ts` — created within Task 1-01-02 (new file written RED before sentry.ts is created)
- [x] `src/lib/certificates/pdf.test.ts` — created within Task 1-02-01 (new file written RED before pdf.ts export/timezone edit)
- [x] `src/lib/auth/profiles.test.ts` — created within Task 1-02-02 (new file written RED before ensureProfileExists is appended)
- [x] No new framework install needed — Vitest 4.x already in `package.json`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration 0012 applies cleanly and the new enum value is visible | INST-01 | No automated migration runner in repo (CLAUDE.md: manual SQL workflow); enum-availability is a Postgres transaction-boundary check that needs to actually be applied | 1) Open Supabase SQL Editor for the dev DB. 2) Run `SELECT unnest(enum_range(NULL::user_role));`. 3) Assert `institution_manager` is NOT in the list. 4) Apply `supabase/migrations/0012_add_institution_manager_role.sql`. 5) Re-query — assert `institution_manager` IS now present. |
| Migration 0013 applies cleanly and ENR-02 RLS denies access for users without enrollments | INST-02/03/04, ENR-02 | RLS behavior depends on the live Supabase auth session; cannot be unit-tested with the JS client mock | 1) Apply `0013_institutions_enrollments.sql` to dev DB. 2) Verify `institutions`, `institution_members` tables exist; `enrollments` has new columns (source, granted_at, expires_at, institution_id). 3) Verify `is_member_of_institution(uuid)` exists — run `SELECT provolatile, prosecdef FROM pg_proc WHERE proname='is_member_of_institution'`; expect provolatile='s' and prosecdef=true. 4) RLS smoke test: simulate authenticated role for a user WITHOUT enrollment for a course; confirm `SELECT COUNT(*) FROM lesson_progress WHERE lesson_id IN (SELECT id FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id = '<course_uuid>'))` returns 0 rows. |
| Admin backfill in 0013 inserted enrollments for every admin × every existing course | D-07 | One-time data migration; no JS path | After applying 0013, `SELECT count(*) FROM enrollments WHERE source='admin_grant';` should equal `(count of profiles WHERE role='admin') × (count of courses)`. Re-running 0013 (locally — DO NOT in prod) should not duplicate (ON CONFLICT DO NOTHING). |
| Resend SMTP delivers to Gmail and Outlook | EMAIL-01/02 | SMTP delivery is end-to-end; depends on DNS propagation and inbox provider behavior, not code | 1) Configure custom SMTP in Supabase Auth panel pointing at Resend. 2) Add SPF and DKIM records to the EMAIL_FROM domain DNS; wait for propagation. 3) Trigger a password-reset email to a Gmail address — verify it lands in the inbox (not spam) within 60s. 4) Repeat for Outlook/Hotmail. 5) Document the From address, Resend region, and DNS records in `docs/DEPLOY-CHECKLIST.md`. |
| `/health` returns the expected JSON shape in production | MKT-03 | Already implemented; this is a smoke-test that the route is not regressed by other Phase 1 changes (e.g., new env var failing to boot) | After deploy: `curl -s https://<prod-url>/health | jq` — must return `{ status, uptime, timestamp, version }`. Any Sentry wrapper or env validation regression that crashes startup will be caught here. |
| App boots in production with all required env vars (and fails fast when any is missing) | OPS-01 | Prod-only refinement; cannot test in CI without setting NODE_ENV=production which would break dev tooling | After deploy: visit `/health`. If SUPABASE_SERVICE_ROLE_KEY is unset on the prod environment, the deployment should fail at boot (cold start crash) — visible in Vercel deployment logs. Document this expected failure mode in DEPLOY-CHECKLIST.md so an operator knows the symptom. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are manual-only SQL/panel tasks with documented test instructions
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covered by TDD-within-task pattern (see Wave 0 — Resolution above)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
