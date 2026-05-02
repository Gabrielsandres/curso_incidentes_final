// src/app/actions/attach-institution-member.test.ts
//
// Tests for attachInstitutionMemberAction (Plan 05-05).

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

import { captureException } from "@sentry/nextjs";
import { revalidatePath } from "next/cache";

import { fetchUserRole } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { attachInstitutionMemberAction } from "./attach-institution-member";
import { initialAttachMemberFormState } from "./attach-institution-member-state";

function makeServerSupabase() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-user-id" } },
        error: null,
      }),
    },
  };
}

function makeAdminClient(opts?: {
  upsertError?: { code: string; message: string } | null;
}) {
  const upsertError = opts?.upsertError ?? null;

  const membersTable = {
    upsert: vi.fn().mockResolvedValue({ data: null, error: upsertError }),
  };

  const adminClient = {
    from: vi.fn((table: string) => {
      if (table === "institution_members") return membersTable;
      return {};
    }),
  };

  return { adminClient, membersTable };
}

const VALID_INST = "00000000-0000-0000-0000-000000000001";
const VALID_PROFILE = "00000000-0000-0000-0000-000000000002";
const VALID_SLUG = "colegio-marista";

describe("attachInstitutionMemberAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-admin callers with permission errorMessage", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const fd = new FormData();
    fd.set("institution_id", VALID_INST);
    fd.set("profile_id", VALID_PROFILE);
    fd.set("institution_slug", VALID_SLUG);

    const result = await attachInstitutionMemberAction(
      initialAttachMemberFormState,
      fd,
    );

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("permiss");
  });

  it("rejects missing institution_id (Zod failure)", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const fd = new FormData();
    fd.set("profile_id", VALID_PROFILE);
    fd.set("institution_slug", VALID_SLUG);

    const result = await attachInstitutionMemberAction(
      initialAttachMemberFormState,
      fd,
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("Dados inválidos");
  });

  it("rejects missing profile_id (Zod failure)", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const fd = new FormData();
    fd.set("institution_id", VALID_INST);
    fd.set("institution_slug", VALID_SLUG);

    const result = await attachInstitutionMemberAction(
      initialAttachMemberFormState,
      fd,
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("Dados inválidos");
  });

  it("calls institution_members.upsert with onConflict 'institution_id,profile_id'", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient, membersTable } = makeAdminClient({ upsertError: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const fd = new FormData();
    fd.set("institution_id", VALID_INST);
    fd.set("profile_id", VALID_PROFILE);
    fd.set("institution_slug", VALID_SLUG);

    await attachInstitutionMemberAction(initialAttachMemberFormState, fd);

    expect(membersTable.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        institution_id: VALID_INST,
        profile_id: VALID_PROFILE,
        role: "student",
      }),
      expect.objectContaining({
        onConflict: "institution_id,profile_id",
        ignoreDuplicates: true,
      }),
    );
  });

  it("returns success message and revalidates the slug-interpolated route on happy path", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient } = makeAdminClient({ upsertError: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const fd = new FormData();
    fd.set("institution_id", VALID_INST);
    fd.set("profile_id", VALID_PROFILE);
    fd.set("institution_slug", VALID_SLUG);

    const result = await attachInstitutionMemberAction(
      initialAttachMemberFormState,
      fd,
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Aluno vinculado.");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/admin/instituicoes/${VALID_SLUG}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith("/gestor");
  });

  it("captures Sentry exception and returns friendly error when upsert fails", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient } = makeAdminClient({
      upsertError: { code: "23505", message: "duplicate key" },
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const fd = new FormData();
    fd.set("institution_id", VALID_INST);
    fd.set("profile_id", VALID_PROFILE);
    fd.set("institution_slug", VALID_SLUG);

    const result = await attachInstitutionMemberAction(
      initialAttachMemberFormState,
      fd,
    );

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("vincular");
    expect(captureException).toHaveBeenCalled();
  });
});
