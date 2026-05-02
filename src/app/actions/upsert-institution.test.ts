// src/app/actions/upsert-institution.test.ts
//
// Wave 0 scaffold for INST-08: createInstitutionAction + updateInstitutionAction.
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
// Plan 05-05 will add: import { createInstitutionAction, updateInstitutionAction } from "./upsert-institution";

describe("createInstitutionAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it.todo("rejects non-admin callers with errorMessage 'Voce nao tem permissao'");
  it.todo("rejects payload with empty name (Zod fieldErrors.name set)");
  it.todo("rejects payload with invalid slug (regex violation)");
  it.todo("returns success with redirect path /admin/instituicoes/{slug} on happy path");
  it.todo("translates Postgres 23505 (unique violation) to 'Já existe uma instituição com este slug.'");
});

describe("updateInstitutionAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it.todo("rejects non-admin callers");
  it.todo("requires institutionId in payload");
  it.todo("returns success on happy update path");
});

// W-6 fix: sentinel wrapped in describe() block for consistent Vitest output.
// Use expect to silence "no expect calls" warning; harmless no-op.
describe("scaffold", () => {
  it("placeholder", () => {
    expect(true).toBe(true);
  });
});
