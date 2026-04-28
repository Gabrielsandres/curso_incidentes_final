# Phase 1: Foundation - Pattern Map

**Mapped:** 2026-04-27
**Files analyzed:** 14 (6 modified, 8 created)
**Analogs found:** 13 / 14 (1 file has no close analog — `src/lib/observability/sentry.ts`)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/env.ts` (modify) | config/validation | request-response | `src/lib/env.ts` itself — extend in place | exact |
| `src/lib/env.test.ts` (augment) | test | — | `src/lib/env.test.ts` (existing) | exact |
| `src/app/global-error.tsx` (modify) | component | event-driven | `src/app/global-error.tsx` itself — swap import | exact |
| `src/lib/auth/profiles.ts` (modify) | service | request-response | `src/lib/auth/profiles.ts` itself + `src/app/actions/create-institutional-lead.ts` | exact |
| `src/lib/auth/profiles.test.ts` (create) | test | — | `src/lib/certificates/issuer.test.ts` | role-match |
| `src/lib/certificates/pdf.ts` (modify) | utility | transform | `src/lib/certificates/pdf.ts` itself — one-line change | exact |
| `src/lib/certificates/pdf.test.ts` (create) | test | — | `src/lib/certificates/issuer.test.ts` + `src/lib/courses/schema.test.ts` | role-match |
| `src/lib/database.types.ts` (modify) | model | — | `src/lib/database.types.ts` itself — hand-edit | exact |
| `src/lib/observability/sentry.ts` (create) | utility | event-driven | `src/app/actions/create-institutional-lead.ts` (Sentry call pattern) | partial |
| `src/lib/observability/sentry.test.ts` (create) | test | — | `src/lib/certificates/issuer.test.ts` (vi.fn mock pattern) | role-match |
| `supabase/migrations/0012_add_institution_manager_role.sql` (create) | migration | — | `supabase/migrations/0010_make_auth_profile_trigger_fail_safe.sql` | role-match |
| `supabase/migrations/0013_institutions_enrollments.sql` (create) | migration | CRUD | `supabase/migrations/0011_courses_and_certificates.sql` | exact |
| `README.md` (modify) | docs | — | `README.md` existing migration list | exact |
| `docs/DEPLOY-CHECKLIST.md` (create) | docs | — | No close analog (first checklist doc) | none |

---

## Pattern Assignments

### `src/lib/env.ts` (modify — add `superRefine` to `serverSchema`)

**Analog:** `src/lib/env.ts` lines 31–36 (current `serverSchema`); Zod shape stays identical.

**Current `serverSchema` block** (lines 31–36):
```typescript
const serverSchema = clientSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});
```

**Target pattern — replace `SUPABASE_SERVICE_ROLE_KEY` line only:**
```typescript
const serverSchema = clientSchema.extend({
  // Prod-required; stays optional in dev/test so local devs don't need the secret.
  // superRefine fires inside safeParse — getEnv() throws on cold boot in production
  // if the key is absent, same throw semantics as the rest of serverSchema.
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

**Cache/error pattern preserved** (lines 49–66): `getEnv()`, `safeParse`, `console.error`, throw — no change needed.

**`resetEnvCache()` pattern** (lines 101–103): stays untouched; tests rely on it.

---

### `src/lib/env.test.ts` (augment — add prod-mode test cases)

**Analog:** `src/lib/env.test.ts` lines 1–51 (complete existing file).

**Existing test structure to preserve** (lines 1–51):
```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClientEnv, getEnv, resetEnvCache } from "./env";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  resetEnvCache();
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  };
});

afterEach(() => {
  resetEnvCache();
  process.env = { ...ORIGINAL_ENV };
});
```

**New `describe` block to append** — follows same `process.env` mutation + `resetEnvCache()` pattern:
```typescript
describe("SUPABASE_SERVICE_ROLE_KEY prod refinement", () => {
  it("throws when NODE_ENV=production and key is absent", () => {
    const origNodeEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
    });
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetEnvCache();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => getEnv()).toThrowError();

    consoleSpy.mockRestore();
    Object.defineProperty(process.env, "NODE_ENV", {
      value: origNodeEnv,
      configurable: true,
    });
    resetEnvCache();
  });

  it("does not throw when NODE_ENV=test and key is absent", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetEnvCache();
    expect(() => getEnv()).not.toThrow();
  });
});
```

**Key pattern:** `vi.spyOn(console, "error").mockImplementation(() => undefined)` — already used in existing test at line 46. Suppress the console error output in the throw-path test.

---

### `src/app/global-error.tsx` (modify — swap Sentry import)

**Analog:** `src/app/global-error.tsx` lines 1–41 (complete file); `src/app/actions/create-institutional-lead.ts` lines 3, 57–59 (Sentry call pattern).

**Current import** (line 5):
```typescript
import * as Sentry from "@sentry/nextjs";
```

**Current call site** (line 14):
```typescript
Sentry.captureException(error);
```

**Target pattern — replace both:**
```typescript
// Line 5 replacement:
import { captureException } from "@/lib/observability/sentry";

// Line 14 replacement:
captureException(error);
```

**Rest of the file is unchanged.** `"use client"` directive on line 1 must stay; the Sentry wrapper must not import `getEnv()` (server-only) — see Shared Patterns below.

---

### `src/lib/auth/profiles.ts` (modify — add `ensureProfileExists`)

**Analog:** `src/lib/auth/profiles.ts` lines 1–40 (complete file — import pattern, logger usage, admin client usage pattern from `src/app/actions/create-institutional-lead.ts`).

**Existing import block** (lines 1–4):
```typescript
import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { logger } from "@/lib/logger";
```

**Imports to add:**
```typescript
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { captureMessage } from "@/lib/observability/sentry";
```

**Admin client call pattern** (from `create-institutional-lead.ts` lines 45–53):
```typescript
const supabase = createSupabaseAdminClient();
const { error } = await supabase.from("institutional_leads").insert({ ... });
if (error) {
  logger.error("Falha ao registrar lead institucional", error.message);
  captureException(...);
  return { ... };
}
```

**Existing `.maybeSingle()` pattern** (profiles.ts lines 10–14):
```typescript
const { data, error } = await client
  .from("profiles")
  .select("id, full_name, role, created_at, updated_at")
  .eq("id", userId)
  .maybeSingle();
```

**New function to add** (append at end of file, mirrors existing function style):
```typescript
export async function ensureProfileExists(
  userId: string,
  metadata?: { fullName?: string }
): Promise<void> {
  const adminClient = createSupabaseAdminClient();

  const { data: existing, error: readError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    logger.error("ensureProfileExists: failed to read profile", {
      userId,
      error: readError.message,
    });
    return;
  }

  if (existing) return; // common path: profile exists

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
    logger.error("ensureProfileExists: fallback insert failed", {
      userId,
      error: insertError.message,
    });
  }
}
```

---

### `src/lib/auth/profiles.test.ts` (create)

**Analog:** `src/lib/certificates/issuer.test.ts` lines 1–283 (vi.fn mock-chain pattern for Supabase client).

**File structure pattern** (from issuer.test.ts lines 1–4, 186):
```typescript
import { describe, expect, it, vi } from "vitest";
// Note: no afterEach/beforeEach needed when mocks are inline per test

describe("ensureProfileExists", () => {
  it("does nothing when profile row already exists", async () => { ... });
  it("inserts fallback row when profile is missing", async () => { ... });
  it("logs error and returns when admin client read fails", async () => { ... });
});
```

**Mock Supabase admin client pattern** (from issuer.test.ts lines 44–184 — condensed shape):
```typescript
// Minimal mock for profiles table .select().eq().maybeSingle()
const maybeSingle = vi.fn(async () => ({ data: { id: "user-1" }, error: null }));
const from = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({ maybeSingle })),
  })),
  insert: vi.fn(async () => ({ error: null })),
}));
const mockAdminClient = { from } as unknown;
```

**Module mock pattern** — mock `@/lib/supabase/admin` to return the mock client:
```typescript
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => mockAdminClient,
}));
```

**Sentry wrapper mock** — mock `@/lib/observability/sentry`:
```typescript
vi.mock("@/lib/observability/sentry", () => ({
  captureMessage: vi.fn(),
}));
```

---

### `src/lib/certificates/pdf.ts` (modify — timezone fix + export)

**Analog:** `src/lib/certificates/pdf.ts` lines 100–107 (the `formatCertificateDate` function).

**Current function** (lines 100–107):
```typescript
function formatCertificateDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}
```

**Target pattern — two changes: add `export`, change `timeZone`:**
```typescript
export function formatCertificateDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}
```

No other changes to `pdf.ts`. The call site at line 54 (`const safeDate = formatCertificateDate(params.issuedAt)`) is unaffected.

---

### `src/lib/certificates/pdf.test.ts` (create)

**Analog:** `src/lib/courses/schema.test.ts` lines 1–72 (simple pure-function test without mocks).

**File structure pattern** (from schema.test.ts lines 1–4):
```typescript
import { describe, expect, it } from "vitest";

import { formatCertificateDate } from "@/lib/certificates/pdf";

describe("formatCertificateDate", () => {
  it("formats date in America/Sao_Paulo timezone, not UTC", () => {
    // 2026-04-27T02:00:00Z = 2026-04-26T23:00:00 in America/Sao_Paulo (UTC-3)
    const utcMidnight = new Date("2026-04-27T02:00:00Z");
    expect(formatCertificateDate(utcMidnight)).toBe("26/04/2026");
  });

  it("formats midday UTC date without day shift in SP", () => {
    // 2026-04-27T15:00:00Z = 2026-04-27T12:00:00 in SP — same day
    const noon = new Date("2026-04-27T15:00:00Z");
    expect(formatCertificateDate(noon)).toBe("27/04/2026");
  });
});
```

No mocks needed — `Intl.DateTimeFormat` with explicit `timeZone` is deterministic regardless of host `TZ`.

---

### `src/lib/observability/sentry.ts` (create)

**No exact analog exists.** Closest partial analog: `src/app/actions/create-institutional-lead.ts` lines 3, 57–59 (direct `captureException` call pattern that this wrapper replaces).

**Logger import pattern** (from `src/lib/logger.ts` — used exactly as exported):
```typescript
import { logger } from "@/lib/logger";
```
`logger.warn(...)` signature is variadic `(...messages: unknown[])` — pass a string as first arg, optional context object as second.

**Pattern to implement** (gates on `process.env.SENTRY_DSN` directly — NOT `getEnv()` — to be safe for `"use client"` import chains):
```typescript
// src/lib/observability/sentry.ts
// NOT marked "use server" — must be importable from client components (global-error.tsx).
// Gates on process.env.SENTRY_DSN directly (not getEnv()) to keep import graph
// free of server-only modules like next/headers.

import * as Sentry from "@sentry/nextjs";

import { logger } from "@/lib/logger";

export type SentryContext = Record<string, unknown>;
export type SeverityLevel = "fatal" | "error" | "warning" | "log" | "info" | "debug";

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

---

### `src/lib/observability/sentry.test.ts` (create)

**Analog:** `src/lib/certificates/issuer.test.ts` lines 1–4 (import + vi.fn pattern); `src/lib/env.test.ts` lines 7–20 (`process.env` mutation + cleanup pattern).

**File structure:**
```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock @sentry/nextjs before importing the wrapper
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import * as SentrySDK from "@sentry/nextjs";
import { captureException, captureMessage } from "@/lib/observability/sentry";

const ORIGINAL_SENTRY_DSN = process.env.SENTRY_DSN;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  if (ORIGINAL_SENTRY_DSN !== undefined) {
    process.env.SENTRY_DSN = ORIGINAL_SENTRY_DSN;
  } else {
    delete process.env.SENTRY_DSN;
  }
});

