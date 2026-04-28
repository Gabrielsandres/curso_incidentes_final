# Phase 1: Foundation - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Schema prerequisites (institutions, institution_members, enrollments + B2B link, new `institution_manager` role enum value, RLS policies + `is_member_of_institution` SECURITY DEFINER helper), critical pre-prod fixes (env validation for `SUPABASE_SERVICE_ROLE_KEY`, certificate timezone `America/Sao_Paulo`), and the ops baseline (Sentry hardened, Resend SMTP configured, deploy checklist).

15 v1 requirements: OPS-01..05, ENR-01/02/04, INST-01..04, MKT-03, EMAIL-01/02. Out of scope for this phase: course/module/lesson CRUD (Phase 2), progress UI and certificate generation (Phase 3), video provider abstraction (Phase 4), gestor dashboard and invite templates (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Env enforcement (OPS-01)

- **D-01:** `SUPABASE_SERVICE_ROLE_KEY` validation in `src/lib/env.ts` is **strict in prod only** — `serverSchema` requires `.string().min(1)` when `process.env.NODE_ENV === "production"`, stays `.optional()` in dev/test. Cold-boot in prod fails loud; local dev still works without the secret. Implement as a refined Zod schema (e.g., `z.string().optional().superRefine((v, ctx) => { if (NODE_ENV === "production" && !v) ctx.addIssue(...) })`) so the cached `getEnv()` throws on first call in prod when missing.
- **D-02:** No format check on the JWT shape (deferred — would add false-negative risk if Supabase rotates key format).

### Sentry hardening (OPS-03)

- **D-03:** Add a wrapper module at `src/lib/observability/sentry.ts` exporting `captureException(err, ctx?)` and `captureMessage(msg, level?)`. Wrapper checks `getEnv().SENTRY_DSN` once and no-ops when absent.
- **D-04:** Replace direct `Sentry.*` call sites — at minimum `src/app/global-error.tsx` — with the wrapper. Leave `sentry.{client,server,edge}.config.ts` and `instrumentation.ts` alone (those are SDK init, not call sites).
- **D-05:** Wrapper is the single place to add tags/release/user context later; planner should make it minimal but extensible.

### Schema migrations (INST-01..04, ENR-01/02/04)

- **D-06:** **Two migration files** (minimum split, Postgres enum requires it):
  - `0012_add_institution_manager_role.sql` — only `ALTER TYPE user_role ADD VALUE 'institution_manager'`. Must commit before any policy can reference the new value.
  - `0013_institutions_enrollments.sql` — all of: `institutions` table, `institution_members` table, `enrollments` table (with `institution_id` nullable FK for B2B), `is_member_of_institution(uuid)` SECURITY DEFINER STABLE helper, RLS enabled on all three tables, all policies (with `USING` AND `WITH CHECK` on every INSERT/UPDATE per INST-04), and admin backfill (see D-07).
- **D-07:** **Backfill admins only** in `0013`: at the end of the migration, `INSERT INTO enrollments (user_id, course_id, source, granted_at) SELECT p.id, c.id, 'admin_grant', now() FROM profiles p CROSS JOIN courses c WHERE p.role = 'admin'` (with `expires_at = NULL`). Regular users (test/student accounts) get grants via Phase 2 admin UI; ENR-02 RLS ships with no enrollment row → no access, by design.
- **D-08:** `enrollments` columns per ENR-01: `id`, `user_id` (FK profiles), `course_id` (FK courses), `granted_at` (default now()), `expires_at` (nullable), `source` enum (`b2c_purchase` | `b2b_invite` | `admin_grant`), `institution_id` (nullable FK institutions, set when source='b2b_invite'). RLS policy implements ENR-02 (active enrollment required) and ENR-04 (expired = lose access but row stays).
- **D-09:** Update `src/lib/database.types.ts` to match the new tables/enum value in the same wave as the migration files (manual edit — repo has no codegen).
- **D-10:** Update `README.md` migration list to include 0012 and 0013 (per CLAUDE.md convention).

### Resend SMTP (EMAIL-01/02)

- **D-11:** **Panel-only configuration** in Phase 1. No application code change for email. Steps:
  - Configure custom SMTP at Supabase Auth panel pointing at Resend.
  - Provision domain in Resend; add SPF + DKIM records to DNS.
  - Verify deliverability with manual inbox tests to a Gmail and an Outlook/Hotmail address (per OPS criterion).
  - Document `EMAIL_FROM`, the Resend account, and DNS record location in `docs/DEPLOY-CHECKLIST.md`.
- **D-12:** Resend SDK wrapper (`src/lib/email/resend.ts`) is **deferred to Phase 5** when EMAIL-03 (B2B invite template with custom pt-BR copy) actually needs it. Captured in Deferred Ideas.

### Auth profile trigger (CONCERNS — not in REQs)

- **D-13:** **Defer** the trigger redesign. The trigger is already fail-safe (migration 0010 explicitly made it not block signup on error). Address structurally only if it actually fails again in production.
- **D-14:** Add a small **app-level read-after-write guardrail** in `src/lib/auth/profiles.ts`: a helper `ensureProfileExists(userId, metadata)` that reads `profiles` after signup and inserts the row via the admin client if missing. Call it from the post-signup paths (server action handling email confirmation, accept-invite flow). Add a Sentry breadcrumb via the new wrapper when the guardrail fires so we see drift in production.

### Certificate date fix (OPS-02)

- **D-15:** Change `formatCertificateDate` in `src/lib/certificates/pdf.ts` from `timeZone: "UTC"` to `timeZone: "America/Sao_Paulo"`. Locale stays `pt-BR`. Add unit test: an `issuedAt` timestamp at 02:00 UTC (= 23:00 previous day in São Paulo) must format the previous day's date.

### Deploy checklist (OPS-05)

- **D-16:** **Markdown only** at `docs/DEPLOY-CHECKLIST.md`. Sections:
  1. Required env vars per environment (cross-referenced by name to the relevant schema in `src/lib/env.ts`). At minimum `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (prod-required after D-01), `SENTRY_DSN`, `EMAIL_FROM`, `APP_VERSION`.
  2. Pending migrations to apply (in numeric order via Supabase SQL Editor).
  3. Post-deploy smoke tests: `/health` returns expected JSON, login flow works, opening a lesson works for an admin, certificate PDF generates with correct date.
- **D-17:** Operator-driven, no CI/Vercel deploy-hook gate (deferred — current cadence doesn't justify the infra; revisit if deploy frequency grows).

### CI green (OPS-04)

- **D-18:** Already covered by `.github/workflows/ci.yml` (lint zero-warning + test:ci + build). Phase 1 deliverable is **verifying** it stays green after all the above changes; no new CI work unless something in this phase breaks it.

### MKT-03 (/health preserve)

- **D-19:** `/health` already exists at `src/app/health/route.ts`. Phase 1 deliverable: a smoke test confirming it returns `{status, uptime, timestamp, version}` in production after deploy. No code change unless the route regresses.

### Claude's Discretion

- Exact column names/types for the new tables (follow patterns from `0011_courses_and_certificates.sql`).
- Internal structure of the Sentry wrapper (single file, exports the two functions, gates on `getEnv().SENTRY_DSN`).
- Test layout for the new helpers (Vitest, `environment: "node"`, alongside source per repo convention).
- Whether `ensureProfileExists` is called inline or wrapped in middleware (planner picks; constraint: must run on first authenticated request after signup).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — vision, constraints, key decisions, single-tenant MDHE positioning
- `.planning/REQUIREMENTS.md` — full v1 requirements set; this phase covers OPS-01..05, ENR-01/02/04, INST-01..04, MKT-03, EMAIL-01/02
- `.planning/ROADMAP.md` — phase boundaries and downstream dependencies (Phase 2/3/4/5 consume this phase's schema)
- `CLAUDE.md` — repo conventions: Zod-first validation, typed Supabase clients, env via `getEnv()`, Server Actions over API routes, lint zero-warning, Vitest node env, pt-BR UI

### Codebase reality
- `.planning/codebase/CONCERNS.md` — flags addressed: env validation gap, unconditional Sentry calls, profile trigger fragility (D-13/D-14)
- `.planning/codebase/STACK.md` — Next.js 16 / React 19 / Supabase / Tailwind v4 / Vitest stack already in place
- `.planning/codebase/ARCHITECTURE.md` — three-Supabase-client model, middleware ring structure
- `.planning/codebase/CONVENTIONS.md` — Zod schema-first pattern, error handling style

### Files this phase touches directly
- `src/lib/env.ts` — D-01/D-02 prod-strict refinement
- `src/app/global-error.tsx` — D-04 swap to Sentry wrapper
- `src/lib/auth/profiles.ts` — D-14 add ensureProfileExists guardrail
- `src/lib/certificates/pdf.ts` — D-15 timezone fix in `formatCertificateDate`
- `src/lib/database.types.ts` — D-09 update to match new tables/enum value
- `README.md` — D-10 add migrations 0012/0013 to the list

### Files this phase creates
- `supabase/migrations/0012_add_institution_manager_role.sql` (D-06)
- `supabase/migrations/0013_institutions_enrollments.sql` (D-06, D-07, D-08)
- `src/lib/observability/sentry.ts` (D-03)
- `docs/DEPLOY-CHECKLIST.md` (D-16)

### Existing migrations to read for pattern
- `supabase/migrations/0010_make_auth_profile_trigger_fail_safe.sql` — fail-safe pattern this phase preserves
- `supabase/migrations/0011_courses_and_certificates.sql` — most recent migration; mirror its style for tables, RLS, and policy wording

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/env.ts` — already has `getEnv()` cache, `clientSchema`/`serverSchema`, `resetEnvCache()`. D-01 extends `serverSchema` with a Zod refinement; do not break the cache contract.
- `src/lib/supabase/{client,server,admin}.ts` — three client factories already typed with `<Database>`. D-14 calls the admin client to backfill missing profile rows; mirror existing usage in `src/app/actions/create-institutional-lead.ts`.
- `src/lib/logger.ts` — minimal LOG_LEVEL-gated logger; the new Sentry wrapper should use it for non-Sentry observability fallbacks (warn when DSN absent at startup, once).
- `src/lib/certificates/pdf.ts` — `formatCertificateDate` is the only place to fix for OPS-02; existing test file `src/lib/certificates/issuer.test.ts` is the right place to add the timezone test.

### Established Patterns
- Schemas in `src/lib/**/schema.ts`, never inline in actions/routes (CLAUDE.md). New env validation stays in `src/lib/env.ts`.
- Migrations are manual SQL applied in numeric order via Supabase SQL Editor or `supabase` CLI; no automated runner. D-16's checklist must reflect this — operator pastes 0012 and 0013 in order before promoting.
- All Supabase calls typed with `<Database>` — `src/lib/database.types.ts` must be hand-edited in the same wave as the migrations (D-09).
- Tests live alongside source as `*.test.ts`, Vitest with `environment: "node"` (no jsdom). New helpers and the Zod refinement get unit tests in this style.

### Integration Points
- `middleware.ts` — does not change in this phase. `GESTOR_ROUTES` (INST-05) is Phase 5 work; Phase 1 only ships the role enum value and tables that Phase 5 will consume.
- `src/app/api/lesson-progress/complete/route.ts` — currently has an admin-client fallback when RLS denies (CONCERNS:49). After ENR-02 RLS lands and admins are backfilled (D-07), the fallback should still work unchanged for admins; for regular users without enrollment it will (correctly) deny. Phase 1 leaves this route as-is; revisit in Phase 3.
- Existing certificates module (just shipped in `feat: módulo de certificados...`): `src/lib/certificates/issuer.ts`, `src/app/api/certificates/signed-url/route.ts`. OPS-02 fix is local to `pdf.ts`; nothing else in the certificates module changes here.

</code_context>

<specifics>
## Specific Ideas

- The Sentry wrapper should warn (via `src/lib/logger.ts`) exactly once at startup when `NODE_ENV === "production"` and `SENTRY_DSN` is absent — visible signal to ops without crashing.
- Backfill in D-07 should be idempotent: use `ON CONFLICT (user_id, course_id) DO NOTHING` so re-running the migration on a populated DB is safe (defensive — the repo has no migration tracker that prevents re-runs).
- `enrollments` should have a UNIQUE constraint on `(user_id, course_id)` to support the `ON CONFLICT` above and to make ENR-03 admin grants safe against double-clicks.

</specifics>

<deferred>
## Deferred Ideas

- **Resend SDK wrapper** (`src/lib/email/resend.ts`) — defer to Phase 5 when EMAIL-03 (B2B invite template with custom pt-BR copy) actually needs application-level transactional email. Phase 1 ships SMTP config only.
- **Auth profile trigger redesign** (move profile creation from DB trigger to post-login server hook) — keep current fail-safe trigger + the D-14 read-after-write guardrail. Revisit only if the fail-safe path actually fires in production (visible via the Sentry breadcrumb in D-14).
- **CI/Vercel deploy-hook gate for the deploy checklist** (D-17) — current single-tenant MDHE deploy cadence doesn't justify the infra. Revisit if deploy frequency grows or if a checklist item is missed in production.
- **Strict JWT format check on `SUPABASE_SERVICE_ROLE_KEY`** (D-02) — defer; would add false-negative risk if Supabase rotates key format.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-27*
