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

import { getAdminCourseList, getAvailableCourses, getCourseWithContent, getLessonWithCourseContext } from "./queries";
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
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
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

  it("getAvailableCourses filtra cursos nao publicados e arquivados", async () => {
    const publishedCourse = {
      id: "course-pub",
      slug: "curso-publicado",
      title: "Curso Publicado",
      description: null,
      cover_image_url: null,
      certificate_enabled: false,
      certificate_template_url: null,
      certificate_workload_hours: null,
      certificate_signer_name: null,
      certificate_signer_role: null,
      published_at: "2025-01-01T00:00:00.000Z",
      archived_at: null,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
      modules: [],
    };

    const coursesQuery = {
      select: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [publishedCourse],
        error: null,
      }),
    };

    const client = {
      from: vi.fn(() => coursesQuery),
    } as unknown as SupabaseClient<Database>;

    const result = await getAvailableCourses(client);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("curso-publicado");
    // Verify filters were applied
    expect(coursesQuery.not).toHaveBeenCalledWith("published_at", "is", null);
    expect(coursesQuery.is).toHaveBeenCalledWith("archived_at", null);
  });

  it("getAdminCourseList retorna todos os cursos sem filtro de status", async () => {
    const allCourses = [
      {
        id: "course-1",
        slug: "curso-rascunho",
        title: "Curso Rascunho",
        description: null,
        cover_image_url: null,
        certificate_enabled: false,
        published_at: null,
        archived_at: null,
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "course-2",
        slug: "curso-publicado",
        title: "Curso Publicado",
        description: null,
        cover_image_url: null,
        certificate_enabled: false,
        published_at: "2025-01-02T00:00:00.000Z",
        archived_at: null,
        created_at: "2025-01-02T00:00:00.000Z",
        updated_at: "2025-01-02T00:00:00.000Z",
      },
      {
        id: "course-3",
        slug: "curso-arquivado",
        title: "Curso Arquivado",
        description: null,
        cover_image_url: null,
        certificate_enabled: false,
        published_at: "2025-01-01T00:00:00.000Z",
        archived_at: "2025-01-03T00:00:00.000Z",
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-03T00:00:00.000Z",
      },
    ];

    const coursesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: allCourses,
        error: null,
      }),
    };

    const client = {
      from: vi.fn(() => coursesQuery),
    } as unknown as SupabaseClient<Database>;

    const result = await getAdminCourseList(client);
    expect(result).toHaveLength(3);
    // Verify no published_at/archived_at filter was applied (no .not() or .is() calls)
    expect(coursesQuery.order).toHaveBeenCalled();
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
            deleted_at: null,
            created_at: "2025-01-01T00:00:00.000Z",
            lessons: [
              {
                id: "lesson-1",
                module_id: "module-1",
                title: "Aula 1",
                description: null,
                video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                position: 1,
                deleted_at: null,
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

  it("getCourseWithContent filtra modulos e aulas com deleted_at (T-02-T3)", async () => {
    const coursesQuery = makeQuery({
      data: {
        id: "course-2",
        slug: "curso-2",
        title: "Curso 2",
        description: null,
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
        modules: [
          {
            id: "module-active",
            course_id: "course-2",
            title: "Modulo Ativo",
            description: null,
            position: 1,
            deleted_at: null,
            created_at: "2025-01-01T00:00:00.000Z",
            lessons: [
              {
                id: "lesson-active",
                module_id: "module-active",
                title: "Aula Ativa",
                description: null,
                video_url: null,
                position: 1,
                deleted_at: null,
                created_at: "2025-01-01T00:00:00.000Z",
                materials: [],
              },
              {
                id: "lesson-deleted",
                module_id: "module-active",
                title: "Aula Removida",
                description: null,
                video_url: null,
                position: 2,
                deleted_at: "2025-02-01T00:00:00.000Z",
                created_at: "2025-01-01T00:00:00.000Z",
                materials: [],
              },
            ],
          },
          {
            id: "module-deleted",
            course_id: "course-2",
            title: "Modulo Removido",
            description: null,
            position: 2,
            deleted_at: "2025-02-01T00:00:00.000Z",
            created_at: "2025-01-01T00:00:00.000Z",
            lessons: [],
          },
        ],
      },
      error: null,
    });

    const client = {
      from: vi.fn(() => coursesQuery),
    } as unknown as SupabaseClient<Database>;

    const result = await getCourseWithContent("curso-2", client);

    expect(result).not.toBeNull();
    // Only active module visible
    expect(result?.modules).toHaveLength(1);
    expect(result?.modules[0].id).toBe("module-active");
    // Only active lesson visible in that module
    expect(result?.modules[0].lessons).toHaveLength(1);
    expect(result?.modules[0].lessons[0].id).toBe("lesson-active");
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

describe("getAvailableCourses — nextLessonId and deleted_at filter", () => {
  const baseCourse = {
    id: "course-1",
    slug: "curso-1",
    title: "Curso 1",
    description: null,
    cover_image_url: null,
    certificate_enabled: false,
    certificate_template_url: null,
    certificate_workload_hours: null,
    certificate_signer_name: null,
    certificate_signer_role: null,
    published_at: "2025-01-01T00:00:00.000Z",
    archived_at: null,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
  };

  const standardModules = [
    {
      id: "module-1",
      position: 1,
      lessons: [
        { id: "lesson-a", position: 1, deleted_at: null },
        { id: "lesson-b", position: 2, deleted_at: null },
      ],
    },
    {
      id: "module-2",
      position: 2,
      lessons: [
        { id: "lesson-c", position: 1, deleted_at: null },
      ],
    },
  ];

  function makeAvailableCoursesClient(courseModules: typeof standardModules, progressRows: { lesson_id: string; status: string; completed_at: string | null }[]) {
    const coursesQuery = {
      select: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ ...baseCourse, modules: courseModules }],
        error: null,
      }),
    };

    const progressQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: progressRows, error: null }),
    };

    return {
      from: vi.fn((table: string) => {
        if (table === "courses") return coursesQuery;
        if (table === "lesson_progress") return progressQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient<Database>;
  }

  it("Teste A: retorna nextLessonId null quando aluno nao tem nenhum progresso (completedLessons === 0)", async () => {
    const client = makeAvailableCoursesClient(standardModules, []);

    const result = await getAvailableCourses(client, "user-1");

    expect(result).toHaveLength(1);
    expect(result[0].nextLessonId).toBeNull();
    expect(result[0].completedLessons).toBe(0);
  });

  it("Teste B: retorna nextLessonId igual a primeira aula incompleta ordenada por (module.position ASC, lesson.position ASC)", async () => {
    const client = makeAvailableCoursesClient(standardModules, [
      { lesson_id: "lesson-a", status: "COMPLETED", completed_at: "2026-01-01T00:00:00.000Z" },
    ]);

    const result = await getAvailableCourses(client, "user-1");

    expect(result).toHaveLength(1);
    expect(result[0].nextLessonId).toBe("lesson-b");
  });

  it("Teste C: retorna nextLessonId null quando o aluno completou 100% do curso", async () => {
    const client = makeAvailableCoursesClient(standardModules, [
      { lesson_id: "lesson-a", status: "COMPLETED", completed_at: "2026-01-01T00:00:00.000Z" },
      { lesson_id: "lesson-b", status: "COMPLETED", completed_at: "2026-01-01T00:00:00.000Z" },
      { lesson_id: "lesson-c", status: "COMPLETED", completed_at: "2026-01-01T00:00:00.000Z" },
    ]);

    const result = await getAvailableCourses(client, "user-1");

    expect(result).toHaveLength(1);
    expect(result[0].nextLessonId).toBeNull();
    expect(result[0].completionPercentage).toBe(100);
  });

  it("Teste D: exclui aulas com deleted_at do totalLessons (correcao D-12)", async () => {
    const modulesWithDeletedLesson = [
      {
        id: "module-1",
        position: 1,
        lessons: [
          { id: "lesson-a", position: 1, deleted_at: null },
          { id: "lesson-b", position: 2, deleted_at: "2026-01-01T00:00:00.000Z" },
        ],
      },
      {
        id: "module-2",
        position: 2,
        lessons: [
          { id: "lesson-c", position: 1, deleted_at: null },
        ],
      },
    ];

    const client = makeAvailableCoursesClient(modulesWithDeletedLesson, []);

    const result = await getAvailableCourses(client, "user-1");

    expect(result).toHaveLength(1);
    // lesson-b tem deleted_at, entao deve ser excluida — total 2, nao 3
    expect(result[0].totalLessons).toBe(2);
  });

  it("Teste E: exclui aula soft-deleted de nextLessonId (aula removida nunca e a proxima aula)", async () => {
    const modulesWithDeletedLesson = [
      {
        id: "module-1",
        position: 1,
        lessons: [
          { id: "lesson-a", position: 1, deleted_at: null },
          { id: "lesson-b", position: 2, deleted_at: "2026-01-01T00:00:00.000Z" },
        ],
      },
      {
        id: "module-2",
        position: 2,
        lessons: [
          { id: "lesson-c", position: 1, deleted_at: null },
        ],
      },
    ];

    // lesson-a concluida, lesson-b esta soft-deleted, lesson-c e a proxima valida
    const client = makeAvailableCoursesClient(modulesWithDeletedLesson, [
      { lesson_id: "lesson-a", status: "COMPLETED", completed_at: "2026-01-01T00:00:00.000Z" },
    ]);

    const result = await getAvailableCourses(client, "user-1");

    expect(result).toHaveLength(1);
    // lesson-b deve ser ignorada (soft-deleted); lesson-c e a proxima valida
    expect(result[0].nextLessonId).toBe("lesson-c");
  });
});
