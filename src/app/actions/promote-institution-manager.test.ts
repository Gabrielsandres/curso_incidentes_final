// src/app/actions/promote-institution-manager.test.ts
//
// Tests for promoteInstitutionManagerAction + demoteInstitutionManagerAction.
// Both delegate to migration-0014 RPCs for atomicity (D-07 + Pitfall 3).

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

import {
  demoteInstitutionManagerAction,
  promoteInstitutionManagerAction,
} from "./promote-institution-manager";
import {
  initialDemoteManagerFormState,
  initialPromoteManagerFormState,
} from "./promote-institution-manager-state";

const VALID_INST = "00000000-0000-0000-0000-000000000001";
const VALID_PROFILE = "00000000-0000-0000-0000-000000000002";
const VALID_SLUG = "colegio-marista";

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
  rpcError?: { code: string; message: string } | null;
}) {
  const rpcError = opts?.rpcError ?? null;
  const rpc = vi.fn().mockResolvedValue({ data: null, error: rpcError });
  const adminClient = { rpc };
  return { adminClient, rpc };
}

function buildFormData() {
  const fd = new FormData();
  fd.set("institution_id", VALID_INST);
  fd.set("profile_id", VALID_PROFILE);
  fd.set("institution_slug", VALID_SLUG);
  return fd;
}

describe("promoteInstitutionManagerAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-admin callers", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const result = await promoteInstitutionManagerAction(
      initialPromoteManagerFormState,
      buildFormData(),
    );

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("permiss");
  });

  it("rejects payload missing institution_id (Zod failure)", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const fd = new FormData();
    fd.set("profile_id", VALID_PROFILE);
    fd.set("institution_slug", VALID_SLUG);

    const result = await promoteInstitutionManagerAction(
      initialPromoteManagerFormState,
      fd,
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("Dados inválidos.");
  });

  it("calls promote_institution_manager RPC with p_institution_id and p_new_manager_profile_id", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient, rpc } = makeAdminClient({ rpcError: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const result = await promoteInstitutionManagerAction(
      initialPromoteManagerFormState,
      buildFormData(),
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Aluno promovido a gestor.");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("promote_institution_manager", {
      p_institution_id: VALID_INST,
      p_new_manager_profile_id: VALID_PROFILE,
    });
  });

  it("captures Sentry exception and returns friendly error when RPC fails", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient } = makeAdminClient({
      rpcError: { code: "PGRST", message: "RPC boom" },
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const result = await promoteInstitutionManagerAction(
      initialPromoteManagerFormState,
      buildFormData(),
    );

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("promover");
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("revalidates /admin/instituicoes/{slug} on happy path", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient } = makeAdminClient({ rpcError: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    await promoteInstitutionManagerAction(
      initialPromoteManagerFormState,
      buildFormData(),
    );

    expect(revalidatePath).toHaveBeenCalledWith(
      `/admin/instituicoes/${VALID_SLUG}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith("/admin/instituicoes");
    expect(revalidatePath).toHaveBeenCalledWith("/gestor");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

describe("demoteInstitutionManagerAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-admin callers", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const result = await demoteInstitutionManagerAction(
      initialDemoteManagerFormState,
      buildFormData(),
    );

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("permiss");
  });

  it("calls demote_institution_manager RPC with p_institution_id and p_profile_id", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient, rpc } = makeAdminClient({ rpcError: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const result = await demoteInstitutionManagerAction(
      initialDemoteManagerFormState,
      buildFormData(),
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe("Gestor rebaixado a aluno.");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("demote_institution_manager", {
      p_institution_id: VALID_INST,
      p_profile_id: VALID_PROFILE,
    });
  });

  it("captures Sentry exception when RPC returns error", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient } = makeAdminClient({
      rpcError: { code: "PGRST", message: "RPC boom" },
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const result = await demoteInstitutionManagerAction(
      initialDemoteManagerFormState,
      buildFormData(),
    );

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("rebaixar");
    expect(captureException).toHaveBeenCalledTimes(1);
  });
});
