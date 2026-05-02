// src/middleware.test.ts
//
// Wave 0 scaffold for INST-05: /gestor route gating.
// Production middleware extension lands in plan 05-06.
//
// LOCATION RATIONALE (B-3): vitest.config.ts line 13 sets `include: ["src/**/*.test.{ts,tsx}"]`
// — root-level test files are invisible to Vitest. This scaffold lives in src/ and imports the
// real middleware from `../middleware` (resolves to repo-root middleware.ts, which is the actual
// Next.js middleware entry — colocating the test in src/ does NOT alter Next.js routing).
//
// Pattern source: grant-enrollment.test.ts mock boilerplate.
// NOTE: Next.js middleware testing in this repo has no precedent. We test the
// pure routing logic by mocking @supabase/ssr and @/lib/auth/roles, then
// invoking the exported `middleware(request)` with synthesized NextRequest objects.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
}));

vi.mock("@/lib/auth/roles", () => ({ fetchUserRole: vi.fn() }));

// Plan 05-06 will add:
// import { middleware } from "../middleware";  // resolves to repo-root middleware.ts
// import { NextRequest } from "next/server";

describe("middleware /gestor gate (INST-05)", () => {
  beforeEach(() => vi.clearAllMocks());

  it.todo("redirects unauthenticated request on /gestor to /login?redirectTo=/gestor");
  it.todo("redirects authenticated user with role='student' on /gestor to /dashboard");
  it.todo("redirects authenticated user with role='admin' on /gestor to /admin/instituicoes (D-02)");
  it.todo("allows authenticated user with role='institution_manager' on /gestor to proceed");
  it.todo("does NOT query institution_members in middleware — orphan check is in /gestor/page.tsx (D-04 + Pitfall 1)");
});

describe("middleware /admin gate (regression — must still work)", () => {
  beforeEach(() => vi.clearAllMocks());

  it.todo("redirects authenticated user with role='institution_manager' on /admin to /dashboard (admin-only ring still enforced)");
  it.todo("allows authenticated user with role='admin' on /admin to proceed");
});

describe("middleware matcher config", () => {
  it.todo("matcher includes '/gestor/:path*' (exact verification by importing config and asserting array contents)");
});

// W-6 fix: sentinel wrapped in describe() block for consistent Vitest output.
describe("scaffold", () => {
  it("placeholder", () => {
    expect(true).toBe(true);
  });
});
