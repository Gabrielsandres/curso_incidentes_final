// src/app/actions/upsert-institution.test.ts
//
// Tests for createInstitutionAction + updateInstitutionAction (Plan 05-05).
// Mirrors the chain-mock pattern from grant-enrollment.test.ts.

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

import { fetchUserRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  createInstitutionAction,
  updateInstitutionAction,
} from "./upsert-institution";
import { initialInstitutionFormState } from "./upsert-institution-state";

type InsertError = { code: string; message: string } | null;

function makeServerSupabase(opts?: {
  insertError?: InsertError;
  updateError?: InsertError;
  userId?: string;
}) {
  const insertError = opts?.insertError ?? null;
  const updateError = opts?.updateError ?? null;

  // institutions.insert(...).select(...).single()
  const insertChain = {
    select: vi.fn().mockReturnValue({
      single: vi
        .fn()
        .mockResolvedValue({ data: insertError ? null : { id: "inst-1", slug: "x" }, error: insertError }),
    }),
  };

  // institutions.update(...).eq(...)
  const updateChain = {
    eq: vi.fn().mockResolvedValue({ data: null, error: updateError }),
  };

  const institutionsTable = {
    insert: vi.fn().mockReturnValue(insertChain),
    update: vi.fn().mockReturnValue(updateChain),
  };

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: opts?.userId ?? "admin-user-id" } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "institutions") return institutionsTable;
      return {};
    }),
  };

  return { supabase, institutionsTable, insertChain, updateChain };
}

describe("createInstitutionAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-admin callers with permission errorMessage", async () => {
    const { supabase } = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const fd = new FormData();
    fd.set("name", "Colégio Marista");
    fd.set("slug", "colegio-marista");

    const result = await createInstitutionAction(initialInstitutionFormState, fd);

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("permiss");
  });

  it("rejects payload with empty name (Zod fieldErrors.name set)", async () => {
    const fd = new FormData();
    fd.set("name", "");
    fd.set("slug", "colegio-marista");

    const result = await createInstitutionAction(initialInstitutionFormState, fd);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Revise os dados informados.");
    expect(result.fieldErrors?.name).toBeDefined();
    expect(result.fieldErrors?.name?.[0]).toContain("Nome");
  });

  it("rejects payload with invalid slug (regex violation)", async () => {
    const fd = new FormData();
    fd.set("name", "Colégio Marista");
    fd.set("slug", "INVALID SLUG"); // uppercase + space → regex fail

    const result = await createInstitutionAction(initialInstitutionFormState, fd);

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.slug).toBeDefined();
  });

  it("redirects to /admin/instituicoes/{slug} on happy path", async () => {
    const { supabase } = makeServerSupabase({ insertError: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const fd = new FormData();
    fd.set("name", "Colégio Marista");
    fd.set("slug", "colegio-marista");

    // redirect() throws "NEXT_REDIRECT:..." inside the mock — assert the path.
    await expect(
      createInstitutionAction(initialInstitutionFormState, fd),
    ).rejects.toThrow("NEXT_REDIRECT:/admin/instituicoes/colegio-marista");
  });

  it("translates Postgres 23505 (unique violation) to friendly slug message", async () => {
    const { supabase } = makeServerSupabase({
      insertError: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const fd = new FormData();
    fd.set("name", "Colégio Marista");
    fd.set("slug", "colegio-marista");

    const result = await createInstitutionAction(initialInstitutionFormState, fd);

    expect(result.success).toBe(false);
    expect(result.message).toBe(
      "Já existe uma instituição com este slug. Escolha outro slug.",
    );
  });
});

describe("updateInstitutionAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-admin callers", async () => {
    const { supabase } = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const fd = new FormData();
    fd.set("institutionId", "00000000-0000-0000-0000-000000000001");
    fd.set("name", "Colégio Marista");
    fd.set("slug", "colegio-marista");

    const result = await updateInstitutionAction(initialInstitutionFormState, fd);

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("permiss");
  });

  it("requires institutionId in payload (rejects when missing/invalid uuid)", async () => {
    const fd = new FormData();
    fd.set("institutionId", "not-a-uuid");
    fd.set("name", "Colégio Marista");
    fd.set("slug", "colegio-marista");

    const result = await updateInstitutionAction(initialInstitutionFormState, fd);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Revise os dados informados.");
    expect(result.fieldErrors?.institutionId).toBeDefined();
  });

  it("returns success on happy update path", async () => {
    const { supabase, institutionsTable, updateChain } = makeServerSupabase({
      updateError: null,
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const fd = new FormData();
    fd.set("institutionId", "00000000-0000-0000-0000-000000000001");
    fd.set("name", "Colégio Marista — Renovado");
    fd.set("slug", "colegio-marista");
    fd.set("contact_email", "contato@marista.org");

    const result = await updateInstitutionAction(initialInstitutionFormState, fd);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Instituição atualizada.");
    expect(institutionsTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Colégio Marista — Renovado",
        slug: "colegio-marista",
        contact_email: "contato@marista.org",
      }),
    );
    expect(updateChain.eq).toHaveBeenCalledWith(
      "id",
      "00000000-0000-0000-0000-000000000001",
    );
  });
});
