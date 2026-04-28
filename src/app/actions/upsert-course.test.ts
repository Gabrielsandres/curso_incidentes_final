import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/auth/roles", () => ({
  fetchUserRole: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
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
import {
  archiveCourseAction,
  createCourseAction,
  publishCourseAction,
  unpublishCourseAction,
} from "./upsert-course";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

const initialState = { success: false, message: "" };

function makeAdminSupabase(fromMock: (table: string) => unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-1" } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => fromMock(table)),
  };
}

function makeStudentSupabase() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "student-1" } },
        error: null,
      }),
    },
  };
}

describe("createCourseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna erro com mensagem sobre slug quando Supabase retorna erro 23505 (slug duplicado)", async () => {
    const coursesQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate key value violates unique constraint" },
      }),
    };

    const supabase = makeAdminSupabase(() => coursesQuery);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const formData = new FormData();
    formData.set("slug", "curso-teste");
    formData.set("title", "Curso Teste");
    formData.set("certificate_enabled", "false");

    const result = await createCourseAction(initialState, formData);

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("slug");
  });

  it("retorna erro quando usuario nao eh admin", async () => {
    const supabase = makeStudentSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const formData = new FormData();
    formData.set("slug", "curso-teste");
    formData.set("title", "Curso Teste");
    formData.set("certificate_enabled", "false");

    const result = await createCourseAction(initialState, formData);

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("permiss");
  });
});

describe("publishCourseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna sucesso quando admin publica curso valido", async () => {
    const coursesQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const supabase = makeAdminSupabase(() => coursesQuery);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const formData = new FormData();
    formData.set("course_id", VALID_UUID);

    const result = await publishCourseAction(initialState, formData);

    expect(result.success).toBe(true);
    expect(result.message.toLowerCase()).toContain("publicado");
  });
});

describe("archiveCourseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna sucesso quando admin arquiva curso valido", async () => {
    const coursesQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const supabase = makeAdminSupabase(() => coursesQuery);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const formData = new FormData();
    formData.set("course_id", VALID_UUID);

    const result = await archiveCourseAction(initialState, formData);

    expect(result.success).toBe(true);
    expect(result.message.toLowerCase()).toContain("arquivado");
  });
});

describe("unpublishCourseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna erro quando usuario nao eh admin tenta despublicar", async () => {
    const supabase = makeStudentSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const formData = new FormData();
    formData.set("course_id", VALID_UUID);

    const result = await unpublishCourseAction(initialState, formData);

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("permiss");
  });
});
