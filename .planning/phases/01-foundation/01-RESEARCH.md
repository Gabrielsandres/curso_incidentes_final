# Phase 1: Foundation - Research

**Researched:** 2026-04-27
**Domain:** Next.js 16 / Supabase / Zod / @sentry/nextjs / Postgres RLS / Resend SMTP
**Confidence:** HIGH (all critical claims verified against codebase source or official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `SUPABASE_SERVICE_ROLE_KEY` — strict `.string().min(1)` when `NODE_ENV === "production"`, `.optional()` in dev/test. Implemented as `superRefine` in `serverSchema`. Cached `getEnv()` throws on first call in prod when missing.
- **D-02:** No format check on JWT shape (deferred — false-negative risk).
- **D-03:** New wrapper at `src/lib/observability/sentry.ts` exporting `captureException(err, ctx?)` and `captureMessage(msg, level?)`. Gates on `getEnv().SENTRY_DSN`. No-ops when absent.
- **D-04:** Replace direct `Sentry.*` at minimum in `src/app/global-error.tsx`. Leave `sentry.{client,server,edge}.config.ts` and `instrumentation.ts` alone.
- **D-05:** Wrapper is minimal but extensible (single place for tags/release/user context in future).
- **D-06:** Two migration files: `0012_add_institution_manager_role.sql` (ALTER TYPE only), `0013_institutions_enrollments.sql` (all tables + helper + RLS + backfill).
- **D-07:** Backfill admins only — `INSERT INTO enrollments ... SELECT profiles × courses WHERE role='admin'` with `ON CONFLICT DO NOTHING`.
- **D-08:** enrollments columns: `id`, `user_id`, `course_id`, `granted_at` (default now()), `expires_at` (nullable), `source` enum (`b2c_purchase | b2b_invite | admin_grant`), `institution_id` (nullable FK institutions).
- **D-09:** Update `src/lib/database.types.ts` (manual, same wave as migrations).
- **D-10:** Update `README.md` migration list (0012 and 0013).
- **D-11:** Panel-only Resend SMTP config in Phase 1. No application code for email.
- **D-12:** Resend SDK wrapper deferred to Phase 5.
- **D-13:** Defer trigger redesign. Keep current fail-safe + D-14 guardrail.
- **D-14:** Add `ensureProfileExists(userId, metadata)` in `src/lib/auth/profiles.ts`. Uses admin client when profile row missing. Adds Sentry breadcrumb via new wrapper when guardrail fires.
- **D-15:** `formatCertificateDate` uses `timeZone: "America/Sao_Paulo"`. Locale stays `pt-BR`.
- **D-16:** `docs/DEPLOY-CHECKLIST.md` markdown only. Sections: env vars, migration order, smoke tests.
- **D-17:** No CI/deploy-hook gate for checklist.
- **D-18:** Phase 1 verifies CI stays green; no new CI work.
- **D-19:** `/health` already exists. Phase 1: smoke test in prod only; no code change.
- **Specifics:** enrollments UNIQUE on `(user_id, course_id)` for idempotent backfill and double-click safety.

### Claude's Discretion

- Exact column names/types for new tables (follow 0011 patterns).
- Internal structure of the Sentry wrapper (single file, two exports, gate on `getEnv().SENTRY_DSN`).
- Test layout for new helpers (Vitest `environment: "node"`, alongside source).
- Whether `ensureProfileExists` is called inline or wrapped in middleware (planner picks; must run on first authenticated request after signup).

### Deferred Ideas (OUT OF SCOPE)

- Resend SDK wrapper (`src/lib/email/resend.ts`) — Phase 5.
- Auth profile trigger redesign — keep current fail-safe.
- CI/Vercel deploy-hook gate for deploy checklist.
- Strict JWT format check on `SUPABASE_SERVICE_ROLE_KEY`.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OPS-01 | `SUPABASE_SERVICE_ROLE_KEY` validated as required in prod; app fails boot without it | Q1: Zod superRefine pattern for prod-conditional env |
| OPS-02 | `formatCertificateDate` uses `America/Sao_Paulo` timezone | Q7: timezone-safe Vitest pattern |
| OPS-03 | `SENTRY_DSN` configured in prod; absence = degradation not crash | Q2: Sentry wrapper no-op API |
| OPS-04 | CI stays green after all changes | Q10: Validation Architecture |
| OPS-05 | Deploy checklist at `docs/DEPLOY-CHECKLIST.md` | Q9: checklist skeleton |
| ENR-01 | `enrollments` entity with columns per D-08 | Q4–5: RLS pattern + backfill SQL |
| ENR-02 | Active enrollment required to open lessons; RLS enforces | Q4: RLS policy shape |
| ENR-04 | Expired enrollment: loses access but keeps progress and certificate | Q4: RLS expiry check |
| INST-01 | `institutions` table + `institution_manager` enum value in separate migration | Q3: Postgres enum transaction constraint |
| INST-02 | `institution_members` table linking profiles ↔ institutions | Q4: RLS + helper design |
| INST-03 | `is_member_of_institution(uuid)` SECURITY DEFINER STABLE | Q4: helper signature |
| INST-04 | All new RLS includes USING + WITH CHECK on INSERT/UPDATE | Q4: complete policy shapes |
| MKT-03 | `/health` preserved and validated post-deploy | Q9: smoke test in checklist |
| EMAIL-01 | Supabase Auth SMTP configured via Resend | Q6: Resend SMTP runbook |
| EMAIL-02 | Domain SPF/DKIM configured; deliverability validated | Q6: DNS records |

</phase_requirements>

---

## Summary

Phase 1 is a pure foundations phase: no new UI, all server-side work. It consists of three independent work tracks that must coordinate their ordering:

1. **Schema track** (INST-01..04, ENR-01/02/04): Two SQL migrations create the institution and enrollment model. The enum value `institution_manager` must be committed (migration 0012) before any policy that references it runs (migration 0013). This is a hard Postgres constraint — not a style preference — and has been the direct cause of broken migrations in multiple production ORMs.

2. **Code fix track** (OPS-01..03, OPS-02): Four surgical edits to existing files: `src/lib/env.ts` (Zod refinement), `src/lib/certificates/pdf.ts` (timezone), `src/app/global-error.tsx` (Sentry wrapper swap), plus one new file `src/lib/observability/sentry.ts`. All four are independently deployable.

3. **Ops/config track** (EMAIL-01/02, OPS-05): Resend SMTP is a panel configuration only — zero code. The deploy checklist is a new markdown file.

**Primary recommendation:** Apply 0012 before 0013 (can be done in the same panel session but as two separate pastes). Land all code fixes in a single branch with matching `database.types.ts` update. Deliver the checklist and Resend config as a final commit before tagging v1.0-foundation.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Env validation (OPS-01) | API / Backend | — | `serverSchema` in `src/lib/env.ts`; never runs in browser |
| Sentry wrapper (OPS-03) | API / Backend + Client | — | Wrapper is server-safe; `global-error.tsx` is a client component — wrapper must export from a file safe for both runtimes |
| Certificate timezone (OPS-02) | API / Backend | — | `pdf.ts` runs server-only (Node fs, pdf-lib); no browser surface |
| `enrollments` schema + RLS | Database / Storage | API / Backend | Table + policies in DB; gating enforced at row-level before app touches data |
| `institutions` + `institution_members` | Database / Storage | — | Schema-only in Phase 1; no app-layer query code needed until Phase 5 |
| `is_member_of_institution` helper | Database / Storage | — | SECURITY DEFINER function lives in DB; called by RLS policies, not by app code |
| `ensureProfileExists` guardrail | API / Backend (Server Action) | — | Calls admin client; must not run in browser or middleware edge runtime |
| Resend SMTP | External Service Config | — | No app code; Supabase Auth panel SMTP settings only |
| Deploy checklist | Docs | — | Markdown only; no runtime tier |

---

## Q1: Zod prod-conditional `SUPABASE_SERVICE_ROLE_KEY` Refinement

### Current State

`src/lib/env.ts` line 32 [VERIFIED: codebase read]:
```typescript
SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
```

`getEnv()` uses `serverSchema.safeParse(process.env)` and throws if `!parsed.success`. The `cachedEnv` pattern means the refinement fires exactly once per cold boot. [VERIFIED: codebase read]

### The Exact Pattern

Replace the current `SUPABASE_SERVICE_ROLE_KEY` line in `serverSchema` with a `superRefine`:

```typescript
const serverSchema = clientSchema.extend({
  // Prod-required; optional in dev and test so local devs don't need the secret.
  // superRefine fires inside safeParse, so getEnv() will throw on cold boot
  // in production if the key is absent — same throw semantics as today.
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .optional()
    .superRefine((v, ctx) => {
      if (process.env.NODE_ENV === "production" && !v) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "SUPABASE_SERVICE_ROLE_KEY is required in production. Set it in your Vercel environment variables.",
        });
      }
    }),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});
```

**Why `superRefine` and not `discriminatedUnion`:**
- `discriminatedUnion` requires a literal discriminant field — it cannot branch on an external variable like `NODE_ENV`. `superRefine` is the correct Zod v3 mechanism for cross-context conditional validation. [VERIFIED: Zod docs pattern — `superRefine` is explicitly documented for `ctx.addIssue` conditional logic]
- The return type of `serverSchema` remains `{ SUPABASE_SERVICE_ROLE_KEY?: string; ... }` (optional in the TypeScript type) which is correct — the optional is preserved at compile time and the prod enforcement is a runtime check.

**Cache contract:** No change needed to `getEnv()` or `resetEnvCache()`. The `safeParse` path already propagates Zod errors as a throw. [VERIFIED: codebase read — `src/lib/env.ts` lines 52-65]

**Test approach (matches D-01 and repo Vitest style):**
```typescript
// src/lib/env.ts unit test (to add to a new src/lib/env.test.ts)
import { describe, it, expect, afterEach } from "vitest";
import { resetEnvCache } from "@/lib/env";

afterEach(() => resetEnvCache());

describe("serverSchema prod refinement", () => {
  it("throws when NODE_ENV=production and key is absent", () => {
    const orig = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    // Import getEnv lazily to avoid module-level cache
    const { getEnv } = require("@/lib/env");
    expect(() => getEnv()).toThrow();
    Object.defineProperty(process.env, "NODE_ENV", { value: orig, configurable: true });
  });

  it("does not throw when NODE_ENV=development and key is absent", () => {
    // NODE_ENV is already 'test' in vitest; key can be absent
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { getEnv } = require("@/lib/env");
    expect(() => getEnv()).not.toThrow();
  });
});
```

> **Note on `require()` in tests:** Dynamic `require()` is the standard Vitest pattern when module-level side effects (like the `cachedEnv` variable) need to be reset between test cases. The `resetEnvCache()` export already exists for this purpose. [VERIFIED: `src/lib/env.ts` line 101]

---

## Q2: Sentry Wrapper Minimal API

### Current Sentry Init State

`sentry.server.config.ts`, `sentry.client.config.ts`, `sentry.edge.config.ts` all call `Sentry.init({ enabled: Boolean(process.env.SENTRY_DSN) })`. [VERIFIED: codebase read]

When `SENTRY_DSN` is falsy, `enabled: false` causes the SDK to discard events silently — the SDK still initializes but does nothing. [CITED: https://docs.sentry.io/platforms/javascript/guides/nextjs/]

### Gate: `getClient()` vs `isInitialized()` vs env check

**Key finding:** In `@sentry/nextjs` v8+, `Sentry.getClient()` was changed — it now always returns a client even when Sentry is initialized (with or without DSN). The correct gate for "is Sentry actually going to send anything?" is `Sentry.isInitialized()` which returns `true` only after `Sentry.init()` has been called. However, because our `sentry.*.config.ts` files set `enabled: Boolean(process.env.SENTRY_DSN)`, the cleanest gate in the **wrapper** is to read `getEnv().SENTRY_DSN` directly (which is already validated by the env schema). This avoids any dependency on Sentry's internal initialization state. [CITED: https://docs.sentry.io/platforms/javascript/guides/nextjs/]

**Why read the env directly (not `Sentry.getClient()`):**
- `global-error.tsx` is a client component (`"use client"`). It cannot call `getEnv()` (server-only). The wrapper must export from a file that works in BOTH server and edge contexts. For the client component path, the wrapper should check `process.env.SENTRY_DSN` directly (public env prefix note: SENTRY_DSN is server-only, so the client component must be handled differently — see call site note below).
- For server/edge contexts: gate on `getEnv().SENTRY_DSN`.

**Call site note for `global-error.tsx`:** This is a `"use client"` component. The Sentry wrapper at `src/lib/observability/sentry.ts` cannot import `getEnv()` (would break the client bundle). The wrapper must be written to work with a simple `process.env.SENTRY_DSN` check (which is `undefined` in the browser unless prefixed `NEXT_PUBLIC_`). In practice, because `global-error.tsx` calls `captureException` during an error boundary, and the SDK is already initialized client-side by `sentry.client.config.ts`, the direct SDK call is already safe (SENTRY_DSN is present = SDK enabled, absent = SDK disabled via `enabled: false`). The wrapper approach still works: if `process.env.SENTRY_DSN` is falsy in the browser bundle, the wrapper no-ops; if it is non-empty (server-side), the wrapper calls through. 

The simplest correct solution: **the wrapper reads `process.env.SENTRY_DSN` without going through `getEnv()`** so it is safe in any runtime context:

```typescript
// src/lib/observability/sentry.ts
// "use server" is NOT added — this file must be importable from client components.
// It gates on process.env.SENTRY_DSN which is undefined in the browser (not NEXT_PUBLIC_),
// so the no-op path is always taken on the client side, which is correct because
// sentry.client.config.ts already handles client-side init with enabled: Boolean(SENTRY_DSN).

import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";

type SentryContext = Record<string, unknown>;
type SeverityLevel = "fatal" | "error" | "warning" | "log" | "info" | "debug";

let _warnedOnce = false;

function isEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN);
}

export function captureException(err: unknown, ctx?: SentryContext): void {
  if (!isEnabled()) {
    if (process.env.NODE_ENV === "production" && !_warnedOnce) {
      logger.warn("Sentry DSN not configured — error reporting disabled in production");
      _warnedOnce = true;
    }
    return;
  }
  Sentry.captureException(err, { extra: ctx });
}

export function captureMessage(
  message: string,
  level: SeverityLevel = "info",
  ctx?: SentryContext
): void {
  if (!isEnabled()) return;
  Sentry.captureMessage(message, { level, extra: ctx });
}
```

**Runtime compatibility:** `@sentry/nextjs` is already used in both server and client components in this codebase. The wrapper adds no new import surface; it re-exports two named functions. No double-initialization risk: `sentry.*.config.ts` files and `instrumentation.ts` remain untouched per D-04. [VERIFIED: codebase read]

**Replacing `global-error.tsx`:**
```typescript
// Before (line 5-6):
import * as Sentry from "@sentry/nextjs";
// ...
Sentry.captureException(error);

// After:
import { captureException } from "@/lib/observability/sentry";
// ...
captureException(error);
```

---

## Q3: Postgres Enum + RLS Migration Sequencing

### The Hard Constraint

`ALTER TYPE ... ADD VALUE` **cannot be used in the same transaction** as any statement that **references the new value**. This is documented in the PostgreSQL manual Notes section: "If `ALTER TYPE ... ADD VALUE` is executed inside a transaction block, the new value cannot be used until after the transaction has been committed." [CITED: https://www.postgresql.org/docs/current/sql-altertype.html]

### Failure Mode if Collapsed into One Migration

If `0012` and `0013` were merged into a single file:
1. The Supabase SQL Editor (or `supabase db push`) wraps the file in an implicit transaction.
2. `ALTER TYPE user_role ADD VALUE 'institution_manager'` runs inside that transaction.
3. The next statement — e.g., `CREATE POLICY ... USING (role = 'institution_manager')` — references the new value **in the same uncommitted transaction**.
4. Postgres throws: `ERROR: unsafe use of new value "institution_manager" of enum type user_role`.
5. The entire migration rolls back.

This is a production-breaking failure, not a warning. The Supabase community has hit this exact issue across multiple ORMs (TypeORM #1169, Prisma #5290, PayloadCMS #15071). [CITED: https://github.com/typeorm/typeorm/issues/1169]

### Correct Split Strategy (D-06 Confirmed)

```
0012_add_institution_manager_role.sql   -- ONLY: ALTER TYPE user_role ADD VALUE 'institution_manager';
0013_institutions_enrollments.sql       -- tables + helper + RLS (can now safely reference the new value)
```

Apply in order: 0012 first (commits the new enum value), then 0013. The Supabase SQL Editor applies them as two separate sessions so the commit boundary is satisfied. [ASSUMED: Supabase SQL Editor session isolation — each paste/run is its own transaction; verified by community practice but not explicit in Supabase docs]

### 0012 Migration Body

```sql
-- 0012_add_institution_manager_role.sql
-- Isolated migration: ALTER TYPE only.
-- Must be applied and COMMITTED before 0013 (which references this value in RLS policies).
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'institution_manager';
```

The `IF NOT EXISTS` guard makes it re-runnable without error if applied twice by accident. [VERIFIED: standard Postgres syntax documented at postgresql.org/docs/current/sql-altertype.html]

---

## Q4: RLS Pattern for Multi-Source `enrollments`

### Table Structure Summary (per D-08)

```sql
enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,                              -- NULL = lifetime (B2C)
  source public.enrollment_source NOT NULL,            -- new enum type
  institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  CONSTRAINT enrollments_user_course_unique UNIQUE (user_id, course_id)
)
```

The `source` column requires a new enum type `enrollment_source` (values: `b2c_purchase`, `b2b_invite`, `admin_grant`). This is a separate enum from `user_role` and CAN be defined in the same migration (0013) as the table, because no policy needs to reference it during `CREATE TYPE`. [ASSUMED: creating a new enum type and using it in the same transaction is allowed in Postgres — only ADD VALUE to an existing enum triggers the constraint]

### The RLS Policy Set for `enrollments`

**Active enrollment definition:** `expires_at IS NULL OR expires_at > now()`. This implements both ENR-02 (active enrollment) and ENR-04 (expired = lost access, row stays).

```sql
-- Enable RLS
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Policy 1: Student reads own active enrollments
DROP POLICY IF EXISTS "Students read own enrollments" ON public.enrollments;
CREATE POLICY "Students read own enrollments"
  ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Policy 2: Admins read all enrollments
DROP POLICY IF EXISTS "Admins read all enrollments" ON public.enrollments;
CREATE POLICY "Admins read all enrollments"
  ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Policy 3: Admins insert/update any enrollment
DROP POLICY IF EXISTS "Admins manage enrollments" ON public.enrollments;
CREATE POLICY "Admins manage enrollments"
  ON public.enrollments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Policy 4: Institution managers read enrollments for their institution
-- Uses SECURITY DEFINER helper to avoid recursive RLS lookup on institution_members
DROP POLICY IF EXISTS "Institution managers read institution enrollments" ON public.enrollments;
CREATE POLICY "Institution managers read institution enrollments"
  ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (
    institution_id IS NOT NULL
    AND is_member_of_institution(institution_id)
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Policy 5: Service role bypass
DROP POLICY IF EXISTS "Service role manages enrollments" ON public.enrollments;
CREATE POLICY "Service role manages enrollments"
  ON public.enrollments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### The `is_member_of_institution` SECURITY DEFINER Helper (INST-03)

**Why SECURITY DEFINER:** Without it, the function runs as the calling user. The `institution_members` table has its own RLS policies. If those policies reference back to `enrollments` or to `profiles`, a recursive RLS evaluation loop can occur. SECURITY DEFINER makes the function execute as its owner (superuser-level DB role), bypassing RLS on tables it queries internally. This is the standard Supabase pattern for breaking RLS recursion. [CITED: Supabase RLS docs — "Helper Functions" pattern]

**Why STABLE:** The function result does not change within a single SQL statement (it queries `institution_members` which doesn't mutate during a SELECT). STABLE tells the query planner it can cache the result across rows in the same query. [VERIFIED: Postgres function volatility categories — STABLE is appropriate for reads that don't change within a statement]

```sql
-- Must be created before the policies that call it.
-- Place at the top of 0013 (before CREATE TABLE for enrollments).
CREATE OR REPLACE FUNCTION public.is_member_of_institution(p_institution_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_is_member boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_members im
    WHERE im.institution_id = p_institution_id
      AND im.profile_id = auth.uid()
  )
  INTO v_is_member;

  RETURN COALESCE(v_is_member, false);
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;
```

**Column name `profile_id` (not `user_id`):** The `institution_members` table links to `profiles.id`, not `auth.users.id`. Using `profile_id` makes the FK explicit. [ASSUMED: naming choice; planner should verify consistency with D-08 and 0011 style]

**Recursion prevention:** The function queries `institution_members` directly. As long as `institution_members` RLS policies do NOT reference `enrollments` (and they should not in Phase 1), no recursive loop occurs. The SECURITY DEFINER bypasses `institution_members` RLS entirely anyway. [VERIFIED: logic — SECURITY DEFINER function skips RLS on tables it accesses]

### RLS for `institutions` and `institution_members`

```sql
-- institutions table
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage institutions" ON public.institutions;
CREATE POLICY "Admins manage institutions"
  ON public.institutions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "Members read own institution" ON public.institutions;
CREATE POLICY "Members read own institution"
  ON public.institutions
  FOR SELECT
  TO authenticated
  USING (
    is_member_of_institution(id)
  );

DROP POLICY IF EXISTS "Service role manages institutions" ON public.institutions;
CREATE POLICY "Service role manages institutions"
  ON public.institutions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- institution_members table
ALTER TABLE public.institution_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage institution members" ON public.institution_members;
CREATE POLICY "Admins manage institution members"
  ON public.institution_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "Members read own membership" ON public.institution_members;
CREATE POLICY "Members read own membership"
  ON public.institution_members
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages institution members" ON public.institution_members;
CREATE POLICY "Service role manages institution members"
  ON public.institution_members
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

## Q5: Idempotent Admin Backfill (D-07)

### Verified `courses` Table Column Names

From `0011_courses_and_certificates.sql` and `src/lib/database.types.ts` [VERIFIED: codebase read]:
- Table: `public.courses`
- PK column: `id` (uuid)
- Relevant: `slug`, `title`, `certificate_enabled`

From `src/lib/database.types.ts` Enums section [VERIFIED: codebase read], the `enrollment_source` enum does NOT yet exist in `database.types.ts` — it will be added in Phase 1 along with the new tables.

### Complete Idempotent Backfill SQL

Place at the end of `0013_institutions_enrollments.sql`, after table creation and RLS:

```sql
-- Backfill: grant enrollment on every existing course for all admin-role profiles.
-- Non-admin users receive grants via Phase 2 admin UI; for them, no enrollment = no access
-- by design (ENR-02 RLS enforces this).
-- ON CONFLICT DO NOTHING makes this safe to re-run if the migration is accidentally applied twice.
INSERT INTO public.enrollments (user_id, course_id, source, granted_at, expires_at, institution_id)
SELECT
  p.id,
  c.id,
  'admin_grant',
  now(),
  NULL,    -- lifetime access for admin accounts
  NULL     -- not institution-linked
FROM public.profiles p
CROSS JOIN public.courses c
WHERE p.role = 'admin'
ON CONFLICT (user_id, course_id) DO NOTHING;
```

**Why this is safe:**
- `CROSS JOIN` produces one row per (admin, course) pair.
- `ON CONFLICT (user_id, course_id) DO NOTHING` requires the UNIQUE constraint to exist — it must be defined on the table before this runs (put it in the `CREATE TABLE` DDL earlier in the same migration).
- `p.role = 'admin'` reads the `profiles.role` column; the value `'admin'` already exists in the enum (was added before migration 0002). [VERIFIED: codebase read — `0002_roles_and_profiles.sql` referenced in ARCHITECTURE.md]
- `expires_at = NULL` represents lifetime access (correct for admin accounts per D-08).

---

## Q6: Resend SMTP Configuration Runbook (EMAIL-01/02)

This is configuration-only — zero code. Documents steps for `docs/DEPLOY-CHECKLIST.md`.

### Step 1: Verify Domain in Resend

1. Log in to [resend.com](https://resend.com) → **Domains** → **Add Domain**
2. Enter the sending domain (e.g., `mdhe.com.br`)
3. Resend shows three DNS records to add:
   - **SPF** — TXT record on the root domain or a subdomain as instructed: `v=spf1 include:amazonses.com ~all` (Resend uses AWS SES infrastructure) [CITED: https://resend.com/docs/send-with-supabase-smtp]
   - **DKIM** — TXT record with a long key value on `resend._domainkey.yourdomain.com` (or similar Resend-specific subdomain)
   - **DMARC** — TXT record on `_dmarc.yourdomain.com`: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com` (start with `p=none` for monitoring)
4. Add all three records at your DNS provider (Cloudflare, Route 53, etc.)
5. Wait for DNS propagation (5–30 minutes typical; up to 48 hours worst case)
6. Click **Verify** in Resend dashboard — all three should show green

### Step 2: Create API Key in Resend

1. Resend → **API Keys** → **Create API Key**
2. Name: `supabase-smtp` (descriptive)
3. Permission: **Sending access** (not Full Access — principle of least privilege)
4. Save the key immediately (shown only once)

### Step 3: Configure Supabase Auth SMTP Panel

[CITED: https://supabase.com/docs/guides/auth/auth-smtp]

1. Supabase Dashboard → **Project Settings** → **Auth** → **SMTP Settings**
2. Toggle **Enable Custom SMTP** to **ON**
3. Fill in:
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **User:** `resend`
   - **Password:** the API key created in Step 2
   - **Sender Email:** `no-reply@yourdomain.com` (or `notificacoes@yourdomain.com` — must match verified domain)
   - **Sender Name:** `MDHE — Gestão de Incidentes`
4. Click **Save**

### Step 4: From Address Guidance

`no-reply@yourdomain.com` is conventional for transactional auth emails (confirm, reset, invite). Avoid `contact@` or `suporte@` for automated mail — use those for human-staffed inboxes. For Brazil-facing B2B users, `notificacoes@` (with acento cedilha) is readable but keep the actual address ASCII to avoid encoding issues in old mail clients: `notificacoes@mdhe.com.br` is fine.

### Step 5: Region Note

Resend does not expose a Brazil-specific SMTP region endpoint — all SMTP traffic goes through `smtp.resend.com` which routes via AWS SES global edge. Latency from Brazil is typically 80–200ms for the SMTP handshake, which is acceptable for transactional email delivery (the user is waiting anyway). No action needed. [ASSUMED: Resend region routing — based on AWS SES behavior, not explicitly documented by Resend]

### Step 6: Deliverability Verification

Manual tests to run before considering EMAIL-02 satisfied:
1. Trigger a "Forgot password" from the login form using a **Gmail** address → confirm email arrives in inbox (not spam) and link works.
2. Trigger a "User invite" from the admin panel using an **Outlook/Hotmail** address → confirm email arrives in inbox with correct pt-BR subject line.
3. If either goes to spam: check that DMARC is `p=none` first, then check that the SPF record includes Resend's SES infrastructure.

Document `EMAIL_FROM` address and DNS record locations in `docs/DEPLOY-CHECKLIST.md`.

---

## Q7: Timezone-Safe Certificate Date Test

### Existing Test File

`src/lib/certificates/issuer.test.ts` is the co-located test file for the certificates domain. [VERIFIED: codebase read]

There is no separate `pdf.test.ts` yet. The timezone test should go in a new `src/lib/certificates/pdf.test.ts` per the naming convention `{file}.test.ts` alongside `pdf.ts`. [VERIFIED: CONVENTIONS.md — "Test files: `{file}.test.ts` co-located with implementation"]

### The Exact Test

```typescript
// src/lib/certificates/pdf.test.ts
import { describe, expect, it } from "vitest";

// formatCertificateDate is not currently exported. It will need to be exported (named export)
// OR the test calls buildCourseCertificatePdf with a spy, OR the function is moved to a testable
// position. Simplest: export it from pdf.ts as a named export (no interface change; it's pure).

// After D-15, formatCertificateDate uses timeZone: "America/Sao_Paulo" (not "UTC").
// Key assertion: 2026-04-27T02:00:00Z == 2026-04-26T23:00:00 in America/Sao_Paulo (UTC-3).
// So a timestamp at 02:00 UTC should format as the PREVIOUS day in São Paulo.

describe("formatCertificateDate", () => {
  it("formats date in America/Sao_Paulo timezone, not UTC", () => {
    // This timestamp is 02:00 UTC on April 27 = 23:00 on April 26 in SP (UTC-3)
    const utcMidnight = new Date("2026-04-27T02:00:00Z");

    // Import after the fix is applied
    const { formatCertificateDate } = require("@/lib/certificates/pdf");

    const result = formatCertificateDate(utcMidnight);

    // In UTC: "27/04/2026" — wrong date for a Brazilian user
    // In America/Sao_Paulo: "26/04/2026" — correct date for the local night
    expect(result).toBe("26/04/2026");
  });

  it("formats midday UTC date correctly in SP (no day shift)", () => {
    // 2026-04-27T15:00:00Z == 2026-04-27T12:00:00 in SP (UTC-3, no day shift)
    const noon = new Date("2026-04-27T15:00:00Z");
    const { formatCertificateDate } = require("@/lib/certificates/pdf");
    expect(formatCertificateDate(noon)).toBe("27/04/2026");
  });
});
```

**Runtime independence:** `Intl.DateTimeFormat` with an explicit `timeZone` option produces the same output regardless of the host machine's `TZ` environment variable. The test does not need `TZ=UTC` or any env manipulation — the explicit timezone parameter in the formatter is deterministic. [VERIFIED: MDN — `timeZone` option overrides host timezone for Intl.DateTimeFormat]

**`formatCertificateDate` must be exported.** Currently it is a module-private function (line 100 of `pdf.ts`: `function formatCertificateDate`). For testability, change to `export function formatCertificateDate`. No callers outside `pdf.ts` exist currently — this is a safe additive export. [VERIFIED: codebase grep — only called at line 54 of `pdf.ts`]

---

## Q8: `ensureProfileExists` Guardrail Call Sites

### Current State

`src/lib/auth/profiles.ts` has `fetchUserProfile` and `fetchAuthenticatedUserProfile` but no guardrail. [VERIFIED: codebase read]

The auth trigger (`0010`) already handles the normal signup path with fail-safe exception handling. The guardrail (D-14) is for the gap case where the trigger silently failed (logged to Postgres only, not monitored). [VERIFIED: CONCERNS.md — "Auth Trigger Fragility"]

### Analysis of Call Site Options

| Option | Path Coverage | DB Load | Notes |
|--------|--------------|---------|-------|
| (a) Inside `createSupabaseServerClient` | Every server request | Very high (SELECT + conditional INSERT per request) | Unacceptable; middleware calls this on every route |
| (b) Login form server action only | Email/password login | Low | Misses: email-confirm link clicks, accept-invite flow, magic links |
| (c) Middleware | All protected routes (first hit) | High unless cached; edge runtime | Edge runtime cannot call admin client (requires service-role) — **eliminated** |
| (d) Dashboard/curso layout RSC (lazy) | First navigation after auth | Low | Misses users who never visit `/dashboard` first (e.g., deep-link to `/curso/...`) |

**Recommendation: Option (b) extended to cover all auth completion paths.**

The trigger fires on `INSERT INTO auth.users`. The gap case is when the trigger fails silently. That failure happens exactly once per user, at signup. The guardrail only needs to fire in the immediate post-signup flows:
1. Email/password login (after email confirmation click → user lands at login form)
2. Accept-invite page (`src/app/auth/accept-invite/`) — when an invited user sets their password
3. Potentially: the page that handles the email-confirmation redirect (`/auth/confirm` or equivalent)

Calling `ensureProfileExists` in the accept-invite server action and in the post-login server action covers the critical gap paths without burdening every request. The admin client call is a single `SELECT` followed by a conditional `INSERT` — total cost is ~2ms if the profile exists (SELECT only) and ~5ms if not (SELECT + INSERT). [ASSUMED: Supabase hosted latency estimates; actual cost depends on network round-trip]

**Implementation sketch:**

```typescript
// src/lib/auth/profiles.ts (addition)

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { captureMessage } from "@/lib/observability/sentry";

export async function ensureProfileExists(
  userId: string,
  metadata?: { fullName?: string }
): Promise<void> {
  const adminClient = createSupabaseAdminClient();

  // First: check if profile exists (cheap read path)
  const { data: existing, error: readError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    logger.error("ensureProfileExists: failed to read profile", { userId, error: readError.message });
    return;
  }

  if (existing) return; // common path: profile exists, do nothing

  // Guardrail fires: trigger must have failed silently
  logger.warn("ensureProfileExists: profile row missing, inserting fallback", { userId });
  captureMessage("auth_profile_trigger_gap_detected", "warning", { userId });

  const { error: insertError } = await adminClient
    .from("profiles")
    .insert({
      id: userId,
      full_name: metadata?.fullName ?? "Aluno",
      role: "student",
    });

  if (insertError) {
    logger.error("ensureProfileExists: fallback insert failed", { userId, error: insertError.message });
  }
}
```

**Call sites to add in this phase:**
- `src/app/actions/` — whichever action handles the post-login profile fetch (currently `fetchAuthenticatedUserProfile` is called directly from pages; the guardrail can wrap it or be called alongside it)
- `src/app/auth/accept-invite/` server action

The planner will determine the exact call site based on the current accept-invite flow code (not read in this research session).

---

## Q9: `docs/DEPLOY-CHECKLIST.md` Skeleton

```markdown
# Checklist de Deploy — MDHE Gestão de Incidentes

> Aplicar antes de qualquer promoção para produção. Cada item é obrigatório.
> Campos marcados com `[PROD]` são exigidos apenas no ambiente de produção.

---

## 1. Variáveis de Ambiente

Verificar que todas as variáveis abaixo estão configuradas no painel da Vercel
(Settings → Environment Variables → Production).

| Variável | Tipo | Obrigatória em Prod | Schema em `src/lib/env.ts` |
|----------|------|---------------------|---------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `clientSchema` | Sim | URL válida |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `clientSchema` | Sim | string não-vazia |
| `NEXT_PUBLIC_APP_URL` | `clientSchema` | Sim | URL válida (ex: `https://app.mdhe.com.br`) |
| `SUPABASE_SERVICE_ROLE_KEY` | `serverSchema` | **Sim `[PROD]`** | string não-vazia (fase 1 OPS-01) |
| `SUPABASE_JWT_SECRET` | `serverSchema` | Recomendado | string (opcional; validação JWT) |
| `SENTRY_DSN` | `serverSchema` | Recomendado `[PROD]` | string (ausência = degradação, não crash) |
| `LOG_LEVEL` | `serverSchema` | Não | `debug|info|warn|error` (padrão: `info`) |
| `APP_VERSION` | (runtime) | Recomendado | qualquer string; exposta em `/health` |

**Notas:**
- `NEXT_PUBLIC_CHECKOUT_URL_*` são opcionais — plataforma funciona sem checkouts no v1.
- `EMAIL_FROM` não é validado pelo `serverSchema`; é usado apenas como referência para o painel do Supabase Auth SMTP. Documentar aqui o endereço configurado: `__________________@__________________`
- A conta Resend usada para SMTP: `__________________` (API key salva em: `__________________)

---

## 2. Migrações Pendentes

Aplicar **nesta ordem** via Supabase SQL Editor (Project → SQL Editor → New Query):

1. `0012_add_institution_manager_role.sql` — Apenas `ALTER TYPE user_role ADD VALUE 'institution_manager'`. **Deve ser aplicada e commitada ANTES da 0013.**
2. `0013_institutions_enrollments.sql` — Tabelas `institutions`, `institution_members`, `enrollments` (nova estrutura), helper `is_member_of_institution`, RLS, backfill de admins.

> ⚠️ **Atenção:** Não aplique 0012 e 0013 no mesmo bloco SQL. Abra dois queries separados, aplique 0012, confirme que rodou sem erro, depois aplique 0013.

---

## 3. Smoke Tests Pós-Deploy

Executar manualmente após cada deploy de produção:

### 3.1 Health Check
```
GET https://app.mdhe.com.br/health
```
Resposta esperada (HTTP 200):
```json
{
  "status": "ok",
  "uptime": <number>,
  "timestamp": "<ISO8601>",
  "version": "<APP_VERSION>"
}
```

### 3.2 Login de Admin
1. Acessar `https://app.mdhe.com.br/login`
2. Fazer login com a conta admin seeded
3. Verificar redirecionamento para `/dashboard` sem erro 500

### 3.3 Abertura de Aula
1. No painel de admin, verificar que o admin tem enrollment no curso de teste (via backfill da 0013)
2. Acessar `/curso/[slug-do-curso-de-teste]`
3. Clicar em uma aula — deve abrir normalmente (RLS ENR-02 permite por enrollment ativo)

### 3.4 Geração de Certificado com Data Correta
1. Acessar "Meus certificados" como admin em um curso com 100% concluído
2. Baixar o certificado PDF
3. Verificar que a data exibida está no fuso horário `America/Sao_Paulo` (especialmente
   importante se o download acontecer entre 21h–23:59h de Brasília — dia deve ser o local, não o UTC do dia seguinte)

### 3.5 Email via Resend
1. Acionar "Esqueci minha senha" com um endereço Gmail de teste
2. Verificar que o email chega à caixa de entrada (não spam) com remetente `@mdhe.com.br`
3. Repetir com um endereço Outlook/Hotmail

---

## 4. Rollback

Se qualquer smoke test falhar:
- Reverter deploy no painel da Vercel (Deployments → previous deployment → Promote to Production)
- Migrações SQL não têm rollback automático; documar o estado e abrir chamado interno antes de tentar reverter schema manualmente
```

---

## Common Pitfalls

### Pitfall 1: Applying 0012 and 0013 in the Same SQL Editor Session Without Committing Between Them

**What goes wrong:** `ERROR: unsafe use of new value "institution_manager" of enum type user_role` on the first policy in 0013 that references the new role.
**Why it happens:** The Supabase SQL Editor can execute multi-statement scripts in a single transaction.
**How to avoid:** Two separate queries, each run independently so Postgres commits 0012 before 0013 begins.
**Warning signs:** Error message explicitly says "unsafe use of new value"; rollback of 0013.

### Pitfall 2: `global-error.tsx` Imports from `src/lib/observability/sentry.ts` Which Imports `getEnv()` (Server-Only)

**What goes wrong:** Next.js build error: "You're importing a component that needs `next/headers`" or "cannot be used in client components."
**Why it happens:** `getEnv()` uses `import 'server-only'` marker (or is co-located with `next/headers` imports). If the Sentry wrapper imports `getEnv()`, it cannot be imported by the client component `global-error.tsx`.
**How to avoid:** The Sentry wrapper gates on `process.env.SENTRY_DSN` directly, NOT `getEnv().SENTRY_DSN`. This keeps the wrapper's import graph clean for client use.
**Warning signs:** Build fails with a "server-only" or "next/headers" error on the `observability/sentry.ts` module.

### Pitfall 3: `formatCertificateDate` Not Exported → Test Cannot Access It

**What goes wrong:** `pdf.test.ts` cannot import the function; test fails at import.
**Why it happens:** Function is currently module-private (`function formatCertificateDate`).
**How to avoid:** Add `export` keyword. Check that no lint rule forbids unused exports in the module — none found in this repo's ESLint config.

### Pitfall 4: `database.types.ts` Not Updated Before TypeScript Compilation

**What goes wrong:** `tsc --noEmit` fails because queries to `enrollments`, `institutions`, `institution_members` reference columns that don't exist in `Database["public"]["Tables"]`.
**Why it happens:** The type file is manually maintained and does not auto-regenerate.
**How to avoid:** D-09 explicitly requires updating `database.types.ts` in the same wave as migrations. The CI `typecheck` step will catch this before deploy.

### Pitfall 5: Old `enrollments` Table in `database.types.ts` Conflicts with New Schema

**What goes wrong:** The current `database.types.ts` already has an `enrollments` table (lines 282–320) with different columns (`status`, `order_id`). [VERIFIED: codebase read]

**RESOLVED by D-20 (2026-04-27, after this research was written):** Use **additive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`**. **Do NOT use DROP + CREATE.** The legacy columns `status` (enum `enrollment_status`) and `order_id` (FK orders) are PRESERVED in the table; the new columns (`source`, `granted_at`, `expires_at`, `institution_id`) are added alongside. The `database.types.ts` update merges the new columns into the existing `enrollments` type — it does NOT remove `status` or `order_id`. RLS policies in 0013 reference only the new columns; ENR-02 active-enrollment check uses `expires_at IS NULL OR expires_at > now()`, never the legacy `status`.

**Rationale for ADD over DROP+CREATE:** zero risk of data loss in environments we haven't audited; preserves the existing UNIQUE `(user_id, course_id)` constraint and the FK to `courses`; legacy code that may still read `status` continues to work; the `orders` table referenced by `order_id` still exists from 0001 (out-of-scope for v1 but no need to break the FK).

**~~Old guidance (SUPERSEDED by D-20):~~** ~~Use DROP + CREATE for cleaner schema.~~ Do not follow this — use additive ALTER.

**Warning signs if you accidentally DROP+CREATE:** any test or piece of code that imports `Database["public"]["Enums"]["enrollment_status"]` will break the build.

### Pitfall 6: `is_member_of_institution` Created After Policies That Reference It

**What goes wrong:** `ERROR: function is_member_of_institution(uuid) does not exist` when the policy is created.
**How to avoid:** Place the `CREATE OR REPLACE FUNCTION is_member_of_institution` block BEFORE `CREATE POLICY` statements that reference it in `0013`. Within the same migration, object creation order matters.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Env validation with prod-conditional logic | Custom if/else env reader | Zod `superRefine` in `serverSchema` | Already in `src/lib/env.ts`; cache + throw semantics established |
| Sentry no-op wrapper | Custom HTTP error reporter | `@sentry/nextjs` + thin wrapper | SDK already handles `enabled: false` gracefully; wrapper adds only the guard |
| SMTP email delivery | Custom SMTP client or nodemailer config | Resend + Supabase SMTP panel | Zero app code in Phase 1; panel config only |
| RLS recursion prevention | Application-layer JOIN in every query | SECURITY DEFINER STABLE function | Postgres-native; no N+1, no extra round-trips |

---

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json` [VERIFIED: codebase read]

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.4 |
| Config file | `vitest.config.ts` (root) |
| Quick run | `npx vitest run --reporter=verbose src/lib/env.test.ts src/lib/certificates/pdf.test.ts src/lib/auth/profiles.test.ts` |
| Full suite | `npm run test:ci` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OPS-01 | `superRefine` fires and `getEnv()` throws in prod when key absent | unit | `npx vitest run src/lib/env.test.ts` | ❌ Wave 0 |
| OPS-01 | `getEnv()` does NOT throw in dev/test when key absent | unit | same file | ❌ Wave 0 |
| OPS-02 | `formatCertificateDate` returns previous day for 02:00 UTC timestamp | unit | `npx vitest run src/lib/certificates/pdf.test.ts` | ❌ Wave 0 |
| OPS-02 | `formatCertificateDate` returns same day for midday UTC timestamp | unit | same file | ❌ Wave 0 |
| OPS-03 | `captureException` no-ops when `SENTRY_DSN` is empty | unit | `npx vitest run src/lib/observability/sentry.test.ts` | ❌ Wave 0 |
| OPS-03 | `captureException` calls `Sentry.captureException` when `SENTRY_DSN` is set | unit | same file | ❌ Wave 0 |
| ENR-01 | `database.types.ts` has `enrollments` with `source`, `expires_at`, `institution_id` | typecheck | `npm run typecheck` | ❌ (manual type update) |
| ENR-02 | User without enrollment cannot read `enrollments` rows (RLS) | manual smoke | Via Supabase Studio RLS simulator | n/a |
| ENR-04 | User with expired enrollment gets no rows from `enrollments` SELECT (RLS USING check) | manual smoke | Via Supabase Studio RLS simulator | n/a |
| INST-03 | `is_member_of_institution(uuid)` returns false for non-members | SQL function test | Via Supabase SQL Editor | n/a |
| D-14 | `ensureProfileExists` inserts profile row when missing | unit | `npx vitest run src/lib/auth/profiles.test.ts` | ❌ Wave 0 |
| D-14 | `ensureProfileExists` does nothing when profile exists | unit | same file | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/env.test.ts src/lib/certificates/pdf.test.ts src/lib/observability/sentry.test.ts src/lib/auth/profiles.test.ts`
- **Per wave merge:** `npm run test:ci` (full suite)
- **Phase gate:** Full suite green + `npm run typecheck` + `npm run lint` before marking phase complete

### Wave 0 Gaps

- [ ] `src/lib/env.test.ts` — covers OPS-01 `superRefine` firing/not-firing
- [ ] `src/lib/certificates/pdf.test.ts` — covers OPS-02 timezone assertion (requires exporting `formatCertificateDate`)
- [ ] `src/lib/observability/sentry.test.ts` — covers OPS-03 no-op and call-through behavior
- [ ] `src/lib/auth/profiles.test.ts` — covers D-14 `ensureProfileExists` guardrail logic

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Enrollments table: `status` + `order_id` (order-based) | Enrollments table: `source` enum + `expires_at` + `institution_id` (multi-source) | Phase 1 (0013) | Drop+recreate required; `enrollment_status` enum likely deprecated |
| `formatCertificateDate` uses UTC timezone | Uses `America/Sao_Paulo` | Phase 1 | Test case at 02:00 UTC shifts day |
| Sentry called directly in `global-error.tsx` | Called via `src/lib/observability/sentry.ts` wrapper | Phase 1 | Consistent no-op behavior when DSN absent |

**Deprecated after Phase 1:**
- `enrollment_status` enum (`ACTIVE | INACTIVE | COMPLETED`) — replaced by `expires_at` logic and a new `enrollment_source` enum. The old `enrollments` table structure (with `status` and `order_id`) is dropped.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20 | Build + runtime | ✓ (CI pinned) | 20.x | — |
| Supabase CLI | Migration apply | [ASSUMED] | — | Manual via SQL Editor (documented in checklist) |
| Resend account | EMAIL-01/02 | Operator-provisioned | — | Supabase default SMTP (4 emails/hour limit — not acceptable for prod) |

**Missing dependencies with no fallback:**
- Active Resend account with verified domain DNS — blocks EMAIL-01/02. Must be provisioned before marking Phase 1 complete.

**Missing dependencies with fallback:**
- Supabase CLI — can use SQL Editor manually (current workflow per CLAUDE.md).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Creating a new enum type (`enrollment_source`) and using it in CREATE TABLE in the same transaction is allowed (only ADD VALUE to existing enum triggers the restriction) | Q3 | If wrong: 0013 would need a third migration for `enrollment_source` |
| A2 | Supabase SQL Editor opens a new session/transaction per query execution (so 0012 is committed before 0013 begins) | Q3 | If wrong: instructions in deploy checklist need explicit guidance on using separate sessions |
| A3 | `institution_members` FK column to `profiles` is named `profile_id` | Q4 | If wrong: planner must rename in SQL and TypeScript types |
| A4 | (RESOLVED by D-20) Additive ALTER strategy preserves all existing rows; assumption no longer relevant. Legacy `status` and `order_id` columns stay in the table. | Q5 | n/a |
| A5 | Resend SMTP routes via AWS SES global infrastructure (Brazil latency 80–200ms) | Q6 | If wrong: latency may be higher; no practical fix available in Phase 1 |
| A6 | `ensureProfileExists` admin client call is ~2ms for existing profiles | Q8 | If wrong: higher latency; may need caching |

---

## Open Questions

1. **Existing `enrollments` table conflict**
   - What we know: `database.types.ts` shows an `enrollments` table with `status: enrollment_status` and `order_id`. The 0013 migration creates a completely different schema for enrollments.
   - What's unclear: Are there any existing enrollment rows in the database that should be migrated? The backfill only covers admin accounts — but are there any `status: 'ACTIVE'` rows from earlier testing that represent real student access?
   - Recommendation: Planner should add a task to check existing `enrollments` row count before writing the DROP+CREATE migration. If non-zero rows exist with real data, a `SELECT` preservation step is needed before `DROP`.

2. **`formatCertificateDate` visibility**
   - What we know: It is currently a module-private function in `pdf.ts`.
   - What's unclear: Whether the planner wants to export it directly or wrap it behind a test-only export path.
   - Recommendation: Use `export function formatCertificateDate` — cleanest pattern matching the codebase's zero-barrier export style.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/lib/env.ts`, `src/lib/certificates/pdf.ts`, `src/app/global-error.tsx`, `src/lib/auth/profiles.ts`, `src/lib/database.types.ts`, `src/lib/logger.ts`, `sentry.*.config.ts`, `supabase/migrations/0010`, `0011`, `vitest.config.ts` — all verified via direct file reads
- PostgreSQL docs — [ALTER TYPE](https://www.postgresql.org/docs/current/sql-altertype.html) — transaction restriction for ADD VALUE
- Supabase SMTP docs — [auth-smtp](https://supabase.com/docs/guides/auth/auth-smtp)
- Resend SMTP setup — [send-with-supabase-smtp](https://resend.com/docs/send-with-supabase-smtp)
- MDN: Intl.DateTimeFormat `timeZone` option — deterministic output independent of host TZ

### Secondary (MEDIUM confidence)
- Sentry Next.js docs — [nextjs guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/) — `enabled: Boolean(DSN)` behavior, `getClient()` vs `isInitialized()` distinction in v8+
- Resend blog — [configure-supabase-domain](https://resend.com/blog/how-to-configure-supabase-to-send-emails-from-your-domain) — SMTP host `smtp.resend.com`, port `465`, username `resend`

### Tertiary (LOW confidence / ASSUMED)
- TypeORM #1169, Prisma #5290 — community confirmation of Postgres enum transaction error (corroborates official docs, not an authoritative source itself)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified from `package.json` and codebase source
- Architecture (migration sequencing, RLS patterns): HIGH — verified against official Postgres docs and existing migration style
- Resend SMTP config: MEDIUM — SMTP credentials verified; DNS record formats based on docs and common SPF/DKIM standards
- Pitfalls: HIGH — derived from codebase analysis and official Postgres documentation

**Research date:** 2026-04-27
**Valid until:** 2026-07-27 (stable stack — Next.js 16, Supabase, Zod 3, @sentry/nextjs 10 are not in active breaking-change cycles)
