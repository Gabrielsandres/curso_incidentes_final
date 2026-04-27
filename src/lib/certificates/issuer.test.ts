import { describe, expect, it, vi } from "vitest";

import { COURSE_CERTIFICATES_BUCKET, ensureCourseCertificateIssued } from "@/lib/certificates/issuer";

type QueryResult<T> = { data: T; error: null } | { data: null; error: { message: string; code?: string | null } };
type AdminClientMock = {
  client: unknown;
  spies: {
    upload: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    certificateInsertSingle: ReturnType<typeof vi.fn>;
    certificateMaybeSingle: ReturnType<typeof vi.fn>;
  };
};

function makeCertificateRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "certificate-1",
    user_id: "user-1",
    course_id: "course-1",
    issued_at: "2026-02-28T12:00:00.000Z",
    certificate_code: "CERT-ABC123",
    file_bucket: COURSE_CERTIFICATES_BUCKET,
    file_path: "certificates/course-1/user-1/file.pdf",
    mime_type: "application/pdf",
    file_size_bytes: 128,
    created_at: "2026-02-28T12:00:00.000Z",
    ...overrides,
  };
}

function makeCourseRow() {
  return {
    id: "course-1",
    title: "Curso de teste",
    certificate_enabled: true,
    certificate_template_url: "/certificado_teste.png",
    certificate_workload_hours: 60,
    certificate_signer_name: "Direcao",
    certificate_signer_role: "Coordenacao",
  };
}

function createAdminClientMock(options: {
  certificateLookups: QueryResult<Record<string, unknown> | null>[];
  courseLookup?: QueryResult<Record<string, unknown>>;
  lessonsLookup?: QueryResult<Array<{ id: string }>>;
  progressLookup?: QueryResult<Array<{ lesson_id: string }>>;
  profileLookup?: QueryResult<{ full_name: string }>;
  insertResult?: QueryResult<Record<string, unknown>>;
  uploadError?: { message: string } | null;
}): AdminClientMock {
  const certificateLookupQueue = [...options.certificateLookups];
  const certificateMaybeSingle = vi.fn(async () => {
    return (
      certificateLookupQueue.shift() ?? {
        data: null,
        error: null,
      }
    );
  });

  const certificateInsertSingle = vi.fn(async () => {
    return (
      options.insertResult ?? {
        data: makeCertificateRow(),
        error: null,
      }
    );
  });

  const courseMaybeSingle = vi.fn(async () => {
    return (
      options.courseLookup ?? {
        data: makeCourseRow(),
        error: null,
      }
    );
  });

  const lessonsEq = vi.fn(async () => {
    return (
      options.lessonsLookup ?? {
        data: [{ id: "lesson-1" }],
        error: null,
      }
    );
  });

  const progressIn = vi.fn(async () => {
    return (
      options.progressLookup ?? {
        data: [{ lesson_id: "lesson-1" }],
        error: null,
      }
    );
  });

  const profileMaybeSingle = vi.fn(async () => {
    return (
      options.profileLookup ?? {
        data: { full_name: "Aluno Teste" },
        error: null,
      }
    );
  });

  const upload = vi.fn(async () => ({ error: options.uploadError ?? null }));
  const remove = vi.fn(async () => ({ data: null, error: null }));

  const courseCertificatesTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: certificateMaybeSingle,
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: certificateInsertSingle,
      })),
    })),
  };

  const coursesTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: courseMaybeSingle,
      })),
    })),
  };

  const lessonsTable = {
    select: vi.fn(() => ({
      eq: lessonsEq,
    })),
  };

  const lessonProgressTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: progressIn,
        })),
      })),
    })),
  };

  const profilesTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: profileMaybeSingle,
      })),
    })),
  };

  const from = vi.fn((table: string) => {
    if (table === "course_certificates") return courseCertificatesTable;
    if (table === "courses") return coursesTable;
    if (table === "lessons") return lessonsTable;
    if (table === "lesson_progress") return lessonProgressTable;
    if (table === "profiles") return profilesTable;
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    client: {
      from,
      storage: {
        from: vi.fn(() => ({
          upload,
          remove,
        })),
      },
    } as unknown,
    spies: {
      upload,
      remove,
      certificateInsertSingle,
      certificateMaybeSingle,
    },
  };
}

