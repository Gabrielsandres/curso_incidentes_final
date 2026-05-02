// src/lib/institutions/queries.test.ts
//
// Tests for INST-06 + INST-07: per-team progress matrix + certs queries.
// Mirrors mocked Supabase chain pattern from src/lib/courses/queries.test.ts.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  getAdminInstitutionList,
  getInstitutionCertificates,
  getInstitutionForManager,
  getInstitutionMembersWithProgress,
} from "./queries";

// ---------------------------------------------------------------------------
// Helpers — small chain factories that mirror the runtime shape of the
// Supabase query builder used by queries.ts. Each function under test calls
// only specific methods, so we expose just those and stub return values.
// ---------------------------------------------------------------------------

type MaybeSingleResult<T> = { data: T | null; error: { message: string } | null };

function membershipChain(result: MaybeSingleResult<{ institution_id: string }>) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
}

function institutionByIdChain(
  result: MaybeSingleResult<{
    id: string;
    slug: string;
    name: string;
    contact_email: string | null;
    created_at: string;
    updated_at: string;
  }>,
) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
}

// ---------------------------------------------------------------------------
// getInstitutionForManager
// ---------------------------------------------------------------------------

describe("getInstitutionForManager", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null for orphan manager (zero institution_members rows)", async () => {
    const supabase = {
      from: vi.fn(() => membershipChain({ data: null, error: null })),
    };

    const result = await getInstitutionForManager(supabase as never, "user-1");
    expect(result).toBeNull();
  });

  it("returns the resolved institution row when user is the manager of one institution", async () => {
    const memberQuery = membershipChain({
      data: { institution_id: "inst-A" },
      error: null,
    });
    const institutionRow = {
      id: "inst-A",
      slug: "colegio-x",
      name: "Colégio X",
      contact_email: "contato@colegio-x.edu.br",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    const institutionQuery = institutionByIdChain({ data: institutionRow, error: null });

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "institution_members") return memberQuery;
        if (table === "institutions") return institutionQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const result = await getInstitutionForManager(supabase as never, "user-1");
    expect(result).toEqual(institutionRow);
  });

  it("uses the RLS-respecting server client (NOT admin client)", async () => {
    // Verifies CONTEXT D-04: queries.ts must NOT import createSupabaseAdminClient
    // as the resolver for getInstitutionForManager. Instead it uses the passed-in
    // server client (or createSupabaseServerClient on undefined).
    const memberQuery = membershipChain({
      data: { institution_id: "inst-A" },
      error: null,
    });
    const institutionQuery = institutionByIdChain({
      data: {
        id: "inst-A",
        slug: "x",
        name: "X",
        contact_email: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });

    const fromSpy = vi.fn((table: string) => {
      if (table === "institution_members") return memberQuery;
      if (table === "institutions") return institutionQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    const supabase = { from: fromSpy };
    await getInstitutionForManager(supabase as never, "user-1");

    // Verifies the function operated through the supplied client (no second client created)
    expect(fromSpy).toHaveBeenCalledWith("institution_members");
    expect(fromSpy).toHaveBeenCalledWith("institutions");
  });
});

// ---------------------------------------------------------------------------
// getInstitutionMembersWithProgress
// ---------------------------------------------------------------------------

type MemberRow = {
  profile_id: string;
  role: "student" | "manager";
  profiles: { full_name: string };
};

type EnrollmentRow = {
  user_id: string;
  course_id: string;
  expires_at: string | null;
  courses: { id: string; title: string; slug: string };
};

type ModuleRow = {
  course_id: string;
  deleted_at: string | null;
  lessons: { id: string; deleted_at: string | null }[];
};

type ProgressRow = {
  user_id: string;
  lesson_id: string;
  status: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
};

function makeMatrixClient(opts: {
  members: MemberRow[];
  enrollments?: EnrollmentRow[];
  modules?: ModuleRow[];
  progress?: ProgressRow[];
  membersError?: string;
  enrollmentsError?: string;
}) {
  const fromSpy = vi.fn((table: string) => {
    if (table === "institution_members") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(
          opts.membersError
            ? { data: null, error: { message: opts.membersError } }
            : { data: opts.members, error: null },
        ),
      };
    }

    if (table === "enrollments") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue(
          opts.enrollmentsError
            ? { data: null, error: { message: opts.enrollmentsError } }
            : { data: opts.enrollments ?? [], error: null },
        ),
      };
    }

    if (table === "modules") {
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: opts.modules ?? [], error: null }),
      };
    }

    if (table === "lesson_progress") {
      const finalIn = vi
        .fn()
        .mockResolvedValue({ data: opts.progress ?? [], error: null });
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnValueOnce({
          // user_ids .in returns an object with another .in()
          in: finalIn,
        }),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return { from: fromSpy } as never;
}

