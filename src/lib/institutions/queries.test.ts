// src/lib/institutions/queries.test.ts
//
// Wave 0 scaffold for INST-06 + INST-07: per-team progress matrix + certs queries.
// Production module created in plan 05-03; production data populated by 05-05 actions.
//
// Pattern source: src/lib/courses/queries.test.ts (mocked Supabase chain pattern).

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Plan 05-03 will add:
// import {
//   getInstitutionForManager,
//   getInstitutionMembersWithProgress,
//   getInstitutionCertificates,
// } from "./queries";

describe("getInstitutionForManager", () => {
  beforeEach(() => vi.clearAllMocks());

  it.todo("returns null for orphan manager (zero institution_members rows for user_id with role='manager')");
  it.todo("returns the resolved institution row when user is the manager of exactly one institution");
  it.todo("uses the RLS-respecting server client (NOT admin client) — verifies CONTEXT D-04");
});

describe("getInstitutionMembersWithProgress", () => {
  beforeEach(() => vi.clearAllMocks());

  it.todo("returns [] when no members are linked to the institution");
  it.todo("only returns members of the requested institutionId (verifies INST-06 isolation)");
  it.todo("includes expired enrollments with enrollmentExpired: true (verifies ENR-04 + D-12 admin bypass)");
  it.todo("computes completionPercentage = round(completedLessons / totalLessons * 100)");
  it.todo("excludes deleted lessons (deleted_at IS NOT NULL) from totalLessons");
  it.todo("uses admin client — verifies D-12 bypass (justified by RLS expired-enrollment carve-out)");
});

describe("getInstitutionCertificates", () => {
  beforeEach(() => vi.clearAllMocks());

  it.todo("returns certs ordered by issued_at DESC (verifies UI-SPEC sort)");
  it.todo("only returns certs for users in the institution");
  it.todo("includes student_name, course_title, issued_at, certificate_code in each row");
  it.todo("returns [] on Supabase error (logs via logger.error, does not throw)");
});

// W-6 fix: sentinel wrapped in describe() block for consistent Vitest output.
describe("scaffold", () => {
  it("placeholder", () => {
    expect(true).toBe(true);
  });
});
