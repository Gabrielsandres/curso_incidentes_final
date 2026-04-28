import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { convertPendingEnrollmentsForEmail } from "./manage-pending-enrollment";

type PendingRow = { id: string; course_id: string; expires_at: string | null };
type ProfileRow = { id: string } | null;
type InsertResult = { data: null; error: { code: string; message: string } | null };
type DeleteResult = { data: null; error: null };

// Default email used in all tests when a user is found
const TEST_EMAIL = "aluno@example.com";

function makeAdminClient(overrides: {
  pendingRows?: PendingRow[];
  // authUserFound: whether listUsers returns a user matching TEST_EMAIL
  authUserFound?: boolean;
  profileData?: ProfileRow;
  insertResults?: InsertResult[];
  deleteResult?: DeleteResult;
}) {
  const pendingRows = overrides.pendingRows ?? [];
  const authUserFound = overrides.authUserFound !== false; // default true
  const profileData = overrides.profileData ?? null;
  const insertResults = overrides.insertResults ?? [{ data: null, error: null }];
  let insertCallCount = 0;

  // listUsers returns the auth user when authUserFound, otherwise empty
  const listUsersData = authUserFound
    ? { users: [{ id: "profile-xyz", email: TEST_EMAIL }], total: 1 }
    : { users: [], total: 0 };

  const deleteQuery = {
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  const pendingSelectQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: pendingRows, error: null }),
  };

  const profileSelectQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: profileData, error: null }),
  };

  const enrollmentsInsertQuery = {
    insert: vi.fn().mockImplementation(() => {
      const result = insertResults[insertCallCount] ?? { data: null, error: null };
      insertCallCount++;
      return Promise.resolve(result);
    }),
  };

  const pendingDeleteQuery = {
    delete: vi.fn().mockReturnValue(deleteQuery),
  };

  const adminClient = {
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: listUsersData, error: null }),
      },
    },
    from: vi.fn((table: string) => {
      if (table === "pending_enrollments") {
        return {
          select: pendingSelectQuery.select,
          delete: pendingDeleteQuery.delete,
          eq: pendingSelectQuery.eq,
        };
      }
      if (table === "profiles") return profileSelectQuery;
      if (table === "enrollments") return enrollmentsInsertQuery;
      return {};
    }),
  };

  return { adminClient, deleteQuery, pendingSelectQuery, enrollmentsInsertQuery };
}

describe("convertPendingEnrollmentsForEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T1: retorna cedo sem tentar inserir quando não há pending rows", async () => {
    const { adminClient, enrollmentsInsertQuery } = makeAdminClient({ pendingRows: [] });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    await convertPendingEnrollmentsForEmail("aluno@example.com");

    expect(enrollmentsInsertQuery.insert).not.toHaveBeenCalled();
  });

  it("T2: loga erro e retorna quando perfil não encontrado após aceite de convite", async () => {
    const { adminClient, enrollmentsInsertQuery } = makeAdminClient({
      pendingRows: [{ id: "pending-1", course_id: "course-abc", expires_at: null }],
      authUserFound: false,
      profileData: null,
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    await convertPendingEnrollmentsForEmail("aluno@example.com");

    expect(enrollmentsInsertQuery.insert).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Perfil"),
      expect.objectContaining({ email: "aluno@example.com" }),
    );
  });

  it("T3: converte um pending row — insere enrollment e deleta pending", async () => {
    const { adminClient, enrollmentsInsertQuery, deleteQuery } = makeAdminClient({
      pendingRows: [{ id: "pending-1", course_id: "course-abc", expires_at: "2025-12-31" }],
      profileData: { id: "profile-xyz" },
      insertResults: [{ data: null, error: null }],
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    await convertPendingEnrollmentsForEmail("aluno@example.com");

    expect(enrollmentsInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "profile-xyz",
        course_id: "course-abc",
        source: "admin_grant",
        expires_at: "2025-12-31",
      }),
    );
    expect(deleteQuery.eq).toHaveBeenCalledWith("id", "pending-1");
  });

  it("T4: converte múltiplos pending rows para o mesmo email", async () => {
    const { adminClient, enrollmentsInsertQuery, deleteQuery } = makeAdminClient({
      pendingRows: [
        { id: "pending-1", course_id: "course-abc", expires_at: null },
        { id: "pending-2", course_id: "course-def", expires_at: "2025-06-30" },
      ],
      profileData: { id: "profile-xyz" },
      insertResults: [
        { data: null, error: null },
        { data: null, error: null },
      ],
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    await convertPendingEnrollmentsForEmail("aluno@example.com");

    expect(enrollmentsInsertQuery.insert).toHaveBeenCalledTimes(2);
    expect(deleteQuery.eq).toHaveBeenCalledTimes(2);
    expect(deleteQuery.eq).toHaveBeenCalledWith("id", "pending-1");
    expect(deleteQuery.eq).toHaveBeenCalledWith("id", "pending-2");
  });

  it("T5: quando insert retorna 23505 (aluno já matriculado), ainda deleta o pending row", async () => {
    const { adminClient, deleteQuery } = makeAdminClient({
      pendingRows: [{ id: "pending-1", course_id: "course-abc", expires_at: null }],
      profileData: { id: "profile-xyz" },
      insertResults: [{ data: null, error: { code: "23505", message: "duplicate key" } }],
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    await convertPendingEnrollmentsForEmail("aluno@example.com");

    // Should delete pending row even on 23505 (enrollment already exists — pending is stale)
    expect(deleteQuery.eq).toHaveBeenCalledWith("id", "pending-1");
  });

  it("T6: quando insert retorna erro não-23505, loga erro e NÃO deleta o pending row", async () => {
    const { adminClient, deleteQuery } = makeAdminClient({
      pendingRows: [{ id: "pending-1", course_id: "course-abc", expires_at: null }],
      profileData: { id: "profile-xyz" },
      insertResults: [{ data: null, error: { code: "42501", message: "permission denied" } }],
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    await convertPendingEnrollmentsForEmail("aluno@example.com");

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("pending_enrollment"),
      expect.anything(),
    );
    // Should NOT delete the pending row since enrollment failed
    expect(deleteQuery.eq).not.toHaveBeenCalled();
  });
});
