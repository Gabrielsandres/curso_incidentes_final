import { describe, expect, it, vi, beforeEach } from "vitest";

import { POST } from "./route";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/certificates/issuer", () => ({
  ensureCourseCertificateIssued: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

const VALID_LESSON_ID = "a0000000-0000-4000-8000-000000000001";

function makeSupabaseClientMock() {
  const upsert = vi.fn(async () => ({ error: null }));

  const from = vi.fn((table: string) => {
    if (table === "lessons") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: {
                id: "lesson-1",
                module_id: "module-1",
                modules: { course_id: "course-1" },
              },
              error: null,
            })),
          })),
        })),
      };
    }
    if (table === "lesson_progress") {
      return {
        upsert,
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-1" } },
        error: null,
      })),
    },
    from,
    upsert,
  };
}

function makeRequest(lessonId: string = VALID_LESSON_ID) {
  return new Request("http://localhost/api/lesson-progress/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lessonId }),
  });
}

describe("POST /api/lesson-progress/complete — isCourseCompleted flag", () => {
  beforeEach(async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const mockServerClient = makeSupabaseClientMock();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockServerClient as never);
  });

  it("returns isCourseCompleted: true when issuer returns issued", async () => {
    const { ensureCourseCertificateIssued } = await import("@/lib/certificates/issuer");
    vi.mocked(ensureCourseCertificateIssued).mockResolvedValue({
      status: "issued",
      certificate: { id: "cert-1" },
    } as never);

    const response = await POST(makeRequest());
    const body = (await response.json()) as { ok: boolean; isCourseCompleted: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.isCourseCompleted).toBe(true);
  });

  it("returns isCourseCompleted: true when issuer returns already_issued", async () => {
    const { ensureCourseCertificateIssued } = await import("@/lib/certificates/issuer");
    vi.mocked(ensureCourseCertificateIssued).mockResolvedValue({
      status: "already_issued",
    } as never);

    const response = await POST(makeRequest());
    const body = (await response.json()) as { ok: boolean; isCourseCompleted: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.isCourseCompleted).toBe(true);
  });

  it("returns isCourseCompleted: false when issuer returns not_eligible", async () => {
    const { ensureCourseCertificateIssued } = await import("@/lib/certificates/issuer");
    vi.mocked(ensureCourseCertificateIssued).mockResolvedValue({
      status: "not_eligible",
      totalLessons: 5,
      completedLessons: 3,
    } as never);

    const response = await POST(makeRequest());
    const body = (await response.json()) as { ok: boolean; isCourseCompleted: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.isCourseCompleted).toBe(false);
  });

  it("returns isCourseCompleted: false and ok: true when issuer throws (best-effort failure)", async () => {
    const { ensureCourseCertificateIssued } = await import("@/lib/certificates/issuer");
    vi.mocked(ensureCourseCertificateIssued).mockRejectedValue(new Error("storage error"));

    const response = await POST(makeRequest());
    const body = (await response.json()) as { ok: boolean; isCourseCompleted: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.isCourseCompleted).toBe(false);
  });
});
