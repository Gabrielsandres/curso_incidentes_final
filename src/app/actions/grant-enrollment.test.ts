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
  lookupProfileByEmailAction,
  grantEnrollmentAction,
  grantEnrollmentWithInviteAction,
  initialEnrollmentState,
} from "./grant-enrollment";

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
  // authUser: the user returned by listUsers (matched by email)
  authUser?: { id: string; email: string } | null;
  // profileData: the profiles row (id + full_name, no email)
  profileData?: { id: string; full_name: string } | null;
  enrollmentError?: { code: string; message: string } | null;
  pendingError?: { code: string; message: string } | null;
  inviteError?: { message: string } | null;
}) {
  // authUser defaults to a found user matching "joao@example.com"
  const authUser = overrides?.authUser !== undefined
    ? overrides.authUser
    : { id: "profile-id-123", email: "joao@example.com" };
  const profileData = overrides?.profileData !== undefined
    ? overrides.profileData
    : { id: "profile-id-123", full_name: "João Silva" };
  const enrollmentError = overrides?.enrollmentError !== undefined ? overrides.enrollmentError : null;
  const pendingError = overrides?.pendingError !== undefined ? overrides.pendingError : null;
  const inviteError = overrides?.inviteError !== undefined ? overrides.inviteError : null;

  const listUsersData = authUser
    ? { users: [{ id: authUser.id, email: authUser.email }], total: 1 }
    : { users: [], total: 0 };

  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: profileData, error: null }),
  };

  const enrollmentInsertQuery = {
    insert: vi.fn().mockResolvedValue({ data: null, error: enrollmentError }),
  };

  const pendingInsertQuery = {
    insert: vi.fn().mockResolvedValue({ data: null, error: pendingError }),
  };

  const adminClient = {
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: listUsersData, error: null }),
        inviteUserByEmail: vi.fn().mockResolvedValue({
          data: inviteError ? null : { user: { id: "new-user-id", email: "test@example.com" } },
          error: inviteError,
        }),
      },
    },
    from: vi.fn((table: string) => {
      if (table === "profiles") return profileQuery;
      if (table === "enrollments") return enrollmentInsertQuery;
      if (table === "pending_enrollments") return pendingInsertQuery;
      return {};
    }),
  };

  return { adminClient, profileQuery, enrollmentInsertQuery, pendingInsertQuery };
}

describe("lookupProfileByEmailAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T1: retorna erro de permissão para usuário não admin", async () => {
    const serverSupabase = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const formData = new FormData();
    formData.set("email", "aluno@example.com");
    formData.set("course_id", "course-123");

    const result = await lookupProfileByEmailAction(initialState, formData);

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("permiss");
  });

  it("T2: retorna erro de sessão quando usuário não está autenticado", async () => {
    const serverSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );

    const formData = new FormData();
    formData.set("email", "aluno@example.com");
    formData.set("course_id", "course-123");

    const result = await lookupProfileByEmailAction(initialState, formData);

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("sess");
  });

  it("T3: retorna foundProfile quando perfil existe", async () => {
    const serverSupabase = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient } = makeAdminClientChain({
      authUser: { id: "profile-id-123", email: "joao@example.com" },
      profileData: { id: "profile-id-123", full_name: "João Silva" },
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const formData = new FormData();
    formData.set("email", "joao@example.com");
    formData.set("course_id", "course-123");

    const result = await lookupProfileByEmailAction(initialState, formData);

    expect(result.success).toBe(true);
    expect(result.foundProfile).toMatchObject({
      id: "profile-id-123",
      fullName: "João Silva",
      email: "joao@example.com",
    });
  });

  it("T4: retorna foundProfile null quando perfil não existe (auth user não encontrado)", async () => {
    const serverSupabase = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    // authUser: null means listUsers returns empty array — no user with this email
    const { adminClient } = makeAdminClientChain({ authUser: null, profileData: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const formData = new FormData();
    formData.set("email", "desconhecido@example.com");
    formData.set("course_id", "course-123");

    const result = await lookupProfileByEmailAction(initialState, formData);

    expect(result.success).toBe(false);
    expect(result.foundProfile).toBeNull();
    expect(result.message).toBe("");
  });
});

describe("grantEnrollmentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T5: insere enrollment com expires_at null quando 'Sem expiração'", async () => {
    const serverSupabase = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient, enrollmentInsertQuery } = makeAdminClientChain({ enrollmentError: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const formData = new FormData();
    formData.set("user_id", "user-abc");
    formData.set("course_id", "course-xyz");
    formData.set("course_slug", "my-course");
    // No expires_at — means no expiry

    const result = await grantEnrollmentAction(initialState, formData);

    expect(result.success).toBe(true);
    expect(enrollmentInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-abc",
        course_id: "course-xyz",
        source: "admin_grant",
        expires_at: null,
      }),
    );
  });

  it("T6: insere enrollment com expires_at quando data fornecida", async () => {
    const serverSupabase = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient, enrollmentInsertQuery } = makeAdminClientChain({ enrollmentError: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const formData = new FormData();
    formData.set("user_id", "user-abc");
    formData.set("course_id", "course-xyz");
    formData.set("course_slug", "my-course");
    formData.set("expires_at", "2025-12-31");

    const result = await grantEnrollmentAction(initialState, formData);

    expect(result.success).toBe(true);
    expect(enrollmentInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        expires_at: "2025-12-31",
      }),
    );
  });

  it("T7: retorna mensagem pt-BR quando Postgres retorna 23505", async () => {
    const serverSupabase = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient } = makeAdminClientChain({
      enrollmentError: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const formData = new FormData();
    formData.set("user_id", "user-abc");
    formData.set("course_id", "course-xyz");
    formData.set("course_slug", "my-course");

    const result = await grantEnrollmentAction(initialState, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Este aluno já tem acesso ativo a este curso.");
  });

  it("T8: retorna erro de permissão para não admin", async () => {
    const serverSupabase = makeServerSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      serverSupabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const formData = new FormData();
    formData.set("user_id", "user-abc");
    formData.set("course_id", "course-xyz");
    formData.set("course_slug", "my-course");

    const result = await grantEnrollmentAction(initialState, formData);

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("permiss");
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