describe("captureException", () => {
  it("no-ops when SENTRY_DSN is absent", () => {
    delete process.env.SENTRY_DSN;
    captureException(new Error("test"));
    expect(SentrySDK.captureException).not.toHaveBeenCalled();
  });

  it("calls Sentry.captureException when SENTRY_DSN is set", () => {
    process.env.SENTRY_DSN = "https://example@sentry.io/1";
    const err = new Error("test");
    captureException(err, { key: "value" });
    expect(SentrySDK.captureException).toHaveBeenCalledWith(err, {
      extra: { key: "value" },
    });
  });
});

describe("captureMessage", () => {
  it("no-ops when SENTRY_DSN is absent", () => {
    delete process.env.SENTRY_DSN;
    captureMessage("hello");
    expect(SentrySDK.captureMessage).not.toHaveBeenCalled();
  });

  it("calls Sentry.captureMessage with level when DSN is set", () => {
    process.env.SENTRY_DSN = "https://example@sentry.io/1";
    captureMessage("hello", "warning");
    expect(SentrySDK.captureMessage).toHaveBeenCalledWith("hello", {
      level: "warning",
      extra: undefined,
    });
  });
});
```

**Critical note:** `_warnedOnce` is module-level state. Tests that check the "warn once in prod" branch need to reset the module between runs using `vi.resetModules()`. For simplicity, tests above focus on the DSN-absent no-op and DSN-present call-through paths only, avoiding the `_warnedOnce` module state issue.

---

### `supabase/migrations/0012_add_institution_manager_role.sql` (create)

**Analog:** `supabase/migrations/0010_make_auth_profile_trigger_fail_safe.sql` — single-purpose migration, no transaction wrapping needed.

**Pattern: minimal, idempotent ALTER TYPE:**
```sql
-- 0012_add_institution_manager_role.sql
-- Isolated migration: ALTER TYPE only.
-- MUST be applied and committed (separate query run) BEFORE 0013,
-- which references this value in RLS policies.
-- IF NOT EXISTS makes it safe to re-run if accidentally applied twice.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'institution_manager';
```

**Style rules from 0010/0011:** lowercase SQL keywords, `public.` schema prefix, comment block at top explaining the purpose and any run-order constraint.

---

### `supabase/migrations/0013_institutions_enrollments.sql` (create)

**Analog:** `supabase/migrations/0011_courses_and_certificates.sql` — closest style match (CREATE TABLE, indexes, RLS enable, DROP POLICY IF EXISTS + CREATE POLICY, service_role bypass, idempotent guards).

**Style rules from 0011** (lines 1–98):
- `create table if not exists public.<name>` — lowercase, `if not exists`
- `id uuid primary key default gen_random_uuid()`
- `timestamptz not null default now()` for timestamps
- `references auth.users(id) on delete cascade` for user FKs
- `references public.<table>(id) on delete cascade` for entity FKs
- `create index if not exists idx_<table>_<col> on public.<table> (<col>)`
- `alter table public.<name> enable row level security`
- `drop policy if exists "<Policy name>" on public.<name>`; then `create policy`
- Policy naming style: `"<Actors> <verb> <scope>"` (e.g., `"Users can read own course certificates"`)
- Service role bypass policy always present:
  ```sql
  drop policy if exists "Service role manages <table>" on public.<table>;
  create policy "Service role manages <table>"
    on public.<table>
    for all
    to service_role
    using (true)
    with check (true);
  ```

**Admin existence check pattern** (from 0011 lines 69–80):
```sql
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
```

**Object creation order within 0013:**
1. `CREATE TYPE public.enrollment_source AS ENUM (...)` — new enum (safe in same tx)
2. `CREATE OR REPLACE FUNCTION public.is_member_of_institution(...)` — must precede policies that call it
3. `CREATE TABLE public.institutions ...`
4. `CREATE TABLE public.institution_members ...`
5. `ALTER TABLE public.enrollments ADD COLUMN ...` (additive per D-20)
6. Indexes on new columns
7. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for all three tables
8. All `DROP POLICY IF EXISTS` + `CREATE POLICY` blocks
9. Backfill `INSERT INTO public.enrollments ... ON CONFLICT DO NOTHING`

**Existing `enrollments` table note (D-20):** The table already exists from `0001_initial_schema.sql` (lines 82–90). Migration 0013 uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for each new column, NOT `DROP + CREATE`. The UNIQUE constraint `(user_id, course_id)` already exists from 0001 — no need to re-add it.

**Idempotent backfill pattern** (from RESEARCH.md Q5):
```sql
INSERT INTO public.enrollments (user_id, course_id, source, granted_at, expires_at, institution_id)
SELECT
  p.id,
  c.id,
  'admin_grant',
  now(),
  NULL,
  NULL
