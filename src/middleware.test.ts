// src/middleware.test.ts
//
// INST-05: /gestor route gating + regression coverage for the existing /admin gate.
// This file lives in src/ so Vitest's `include: ["src/**/*.test.{ts,tsx}"]` picks it up
// (root-level test files would be invisible). It imports the real middleware from
// `../middleware`, which resolves to repo-root middleware.ts — the actual Next.js
// middleware entry. Colocating the test in src/ does NOT alter Next.js routing.
//
// Test technique: we mock `@supabase/ssr` (so `getUser` returns whatever the test
// wants) and `@/lib/auth/roles` (so `fetchUserRole` returns the role under test),
// then invoke the exported `middleware(request)` with synthesized NextRequest
// objects and assert on the returned NextResponse (status + Location header).
//
// We intentionally do NOT mock `next/server`; NextRequest/NextResponse work fine
// under Vitest's node environment, and bypassing them would weaken the test of
// the real cookie/redirect surface that the middleware uses.
//
// Pattern source: src/app/actions/grant-enrollment.test.ts (vi.mock boilerplate).

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({ fetchUserRole: vi.fn() }));

vi.mock("@/lib/env", () => ({
  getEnv: vi.fn(() => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  })),
}));

import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";

import { fetchUserRole } from "@/lib/auth/roles";

import { middleware, config } from "../middleware";

function makeRequest(path: string): NextRequest {
  const url = `https://example.com${path}`;
  return new NextRequest(url);
}

function mockSupabaseUser(user: { id: string } | null) {
  vi.mocked(createServerClient).mockImplementation(
    () =>
      ({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
        },
      }) as never,
  );
}

describe("middleware /gestor gate (INST-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated request on /gestor to /login?redirectTo=/gestor", async () => {
    mockSupabaseUser(null);

    const response = await middleware(makeRequest("/gestor"));

    expect(response.status).toBe(307); // NextResponse.redirect default
    const location = response.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("redirectTo=%2Fgestor");
  });

  it("redirects authenticated user with role='student' on /gestor to /dashboard", async () => {
    mockSupabaseUser({ id: "student-1" });
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const response = await middleware(makeRequest("/gestor"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("redirects authenticated user with role='admin' on /gestor to /admin/instituicoes (D-02)", async () => {
    mockSupabaseUser({ id: "admin-1" });
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const response = await middleware(makeRequest("/gestor"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/admin/instituicoes");
  });

  it("allows authenticated user with role='institution_manager' on /gestor to proceed", async () => {
    mockSupabaseUser({ id: "manager-1" });
    vi.mocked(fetchUserRole).mockResolvedValue("institution_manager");

    const response = await middleware(makeRequest("/gestor"));

    // No redirect — middleware returns the original NextResponse.next() unchanged.
    // The pass-through response has no Location header (only set on redirects).
    expect(response.headers.get("location")).toBeNull();
    // Sanity: status is not a 3xx redirect.
    expect(response.status).toBeLessThan(300);
  });

  it("does NOT query institution_members in middleware — orphan check is in /gestor/page.tsx (D-04 + Pitfall 1)", async () => {
    mockSupabaseUser({ id: "manager-1" });
    vi.mocked(fetchUserRole).mockResolvedValue("institution_manager");

    const response = await middleware(makeRequest("/gestor"));

    // The middleware should NOT touch institution_members. fetchUserRole is the only
    // role lookup; the supabase client returned by createServerClient has only
    // `auth.getUser`. No `.from("institution_members")` call shape is exposed.
    // Manager passes through; the orphan check happens later in /gestor/page.tsx.
    expect(response.headers.get("location")).toBeNull();
    expect(vi.mocked(fetchUserRole)).toHaveBeenCalledTimes(1);
  });
});

describe("middleware /admin gate (regression — must still work)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects authenticated user with role='institution_manager' on /admin to /dashboard (admin-only ring still enforced)", async () => {
    mockSupabaseUser({ id: "manager-1" });
    vi.mocked(fetchUserRole).mockResolvedValue("institution_manager");

    const response = await middleware(makeRequest("/admin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("allows authenticated user with role='admin' on /admin to proceed", async () => {
    mockSupabaseUser({ id: "admin-1" });
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const response = await middleware(makeRequest("/admin"));

    // Admin passes through the admin gate; no redirect.
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBeLessThan(300);
  });
});

describe("middleware matcher config", () => {
  it("matcher includes '/gestor/:path*' (exact verification by importing config and asserting array contents)", () => {
    expect(config.matcher).toContain("/gestor/:path*");
  });

  it("matcher preserves the existing 3-ring entries (regression)", () => {
    expect(config.matcher).toContain("/dashboard/:path*");
    expect(config.matcher).toContain("/curso/:path*");
    expect(config.matcher).toContain("/admin/:path*");
    expect(config.matcher).toContain("/login");
  });
});