describe("ensureCourseCertificateIssued", () => {
  it("retorna already_issued quando certificado ja existe", async () => {
    const existingCertificate = makeCertificateRow();
    const admin = createAdminClientMock({
      certificateLookups: [{ data: existingCertificate, error: null }],
    });

    const buildPdf = vi.fn(async () => new Uint8Array([1, 2, 3]));

    const result = await ensureCourseCertificateIssued(
      { userId: "user-1", courseId: "course-1" },
      {
        createAdminClient: () => admin.client as never,
        buildPdf,
      },
    );

    expect(result.status).toBe("already_issued");
    expect(buildPdf).not.toHaveBeenCalled();
    expect(admin.spies.upload).not.toHaveBeenCalled();
  });

  it("retorna not_eligible quando progresso nao atingiu 100%", async () => {
    const admin = createAdminClientMock({
      certificateLookups: [{ data: null, error: null }],
      lessonsLookup: { data: [{ id: "lesson-1" }, { id: "lesson-2" }], error: null },
      progressLookup: { data: [{ lesson_id: "lesson-1" }], error: null },
    });

    const result = await ensureCourseCertificateIssued(
      { userId: "user-1", courseId: "course-1" },
      {
        createAdminClient: () => admin.client as never,
        buildPdf: async () => new Uint8Array([1, 2, 3]),
      },
    );

    expect(result.status).toBe("not_eligible");
    if (result.status === "not_eligible") {
      expect(result.totalLessons).toBe(2);
      expect(result.completedLessons).toBe(1);
    }
    expect(admin.spies.upload).not.toHaveBeenCalled();
  });

  it("emite certificado com sucesso quando elegivel", async () => {
    const issuedCertificate = makeCertificateRow({
      certificate_code: "CERT-SUCCESS",
      file_path: "certificates/course-1/user-1/success.pdf",
    });
    const admin = createAdminClientMock({
      certificateLookups: [{ data: null, error: null }],
      insertResult: { data: issuedCertificate, error: null },
    });

    const result = await ensureCourseCertificateIssued(
      { userId: "user-1", courseId: "course-1", userDisplayName: "Maria" },
      {
        createAdminClient: () => admin.client as never,
        buildPdf: async () => new Uint8Array([9, 9, 9]),
        now: () => new Date("2026-02-28T15:30:00.000Z"),
      },
    );

    expect(result.status).toBe("issued");
    expect(admin.spies.upload).toHaveBeenCalledTimes(1);
    expect(admin.spies.certificateInsertSingle).toHaveBeenCalledTimes(1);
  });

  it("lida com corrida de insercao e retorna already_issued", async () => {
    const concurrentCertificate = makeCertificateRow({
      id: "certificate-concurrent",
      certificate_code: "CERT-CONCURRENT",
    });
    const admin = createAdminClientMock({
      certificateLookups: [{ data: null, error: null }, { data: concurrentCertificate, error: null }],
      insertResult: {
        data: null,
        error: {
          code: "23505",
          message: "duplicate key value violates unique constraint",
        },
      },
    });

    const result = await ensureCourseCertificateIssued(
      { userId: "user-1", courseId: "course-1", userDisplayName: "Maria" },
      {
        createAdminClient: () => admin.client as never,
        buildPdf: async () => new Uint8Array([7, 7, 7]),
      },
    );

    expect(result.status).toBe("already_issued");
    expect(admin.spies.remove).toHaveBeenCalledTimes(1);
    expect(admin.spies.certificateMaybeSingle).toHaveBeenCalledTimes(2);
  });
});
