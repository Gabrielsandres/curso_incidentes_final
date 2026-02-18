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

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { redirect } from "next/navigation";

import { fetchUserRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createLessonAction } from "./create-lesson";

const initialState = {
  success: false,
  message: "",
};

function makeValidFormData() {
  const formData = new FormData();
  formData.set("module_id", "11111111-1111-4111-8111-111111111111");
  formData.set("title", "Aula de teste");
  formData.set("description", "");
  formData.set("video_url", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  formData.set("position", "1");
  return formData;
}

describe("createLessonAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna erro quando usuario nao eh admin", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const result = await createLessonAction(initialState, makeValidFormData());

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("permiss");
    expect(fetchUserRole).toHaveBeenCalledWith(supabase, "user-1");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redireciona para o curso quando admin cria aula com sucesso", async () => {
    const modulesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "11111111-1111-4111-8111-111111111111",
          course_id: "22222222-2222-4222-8222-222222222222",
          title: "Modulo 1",
          position: 1,
          courses: { slug: "curso-seguro" },
        },
        error: null,
      }),
    };

    const lessonsQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        error: null,
      }),
    };

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-1" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "modules") {
          return modulesQuery;
        }

        if (table === "lessons") {
          return lessonsQuery;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    await expect(createLessonAction(initialState, makeValidFormData())).rejects.toThrow(
      "NEXT_REDIRECT:/curso/curso-seguro",
    );

    expect(lessonsQuery.insert).toHaveBeenCalledWith({
      module_id: "11111111-1111-4111-8111-111111111111",
      title: "Aula de teste",
      description: null,
      video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      position: 1,
    });
    expect(redirect).toHaveBeenCalledWith("/curso/curso-seguro");
  });
});
