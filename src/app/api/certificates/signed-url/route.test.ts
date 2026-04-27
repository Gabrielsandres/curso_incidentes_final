import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/auth/roles", () => ({
  fetchUserRole: vi.fn(),
}));

vi.mock("@/lib/auth/profiles", () => ({
  fetchUserProfile: vi.fn(),
}));

vi.mock("@/lib/certificates/issuer", () => ({
  ensureCourseCertificateIssued: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { fetchUserProfile } from "@/lib/auth/profiles";
import { fetchUserRole } from "@/lib/auth/roles";
import { ensureCourseCertificateIssued } from "@/lib/certificates/issuer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/certificates/signed-url/route";

const COURSE_ID = "11111111-1111-4111-8111-111111111111";

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/certificates/signed-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/certificates/signed-url", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 quando usuario nao esta autenticado", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const response = await POST(makeRequest({ courseId: COURSE_ID }));

    expect(response.status).toBe(401);
  });

  it("retorna 403 para perfil admin", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-1", email: "admin@test.com", user_metadata: {} } },
          error: null,
        }),
      },
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const response = await POST(makeRequest({ courseId: COURSE_ID }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("forbidden");
  });

  it("retorna 403 quando aluno ainda nao e elegivel", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "student-1", email: "student@test.com", user_metadata: {} } },
          error: null,
        }),
      },
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");
    vi.mocked(fetchUserProfile).mockResolvedValue({
      id: "student-1",
      full_name: "Aluno Teste",
      role: "student",
      created_at: "2026-02-28T12:00:00.000Z",
      updated_at: "2026-02-28T12:00:00.000Z",
    });
    vi.mocked(ensureCourseCertificateIssued).mockResolvedValue({
      status: "not_eligible",
      totalLessons: 10,
      completedLessons: 8,
    });

    const response = await POST(makeRequest({ courseId: COURSE_ID }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("certificate_not_eligible");
  });

  it("retorna URL assinada quando certificado esta emitido", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "student-1", email: "student@test.com", user_metadata: {} } },
          error: null,
        }),
      },
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");
    vi.mocked(fetchUserProfile).mockResolvedValue({
      id: "student-1",
      full_name: "Aluno Teste",
      role: "student",
      created_at: "2026-02-28T12:00:00.000Z",
      updated_at: "2026-02-28T12:00:00.000Z",
    });

    vi.mocked(ensureCourseCertificateIssued).mockResolvedValue({
      status: "already_issued",
      certificate: {
        id: "certificate-1",
        user_id: "student-1",
        course_id: COURSE_ID,
        issued_at: "2026-02-28T12:00:00.000Z",
        certificate_code: "CERT-123",
        file_bucket: "certificates",
        file_path: "certificates/course/student/file.pdf",
        mime_type: "application/pdf",
        file_size_bytes: 1024,
        created_at: "2026-02-28T12:00:00.000Z",
      },
    });

    vi.mocked(createSupabaseAdminClient).mockReturnValue({
      storage: {
        from: vi.fn(() => ({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: "https://signed.url/certificado.pdf" },
            error: null,
          }),
        })),
      },
    } as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const response = await POST(makeRequest({ courseId: COURSE_ID }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.url).toContain("https://signed.url/");
  });
});