FROM public.profiles p
CROSS JOIN public.courses c
WHERE p.role = 'admin'
ON CONFLICT (user_id, course_id) DO NOTHING;
```

---

### `src/lib/database.types.ts` (modify)

**Analog:** `src/lib/database.types.ts` itself — hand-edit to add new tables/enum values. No codegen.

**Pattern from RESEARCH.md Pitfall 5:** The existing `enrollments` entry in `database.types.ts` (currently reflects `status: enrollment_status` and `order_id`) must be replaced to reflect the new columns added in 0013 (`source`, `granted_at`, `expires_at`, `institution_id`). The old columns (`status`, `order_id`, `created_at`) stay as they are in the DB and thus remain in the type.

**New enum values to add:**
- `user_role`: add `"institution_manager"` to the existing union
- New enum: `enrollment_source: "admin_grant" | "b2b_invite" | "b2c_purchase"`

**New tables to add (Row/Insert/Update shape):** `institutions`, `institution_members`.

**Pattern for existing table extension:** Find the `enrollments` table entry and add the new columns to `Row`, `Insert`, and `Update` shapes while keeping `status`, `order_id`, `created_at`.

---

## Shared Patterns

### Logger Usage
**Source:** `src/lib/logger.ts` lines 22–43
**Apply to:** `src/lib/observability/sentry.ts`, `src/lib/auth/profiles.ts`
```typescript
import { logger } from "@/lib/logger";

