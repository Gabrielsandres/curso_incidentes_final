// src/app/actions/promote-institution-manager.test.ts
//
// Wave 0 scaffold for INST-08: promoteInstitutionManagerAction + demoteInstitutionManagerAction.
// Production module created in plan 05-05; until then these are it.todo placeholders.
//
// Pattern source: src/app/actions/grant-enrollment.test.ts (lines 1-46 vi.mock block,
// lines 47-95 mock factories — replicate verbatim when filling in test bodies).
// See also: 05-RESEARCH.md §Code Examples §Example 5 (full promote test).

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/auth/roles", () => ({ fetchUserRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Imports of the production module are DELIBERATELY omitted in Wave 0.
// Plan 05-05 will add: import { promoteInstitutionManagerAction, demoteInstitutionManagerAction } from "./promote-institution-manager";

describe("promoteInstitutionManagerAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it.todo("rejects non-admin callers");
  it.todo("calls promote_institution_manager RPC with p_institution_id and p_new_manager_profile_id");
  it.todo("returns success message on happy path");
  it.todo("captures Sentry exception when RPC returns error");
  it.todo("calls revalidatePath('/admin/instituicoes/{slug}')");
});

describe("demoteInstitutionManagerAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it.todo("rejects non-admin callers");
  it.todo("calls demote_institution_manager RPC with p_institution_id and p_profile_id");
  it.todo("returns success message on happy path");
});

// W-6 fix: sentinel wrapped in describe() block for consistent Vitest output.
describe("scaffold", () => {
  it("placeholder", () => {
    expect(true).toBe(true);
  });
});
