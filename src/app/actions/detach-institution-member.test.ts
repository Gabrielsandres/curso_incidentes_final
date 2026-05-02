// src/app/actions/detach-institution-member.test.ts
//
// Tests for detachInstitutionMemberAction (Plan 05-05).
// CRITICAL: D-08 soft-detach contract — these tests prove the action does
// NOT touch enrollments or course_certificates tables.

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

import { revalidatePath } from "next/cache";

import { fetchUserRole } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { detachInstitutionMemberAction } from "./detach-institution-member";
import { initialDetachMemberFormState } from "./detach-institution-member-state";

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

/**
 * Builds a "trip-wire" admin client. Only the institution_members table is
 * permitted to be `from()`-ed. Any access to enrollments / course_certificates
 * makes the test fail (proves D-08 soft-detach).
 */
function makeAdminClient(opts?: {
  deleteError?: { code: string; message: string } | null;
}) {
  const deleteError = opts?.deleteError ?? null;

  // institution_members.delete().eq().eq()
  const secondEq = vi.fn().mockResolvedValue({ data: null, error: deleteError });
  const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
  const deleteFn = vi.fn().mockReturnValue({ eq: firstEq });

  const membersTable = { delete: deleteFn };

  const fromMock = vi.fn((table: string) => {
    if (table === "institution_members") {
      return membersTable;
    }
    // Trip-wire: D-08 says detach must NEVER touch these tables.
    throw new Error(
      `D-08 violation: detach action must not touch table "${table}"`,
    );
  });

  const adminClient = { from: fromMock };

  return { adminClient, fromMock, deleteFn, firstEq, secondEq };
}

const VALID_INST = "00000000-0000-0000-0000-000000000001";
const VALID_PROFILE = "00000000-0000-0000-0000-000000000002";
const VALID_SLUG = "colegio-marista";

describe("detachInstitutionMemberAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-admin callers", async () => {
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

    const result = await detachInstitutionMemberAction(
      initialDetachMemberFormState,
      fd,
    );

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("permiss");
  });

  it("calls institution_members.delete().eq('institution_id', ...).eq('profile_id', ...)", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient, deleteFn, firstEq, secondEq } = makeAdminClient({
      deleteError: null,
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const fd = new FormData();
    fd.set("institution_id", VALID_INST);
    fd.set("profile_id", VALID_PROFILE);
    fd.set("institution_slug", VALID_SLUG);

    const result = await detachInstitutionMemberAction(
      initialDetachMemberFormState,
      fd,
    );

    expect(result.success).toBe(true);
    expect(deleteFn).toHaveBeenCalled();
    expect(firstEq).toHaveBeenCalledWith("institution_id", VALID_INST);
    expect(secondEq).toHaveBeenCalledWith("profile_id", VALID_PROFILE);
  });

  it("does NOT touch enrollments table (D-08: soft detach)", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient, fromMock } = makeAdminClient({ deleteError: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const fd = new FormData();
    fd.set("institution_id", VALID_INST);
    fd.set("profile_id", VALID_PROFILE);
    fd.set("institution_slug", VALID_SLUG);

    await detachInstitutionMemberAction(initialDetachMemberFormState, fd);

    // Verify only institution_members was touched. The trip-wire `fromMock`
    // throws if any other table is accessed (proves D-08 contract).
    const tablesTouched = fromMock.mock.calls.map((c) => c[0]);
    expect(tablesTouched).toEqual(["institution_members"]);
    expect(tablesTouched).not.toContain("enrollments");
    expect(tablesTouched).not.toContain("course_certificates");
  });

  it("returns success message and revalidates on happy path", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient } = makeAdminClient({ deleteError: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const fd = new FormData();
    fd.set("institution_id", VALID_INST);
    fd.set("profile_id", VALID_PROFILE);
    fd.set("institution_slug", VALID_SLUG);

    const result = await detachInstitutionMemberAction(
      initialDetachMemberFormState,
      fd,
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Aluno desvinculado.");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/admin/instituicoes/${VALID_SLUG}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith("/gestor");
  });
});
