import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth/roles", () => ({
  fetchUserRole: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { fetchUserRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  grantEnrollmentBatchAction,
  grantEnrollmentWithInviteAction,
} from "./grant-enrollment";
import { initialEnrollmentState } from "./grant-enrollment-state";

const initialState = initialEnrollmentState;

function makeServerSupabase(overrides?: Partial<{ userId: string; role?: string }>) {
  const userId = overrides?.userId ?? "admin-user-id";
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  };
}

function makeAdminClientChain(overrides?: {
  upsertError?: { code: string; message: string } | null;
  pendingError?: { code: string; message: string } | null;
  inviteError?: { message: string } | null;
}) {
  const upsertError = overrides?.upsertError !== undefined ? overrides.upsertError : null;
  const pendingError = overrides?.pendingError !== undefined ? overrides.pendingError : null;
  const inviteError = overrides?.inviteError !== undefined ? overrides.inviteError : null;

  const enrollmentUpsertQuery = {
    upsert: vi.fn().mockResolvedValue({ data: null, error: upsertError }),
  };

  const pendingInsertQuery = {
    insert: vi.fn().mockResolvedValue({ data: null, error: pendingError }),
  };

  const adminClient = {
    auth: {
      admin: {
        inviteUserByEmail: vi.fn().mockResolvedValue({
          data: inviteError ? null : { user: { id: "new-user-id", email: "test@example.com" } },
          error: inviteError,
        }),
      },
    },
    from: vi.fn((table: string) => {
      if (table === "enrollments") return enrollmentUpsertQuery;
      if (table === "pending_enrollments") return pendingInsertQuery;
      return {};
    }),
  };

  return { adminClient, enrollmentUpsertQuery, pendingInsertQuery };
}

describe("grantEnrollmentBatchAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T5: upsert com expires_at null quando sem expiração", async () => {
    const serverSupabase = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient, enrollmentUpsertQuery } = makeAdminClientChain({ upsertError: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const formData = new FormData();
    formData.append("user_ids[]", "user-abc");
    formData.set("course_id", "course-xyz");
    formData.set("course_slug", "my-course");

    const result = await grantEnrollmentBatchAction(initialState, formData);

    expect(result.success).toBe(true);
    expect(enrollmentUpsertQuery.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: "user-abc",
          course_id: "course-xyz",
          source: "admin_grant",
          expires_at: null,
        }),
      ]),
      expect.any(Object),
    );
  });

  it("T6: upsert com expires_at quando data fornecida", async () => {
    const serverSupabase = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient, enrollmentUpsertQuery } = makeAdminClientChain({ upsertError: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const formData = new FormData();
    formData.append("user_ids[]", "user-abc");
    formData.set("course_id", "course-xyz");
    formData.set("course_slug", "my-course");
    formData.set("expires_at", "2025-12-31");

    const result = await grantEnrollmentBatchAction(initialState, formData);

    expect(result.success).toBe(true);
    expect(enrollmentUpsertQuery.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ expires_at: "2025-12-31" }),
      ]),
      expect.any(Object),
    );
  });

  it("T7: retorna erro quando nenhum aluno selecionado", async () => {
    const serverSupabase = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient } = makeAdminClientChain();
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const formData = new FormData();
    formData.set("course_id", "course-xyz");
    formData.set("course_slug", "my-course");

    const result = await grantEnrollmentBatchAction(initialState, formData);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Selecione");
  });

  it("T8: retorna erro de permissão para não admin", async () => {
    const serverSupabase = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const formData = new FormData();
    formData.append("user_ids[]", "user-abc");
    formData.set("course_id", "course-xyz");
    formData.set("course_slug", "my-course");

    const result = await grantEnrollmentBatchAction(initialState, formData);

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("permiss");
  });

  it("T8b: grantedCount reflete número de alunos selecionados", async () => {
    const serverSupabase = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient } = makeAdminClientChain({ upsertError: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const formData = new FormData();
    formData.append("user_ids[]", "user-1");
    formData.append("user_ids[]", "user-2");
    formData.append("user_ids[]", "user-3");
    formData.set("course_id", "course-xyz");
    formData.set("course_slug", "my-course");

    const result = await grantEnrollmentBatchAction(initialState, formData);

    expect(result.success).toBe(true);
    expect(result.grantedCount).toBe(3);
  });
});

describe("grantEnrollmentWithInviteAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T9: chama inviteUserByEmail com o email correto", async () => {
    const serverSupabase = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient } = makeAdminClientChain({});
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const formData = new FormData();
    formData.set("email", "novo@example.com");
    formData.set("course_id", "course-xyz");
    formData.set("course_slug", "my-course");

    await grantEnrollmentWithInviteAction(initialState, formData);

    expect(adminClient.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      "novo@example.com",
      expect.objectContaining({ data: expect.objectContaining({ invited_from: "admin_grant" }) }),
    );
  });

  it("T10: insere linha em pending_enrollments com email, course_id, expires_at, invited_by", async () => {
    const serverSupabase = makeServerSupabase({ userId: "admin-user-id" });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient, pendingInsertQuery } = makeAdminClientChain({});
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const formData = new FormData();
    formData.set("email", "Novo@Example.com"); // uppercase to test normalization
    formData.set("course_id", "course-xyz");
    formData.set("course_slug", "my-course");
    formData.set("expires_at", "2025-12-31");

    await grantEnrollmentWithInviteAction(initialState, formData);

    expect(pendingInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "novo@example.com", // lowercase normalized
        course_id: "course-xyz",
        expires_at: "2025-12-31",
        invited_by: "admin-user-id",
      }),
    );
  });

  it("T11: retorna erro de permissão para não admin", async () => {
    const serverSupabase = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const formData = new FormData();
    formData.set("email", "novo@example.com");
    formData.set("course_id", "course-xyz");
    formData.set("course_slug", "my-course");

    const result = await grantEnrollmentWithInviteAction(initialState, formData);

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("permiss");
  });

  it("T12: retorna erro quando inviteUserByEmail falha", async () => {
    const serverSupabase = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient } = makeAdminClientChain({
      inviteError: { message: "Email rate limit exceeded" },
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const formData = new FormData();
    formData.set("email", "novo@example.com");
    formData.set("course_id", "course-xyz");
    formData.set("course_slug", "my-course");

    const result = await grantEnrollmentWithInviteAction(initialState, formData);

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("convite");
  });
});
