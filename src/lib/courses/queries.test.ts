import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { getAvailableCourses, getCourseWithContent, getLessonWithCourseContext } from "./queries";
import type { Database } from "@/lib/database.types";

function makeQuery(response: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(response),
  };
}

describe("courses queries helpers", () => {
  it("retorna lista vazia quando getAvailableCourses recebe erro", async () => {
    const coursesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "db down" },
      }),
    };

    const client = {
      from: vi.fn(() => coursesQuery),
    } as unknown as SupabaseClient<Database>;

    const result = await getAvailableCourses(client);
    expect(result).toEqual([]);
  });

  it("normaliza materiais nulos em getCourseWithContent", async () => {
    const coursesQuery = makeQuery({
      data: {
        id: "course-1",
        slug: "curso-1",
        title: "Curso 1",
        description: "Descricao",
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
        modules: [
          {
            id: "module-1",
            course_id: "course-1",
            title: "Modulo 1",
            description: null,
            position: 1,
            created_at: "2025-01-01T00:00:00.000Z",
            lessons: [
              {
                id: "lesson-1",
                module_id: "module-1",
                title: "Aula 1",
                description: null,
                video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                position: 1,
                created_at: "2025-01-01T00:00:00.000Z",
                materials: null,
              },
            ],
          },
        ],
      },
      error: null,
    });

    const client = {
      from: vi.fn(() => coursesQuery),
    } as unknown as SupabaseClient<Database>;

    const result = await getCourseWithContent("curso-1", client);

    expect(result).not.toBeNull();
    expect(result?.modules[0].lessons[0].materials).toEqual([]);
  });

  it("retorna contexto completo da aula e normaliza materiais", async () => {
    const lessonsQuery = makeQuery({
      data: {
        id: "lesson-1",
        module_id: "module-1",
        title: "Aula 1",
        description: null,
        video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        position: 1,
        created_at: "2025-01-01T00:00:00.000Z",
        materials: null,
      },
      error: null,
    });

    const modulesQuery = makeQuery({
      data: {
        id: "module-1",
        course_id: "course-1",
        title: "Modulo 1",
        description: null,
        position: 1,
        created_at: "2025-01-01T00:00:00.000Z",
      },
      error: null,
    });

    const coursesQuery = makeQuery({
      data: {
        id: "course-1",
        slug: "curso-1",
        title: "Curso 1",
        description: null,
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
      },
      error: null,
    });

    const client = {
      from: vi.fn((table: string) => {
        if (table === "lessons") {
          return lessonsQuery;
        }

        if (table === "modules") {
          return modulesQuery;
        }

        if (table === "courses") {
          return coursesQuery;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as unknown as SupabaseClient<Database>;

    const context = await getLessonWithCourseContext("curso-1", "lesson-1", client);

    expect(context).not.toBeNull();
    expect(context?.course.slug).toBe("curso-1");
    expect(context?.lesson.materials).toEqual([]);
  });
});