logger.warn("message string", optionalContextObject);
logger.error("message string", { key: "value" });
logger.info("message string", { key: "value" });
```
Variadic `(...messages: unknown[])` — pass the string first, then any additional context values as separate args.

### Admin Client Instantiation
**Source:** `src/lib/supabase/admin.ts` lines 1–19; `src/app/actions/create-institutional-lead.ts` lines 45–53
**Apply to:** `src/lib/auth/profiles.ts` (`ensureProfileExists`)
```typescript
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const adminClient = createSupabaseAdminClient();
const { data, error } = await adminClient
  .from("profiles")
  .select("id")
  .eq("id", userId)
  .maybeSingle();
```
`createSupabaseAdminClient()` already throws if `SUPABASE_SERVICE_ROLE_KEY` is missing (admin.ts lines 9–11). No redundant guard needed in callers.

### Supabase Query Error Handling
**Source:** `src/lib/auth/profiles.ts` lines 16–21; `src/app/actions/create-institutional-lead.ts` lines 55–63
**Apply to:** `src/lib/auth/profiles.ts` (`ensureProfileExists`)
```typescript
if (error) {
  logger.error("Human-readable context", { userId, error: error.message, code: error.code });
  return null; // or void
}
```

### RLS Policy Admin-Check Sub-Select
**Source:** `supabase/migrations/0011_courses_and_certificates.sql` lines 70–81
**Apply to:** All admin-gated policies in `0013_institutions_enrollments.sql`
```sql
exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin'
)
```

### Vitest Test File Structure (no jsdom)
**Source:** `vitest.config.ts` lines 1–15 (`environment: "node"`, `@` alias)
**Apply to:** All new `*.test.ts` files
```typescript
// environment: "node" — no DOM globals available
// Use @/ alias for imports (maps to src/)
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { functionUnderTest } from "@/lib/path/to/module";
```
No import of `@testing-library/*` or `jsdom` — tests target pure functions and server logic only.

### Sentry Call Wrapper Import (post-D-04)
**Source:** `src/lib/observability/sentry.ts` (new file, this phase)
**Apply to:** `src/app/global-error.tsx`, `src/lib/auth/profiles.ts`, and any future direct Sentry call sites
```typescript
import { captureException, captureMessage } from "@/lib/observability/sentry";
// NOT: import * as Sentry from "@sentry/nextjs"
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `docs/DEPLOY-CHECKLIST.md` | docs | — | First operational checklist document in the repo; RESEARCH.md Q9 provides the full skeleton to use directly |

---

## Metadata

**Analog search scope:** `src/lib/`, `src/app/`, `supabase/migrations/`, `vitest.config.ts`
**Files read:** 15
**Pattern extraction date:** 2026-04-27
