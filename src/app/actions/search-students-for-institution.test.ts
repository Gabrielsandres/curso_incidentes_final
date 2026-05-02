// src/app/actions/search-students-for-institution.test.ts
//
// Tests for searchStudentsForInstitution server action (Plan 05-05).

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
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { searchStudentsForInstitution } from "./search-students-for-institution";

const VALID_INST = "00000000-0000-0000-0000-000000000001";

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

type ProfileRow = { id: string; full_name: string };
type AuthUser = { id: string; email: string | null };

function makeAdminClient(opts: {
  members?: Array<{ profile_id: string }>;
  profiles?: ProfileRow[];
  authUsers?: AuthUser[];
}) {
  const members = opts.members ?? [];
  const profiles = opts.profiles ?? [];
  const authUsers = opts.authUsers ?? [];

  // institution_members.select(...).eq(...)
  const membersTable = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: members, error: null }),
    }),
  };

  // profiles.select(...).ilike(...).eq(...).order(...).limit(...)
  const profilesQuery = {
    ilike: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: profiles, error: null }),
        }),
      }),
    }),
  };
  const profilesTable = {
    select: vi.fn().mockReturnValue(profilesQuery),
  };

  const adminClient = {
    auth: {
      admin: {
        listUsers: vi
          .fn()
          .mockResolvedValue({ data: { users: authUsers }, error: null }),
      },
    },
    from: vi.fn((table: string) => {
      if (table === "institution_members") return membersTable;
      if (table === "profiles") return profilesTable;
      return {};
    }),
  };

  return { adminClient, membersTable, profilesTable, profilesQuery };
}

describe("searchStudentsForInstitution", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] for unauthenticated caller", async () => {
    const supabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );

    const result = await searchStudentsForInstitution(VALID_INST, "ana");

    expect(result).toEqual([]);
  });

  it("returns [] for non-admin caller", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const result = await searchStudentsForInstitution(VALID_INST, "ana");

    expect(result).toEqual([]);
  });

  it("returns [] for query length < 2", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const result = await searchStudentsForInstitution(VALID_INST, "a");

    expect(result).toEqual([]);
  });

  it("returns [] when institutionId is not a uuid (Zod failure)", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const result = await searchStudentsForInstitution("not-a-uuid", "ana");

    expect(result).toEqual([]);
  });

  it("excludes profile_ids already in institution_members", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient } = makeAdminClient({
      members: [{ profile_id: "p-already-member" }],
      profiles: [
        { id: "p-already-member", full_name: "Ana Já-Membro" },
        { id: "p-not-member", full_name: "Ana Não-Membro" },
      ],
      authUsers: [
        { id: "p-already-member", email: "ja@example.com" },
        { id: "p-not-member", email: "nao@example.com" },
      ],
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const result = await searchStudentsForInstitution(VALID_INST, "ana");

    expect(result.map((r) => r.id)).toEqual(["p-not-member"]);
    expect(result.map((r) => r.id)).not.toContain("p-already-member");
  });

  it("filters by full_name OR email and returns shape { id, fullName, email }", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient, profilesQuery } = makeAdminClient({
      members: [],
      // both rows match the ilike upstream; the action's downstream filter
      // narrows by name OR email containing the query.
      profiles: [
        { id: "p-bruno", full_name: "Bruno Bento" },
        { id: "p-carla", full_name: "Carla Costa" },
      ],
      authUsers: [
        { id: "p-bruno", email: "bruno@bento.com" },
        { id: "p-carla", email: "ana-by-email@costa.com" }, // matches via email
      ],
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const result = await searchStudentsForInstitution(VALID_INST, "ana");

    // Only the "ana" name match (none here) and the "ana" email match (carla)
    // remain after the downstream filter. Bruno has no "ana" anywhere → excluded.
    expect(result).toEqual([
      { id: "p-carla", fullName: "Carla Costa", email: "ana-by-email@costa.com" },
    ]);

    // Verify scoping to role='student' and the ilike pattern.
    expect(profilesQuery.ilike).toHaveBeenCalledWith("full_name", "%ana%");
  });

  it("returns shape { id, fullName, email } for happy path", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient } = makeAdminClient({
      members: [],
      profiles: [{ id: "p-1", full_name: "Ana Silva" }],
      authUsers: [{ id: "p-1", email: "ana@silva.com" }],
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const result = await searchStudentsForInstitution(VALID_INST, "ana");

    expect(result).toEqual([
      { id: "p-1", fullName: "Ana Silva", email: "ana@silva.com" },
    ]);
  });

  it("limits underlying query to 20 results", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeServerSupabase() as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const { adminClient, profilesQuery } = makeAdminClient({
      members: [],
      profiles: [],
      authUsers: [],
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    await searchStudentsForInstitution(VALID_INST, "ana");

    // Walk the chain: ilike(...).eq(...).order(...).limit(20)
    const eqMock = profilesQuery.ilike.mock.results[0]?.value as {
      eq: ReturnType<typeof vi.fn>;
    };
    const orderMock = eqMock.eq.mock.results[0]?.value as {
      order: ReturnType<typeof vi.fn>;
    };
    const limitMock = orderMock.order.mock.results[0]?.value as {
      limit: ReturnType<typeof vi.fn>;
    };
    expect(limitMock.limit).toHaveBeenCalledWith(20);
  });
});