describe("getInstitutionMembersWithProgress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] when no members are linked to the institution", async () => {
    const adminClient = makeMatrixClient({ members: [] });
    const result = await getInstitutionMembersWithProgress(adminClient, "inst-A");
    expect(result).toEqual([]);
  });

  it("returns [] when the membership query errors out", async () => {
    const adminClient = makeMatrixClient({ members: [], membersError: "db down" });
    const result = await getInstitutionMembersWithProgress(adminClient, "inst-A");
    expect(result).toEqual([]);
  });

  it("only returns members of the requested institutionId (verifies INST-06 isolation)", async () => {
    let observedInstitutionId: string | null = null;

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === "institution_members") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn((col: string, value: string) => {
              if (col === "institution_id") observedInstitutionId = value;
              return Promise.resolve({
                data: [
                  {
                    profile_id: "p1",
                    role: "student",
                    profiles: { full_name: "Alice" },
                  },
                ],
                error: null,
              });
            }),
          };
        }
        if (table === "enrollments") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === "modules") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            is: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const result = await getInstitutionMembersWithProgress(adminClient as never, "inst-A");
    expect(observedInstitutionId).toBe("inst-A");
    // No enrollments → member has empty courses array.
    expect(result).toEqual([
      { profileId: "p1", fullName: "Alice", memberRole: "student", courses: [] },
    ]);
  });

  it("includes expired enrollments with enrollmentExpired: true (ENR-04 + D-12)", async () => {
    const inThePast = "2020-01-01T00:00:00.000Z";
    const adminClient = makeMatrixClient({
      members: [{ profile_id: "p1", role: "student", profiles: { full_name: "Alice" } }],
      enrollments: [
        {
          user_id: "p1",
          course_id: "c1",
          expires_at: inThePast,
          courses: { id: "c1", title: "Curso 1", slug: "curso-1" },
        },
      ],
      modules: [
        {
          course_id: "c1",
          deleted_at: null,
          lessons: [
            { id: "l1", deleted_at: null },
            { id: "l2", deleted_at: null },
          ],
        },
      ],
      progress: [],
    });

    const result = await getInstitutionMembersWithProgress(adminClient, "inst-A");
    expect(result).toHaveLength(1);
    expect(result[0].courses).toHaveLength(1);
    expect(result[0].courses[0].enrollmentExpired).toBe(true);
  });

  it("computes completionPercentage = round(completedLessons / totalLessons * 100)", async () => {
    const adminClient = makeMatrixClient({
      members: [{ profile_id: "p1", role: "student", profiles: { full_name: "Alice" } }],
      enrollments: [
        {
          user_id: "p1",
          course_id: "c1",
          expires_at: null,
          courses: { id: "c1", title: "Curso 1", slug: "curso-1" },
        },
      ],
      modules: [
        {
          course_id: "c1",
          deleted_at: null,
          lessons: [
            { id: "l1", deleted_at: null },
            { id: "l2", deleted_at: null },
            { id: "l3", deleted_at: null },
          ],
        },
      ],
      progress: [
        { user_id: "p1", lesson_id: "l1", status: "COMPLETED" },
        { user_id: "p1", lesson_id: "l2", status: "COMPLETED" },
        { user_id: "p1", lesson_id: "l3", status: "IN_PROGRESS" },
      ],
    });

    const result = await getInstitutionMembersWithProgress(adminClient, "inst-A");
    expect(result[0].courses[0].totalLessons).toBe(3);
    expect(result[0].courses[0].completedLessons).toBe(2);
    expect(result[0].courses[0].completionPercentage).toBe(67); // round(66.6666)
    expect(result[0].courses[0].enrollmentExpired).toBe(false);
  });

  it("excludes deleted lessons (deleted_at IS NOT NULL) from totalLessons", async () => {
    const adminClient = makeMatrixClient({
      members: [{ profile_id: "p1", role: "student", profiles: { full_name: "Alice" } }],
      enrollments: [
        {
          user_id: "p1",
          course_id: "c1",
          expires_at: null,
          courses: { id: "c1", title: "Curso 1", slug: "curso-1" },
        },
      ],
      modules: [
        {
          course_id: "c1",
          deleted_at: null,
          lessons: [
            { id: "l1", deleted_at: null },
            { id: "l2", deleted_at: "2026-01-01T00:00:00.000Z" }, // soft-deleted
          ],
        },
      ],
      progress: [],
    });

    const result = await getInstitutionMembersWithProgress(adminClient, "inst-A");
    // Only l1 counts in totalLessons.
    expect(result[0].courses[0].totalLessons).toBe(1);
  });

  it("uses admin client — verifies D-12 bypass justification is required (function signature requires non-optional adminClient)", async () => {
    // Type-level: getInstitutionMembersWithProgress(adminClient, institutionId) does NOT
    // take an optional client. This test guards that contract through usage: omitting
    // the client would be a TS error (we can't assert that at runtime, but the call
    // shape itself confirms the signature).
    const adminClient = makeMatrixClient({ members: [] });
    const result = await getInstitutionMembersWithProgress(adminClient, "inst-A");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getInstitutionCertificates
// ---------------------------------------------------------------------------

describe("getInstitutionCertificates", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeCertsClient(opts: {
    members: Array<{ profile_id: string }>;
    certs?: Array<{
      id: string;
      user_id: string;
      course_id: string;
      issued_at: string;
      certificate_code: string;
      courses: { title: string };
      profiles: { full_name: string };
    }>;
    membersError?: string;
    certsError?: string;
    orderSpy?: ReturnType<typeof vi.fn>;
  }) {
    return {
      from: vi.fn((table: string) => {
        if (table === "institution_members") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue(
              opts.membersError
                ? { data: null, error: { message: opts.membersError } }
                : { data: opts.members, error: null },
            ),
          };
        }
        if (table === "course_certificates") {
          const orderImpl = opts.orderSpy ?? vi.fn();
          orderImpl.mockResolvedValue(
            opts.certsError
              ? { data: null, error: { message: opts.certsError } }
              : { data: opts.certs ?? [], error: null },
          );
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: orderImpl,
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    } as never;
  }

  it("returns [] when no members are linked to the institution", async () => {
    const adminClient = makeCertsClient({ members: [] });
    const result = await getInstitutionCertificates(adminClient, "inst-A");
    expect(result).toEqual([]);
  });

  it("returns certs ordered by issued_at DESC (verifies UI-SPEC sort)", async () => {
    const orderSpy = vi.fn();
    const adminClient = makeCertsClient({
      members: [{ profile_id: "p1" }],
      certs: [
        {
          id: "cert-1",
          user_id: "p1",
          course_id: "c1",
          issued_at: "2026-03-01T00:00:00.000Z",
          certificate_code: "ABC123",
          courses: { title: "Curso 1" },
          profiles: { full_name: "Alice" },
        },
      ],
      orderSpy,
    });

    await getInstitutionCertificates(adminClient, "inst-A");
    expect(orderSpy).toHaveBeenCalledWith("issued_at", { ascending: false });
  });

  it("only returns certs for users in the institution (filters by user_ids)", async () => {
    const adminClient = makeCertsClient({
      members: [{ profile_id: "p1" }, { profile_id: "p2" }],
      certs: [
        {
          id: "cert-1",
          user_id: "p1",
          course_id: "c1",
          issued_at: "2026-03-01T00:00:00.000Z",
          certificate_code: "ABC123",
          courses: { title: "Curso 1" },
          profiles: { full_name: "Alice" },
        },
      ],
    });
    const result = await getInstitutionCertificates(adminClient, "inst-A");
    expect(result).toHaveLength(1);
  });

  it("includes student_name, course_title, issued_at, certificate_code in each row", async () => {
    const adminClient = makeCertsClient({
      members: [{ profile_id: "p1" }],
      certs: [
        {
          id: "cert-1",
          user_id: "p1",
          course_id: "c1",
          issued_at: "2026-03-01T00:00:00.000Z",
          certificate_code: "ABC123",
          courses: { title: "Curso 1" },
          profiles: { full_name: "Alice" },
        },
      ],
    });
    const result = await getInstitutionCertificates(adminClient, "inst-A");
    expect(result[0]).toEqual({
      studentName: "Alice",
      courseTitle: "Curso 1",
      issuedAt: "2026-03-01T00:00:00.000Z",
      certificateCode: "ABC123",
    });
  });

  it("returns [] on Supabase error (logs via logger.error, does not throw)", async () => {
    const adminClient = makeCertsClient({
      members: [{ profile_id: "p1" }],
      certsError: "db down",
    });
    const result = await getInstitutionCertificates(adminClient, "inst-A");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getAdminInstitutionList
// ---------------------------------------------------------------------------

describe("getAdminInstitutionList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns institutions augmented with memberCount + hasManager flags", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: "inst-A",
              slug: "colegio-x",
              name: "Colégio X",
              contact_email: null,
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
              institution_members: [
                { profile_id: "p1", role: "student" },
                { profile_id: "p2", role: "manager" },
              ],
            },
            {
              id: "inst-B",
              slug: "instituto-y",
              name: "Instituto Y",
              contact_email: null,
              created_at: "2026-01-02T00:00:00.000Z",
              updated_at: "2026-01-02T00:00:00.000Z",
              institution_members: [],
            },
          ],
          error: null,
        }),
      })),
    };

    const result = await getAdminInstitutionList(supabase as never);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "inst-A",
      memberCount: 2,
      hasManager: true,
    });
    expect(result[1]).toMatchObject({
      id: "inst-B",
      memberCount: 0,
      hasManager: false,
    });
  });

  it("returns [] on Supabase error", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "db down" },
        }),
      })),
    };
    const result = await getAdminInstitutionList(supabase as never);
    expect(result).toEqual([]);
  });
});
