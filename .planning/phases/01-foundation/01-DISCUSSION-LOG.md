# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 01-foundation
**Areas discussed:** Env + Sentry, Schema + backfill, Resend + trigger, Deploy checklist

---

## Env + Sentry

### Q1: How strict should `SUPABASE_SERVICE_ROLE_KEY` validation be in `src/lib/env.ts`?

| Option | Description | Selected |
|--------|-------------|----------|
| Strict in prod only | `serverSchema` requires `.min(1)` when `NODE_ENV==='production'`; remains `.optional()` in dev/test | ✓ |
| Always required | Make `.string().min(1)` unconditional everywhere | |
| Strict + format check | Strict in prod AND validate JWT shape (`eyJ...` 3-segment base64) | |

**User's choice:** Strict in prod only.
**Notes:** Lowest dev friction; ships safety where it matters. Format check deferred (false-negative risk if Supabase rotates key format).

### Q2: How should Sentry calls be guarded so they don't run when DSN is absent?

| Option | Description | Selected |
|--------|-------------|----------|
| Wrapper helper | New `src/lib/observability/sentry.ts` exporting captureException/captureMessage that no-op when DSN empty; replace direct `Sentry.*` call sites | ✓ |
| `isInitialized()` at each call site | Inline `if (Sentry.isInitialized()) { ... }` everywhere | |
| Trust SDK no-op | Leave `global-error.tsx` as-is and trust the SDK's empty-DSN no-op behavior | |

**User's choice:** Wrapper helper.
**Notes:** Centralizes the gate; single place to add tags/release/user context later.

---

## Schema + backfill

### Q3: How should the new schema be sliced across migration files? (next available number is 0012)

| Option | Description | Selected |
|--------|-------------|----------|
| Minimum split | `0012_add_institution_manager_role.sql` (only `ALTER TYPE`) + `0013_institutions_enrollments.sql` (tables + helpers + RLS + backfill) | ✓ |
| Three-file split | `0012` enum value, `0013` institutions + members + helper, `0014` enrollments + RLS | |
| Four-file split | `0012` enum, `0013` tables, `0014` helpers, `0015` RLS policies | |

**User's choice:** Minimum split.
**Notes:** Smallest valid slicing per Postgres enum constraint (enum value must commit before policies reference it). Easiest to review and roll back as a pair.

### Q4: When ENR-02 RLS goes live, existing users with no `enrollments` row lose access. What's the backfill strategy in `0013`?

| Option | Description | Selected |
|--------|-------------|----------|
| Backfill admins only | INSERT enrollments for every `profiles.role='admin'` × every existing course (`source='admin_grant'`, `expires_at=NULL`); regular users wait for Phase 2 admin UI | ✓ |
| Backfill all existing users to all published courses | INSERT enrollments for every profile × every course | |
| No backfill — manual grants only | Ship RLS, ship Phase 2 grant UI, accept that even admins lose access until they grant themselves | |

**User's choice:** Backfill admins only.
**Notes:** Forces the new access model from day 1 without locking the MDHE team out. INSERT must be idempotent (`ON CONFLICT (user_id, course_id) DO NOTHING`).

---

## Resend + trigger

### Q5: EMAIL-01/02 only require panel-only SMTP config. Should Phase 1 also build a Resend SDK wrapper for app-level transactional emails?

| Option | Description | Selected |
|--------|-------------|----------|
| Panel-only now | Configure custom SMTP at Supabase panel + verify SPF/DKIM. No code change. Defer SDK wrapper to Phase 5 | ✓ |
| Build the wrapper now | Add `src/lib/email/resend.ts` + Zod-validated `RESEND_API_KEY` even though no caller exists yet | |
| Wrapper + smoke-test endpoint | Wrapper plus admin-only `/api/admin/email-test` route | |

**User's choice:** Panel-only now.
**Notes:** Avoids building a wrapper before its first real consumer. Captured in Deferred Ideas for Phase 5.

### Q6: CONCERNS.md flagged `handle_auth_user_profile()` trigger has had 2 emergency fixes. Address in Phase 1 or defer?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer | Trigger is already fail-safe (migration 0010); add app-level read-after-write guardrail in `src/lib/auth/profiles.ts` (`ensureProfileExists` helper). Trigger redesign captured as deferred concern | ✓ |
| Harden in Phase 1 | Move profile creation out of DB trigger and into a post-login server-side hook | |
| Add monitoring only | Keep trigger; add Sentry breadcrumb when fail-safe path fires + daily admin warning if `profiles.count != auth.users.count` | |

**User's choice:** Defer (with app-level guardrail).
**Notes:** Phase 1 is already large; structural redesign only if the fail-safe path actually fires in production. Sentry breadcrumb added via the new wrapper to make that visible.

---

## Deploy checklist

### Q7: OPS-05 requires a deploy checklist in `docs/`. Just markdown, or wire it into a real gate?

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown checklist | `docs/DEPLOY-CHECKLIST.md` with required env vars (cross-referenced to `src/lib/env.ts`), pending migrations to apply, post-deploy smoke tests. Operator-driven | ✓ |
| Markdown + CI script | Same checklist + `scripts/preflight.ts` that runs in CI on production deploy job | |
| Markdown + Vercel deploy hook | Checklist + Vercel deploy-hook posts checklist as PR comment requiring tick before promote | |

**User's choice:** Markdown checklist.
**Notes:** Matches the existing manual-migration workflow. Deploy-hook gate captured as a deferred idea — revisit if deploy cadence grows.

---

## Claude's Discretion

- Internal structure of the Sentry wrapper module.
- Exact column names/types for new tables (follow `0011_courses_and_certificates.sql` patterns).
- Test layout for new helpers (Vitest, node env, alongside source).
- Whether `ensureProfileExists` is called inline or wrapped in middleware (constraint: must run on first authenticated request after signup).

## Deferred Ideas

- Resend SDK wrapper at `src/lib/email/resend.ts` → Phase 5 (EMAIL-03 invite template).
- Auth profile trigger redesign → only if fail-safe path fires in production.
- CI/Vercel deploy-hook gate → only if deploy cadence grows.
- JWT format check on `SUPABASE_SERVICE_ROLE_KEY` → defer (false-negative risk).
