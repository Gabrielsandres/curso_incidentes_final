// src/app/actions/search-students-for-institution.test.ts
//
// Wave 0 scaffold for INST-08: searchStudentsForInstitution server action (autocomplete
// for "Adicionar aluno existente" UX).
// Production module created in plan 05-05; until then these are it.todo placeholders.
//
// Pattern source: src/app/actions/grant-enrollment.test.ts (lines 1-46 vi.mock block,
// lines 47-95 mock factories — replicate verbatim when filling in test bodies).

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
// Plan 05-05 will add: import { searchStudentsForInstitution } from "./search-students-for-institution";

describe("searchStudentsForInstitution", () => {
  beforeEach(() => vi.clearAllMocks());

  it.todo("returns [] for non-admin caller");
  it.todo("returns [] for query length < 2");
  it.todo("excludes profile_ids already in institution_members");
  it.todo("filters by full_name OR email (ilike) and limits to 20 results");
  it.todo("returns shape { id, fullName, email }");
});

// W-6 fix: sentinel wrapped in describe() block for consistent Vitest output.
describe("scaffold", () => {
  it("placeholder", () => {
    expect(true).toBe(true);
  });
});
