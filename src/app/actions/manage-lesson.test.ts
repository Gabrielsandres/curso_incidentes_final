import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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

import { fetchUserRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteLessonAction, reorderLessonAction, restoreLessonAction, updateLessonAction } from "./update-lesson";

const LESSON_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MODULE_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const NEIGHBOR_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";

function makeNonAdminSupabase() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "student-1" } },
        error: null,
      }),
    },
  };
}

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

const initialState = { success: false, message: "" };

describe("updateLessonAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna erro quando usuario nao eh admin", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeNonAdminSupabase() as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const result = await updateLessonAction(
      initialState,
      makeFormData({ lesson_id: LESSON_ID, title: "Aula Teste" }),
    );

    expect(result.success).toBe(false);
  });
});

describe("deleteLessonAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("soft-deleta aula preservando historico de progresso", async () => {
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
      },
      from: vi.fn().mockReturnValue({ update: updateMock }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const result = await deleteLessonAction(
      initialState,
      makeFormData({ lesson_id: LESSON_ID }),
    );

    expect(result.success).toBe(true);
    // Message should mention historico OR preservado
    const msg = result.message.toLowerCase();
    expect(msg.includes("historico") || msg.includes("preservado")).toBe(true);
    // Verify soft delete: UPDATE with deleted_at, not a hard DELETE
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
  });
});

describe("restoreLessonAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restaura aula removendo deleted_at quando admin solicita restore", async () => {
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
      },
      from: vi.fn().mockReturnValue({ update: updateMock }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const result = await restoreLessonAction(
      initialState,
      makeFormData({ lesson_id: LESSON_ID }),
    );

    expect(result.success).toBe(true);
    expect(result.message.toLowerCase()).toContain("restaurada");
    // Verify restore: UPDATE with deleted_at = null
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: null }),
    );
  });
});

// Helper: builds a supabase mock for reorderLessonAction.
// fromSequence is an array of return values for successive .from() calls:
//   [0] -> read current lesson (.select.eq.single)
//   [1] -> find neighbor (.select.eq.is.limit.lt/.gt.order  — resolves to { data: [...], error })
//   [2] -> re-read current for concurrency check (.select.eq.single)
//   [3] -> first UPDATE (lesson position)
//   [4] -> second UPDATE (neighbor position)
function makeReorderSupabase(
  currentLesson: { position: number; module_id: string },
  neighborRows: { id: string; position: number }[],
  freshPosition: number,
) {
  let callCount = 0;
  const updateEqMock = vi.fn().mockResolvedValue({ error: null });
  const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
      },
      from: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // read current lesson
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: currentLesson, error: null }),
          };
        }
        if (callCount === 2) {
          // neighbor query: chained .eq.is.limit.lt/.gt.order — all return `this` until awaited
          const chainable: Record<string, unknown> = {};
          const terminal = vi.fn().mockResolvedValue({ data: neighborRows, error: null });
          chainable.select = vi.fn().mockReturnValue(chainable);
          chainable.eq = vi.fn().mockReturnValue(chainable);
          chainable.is = vi.fn().mockReturnValue(chainable);
          chainable.limit = vi.fn().mockReturnValue(chainable);
          chainable.lt = vi.fn().mockReturnValue(chainable);
          chainable.gt = vi.fn().mockReturnValue(chainable);
          chainable.order = terminal;
          return chainable;
        }
        if (callCount === 3) {
          // re-read current lesson for concurrency check
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { position: freshPosition }, error: null }),
          };
        }
        // UPDATE calls
        return { update: updateMock };
      }),
    },
    updateMock,
    updateEqMock,
  };
}

describe("reorderLessonAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("troca posicoes entre aula e vizinha abaixo (direction=down)", async () => {
    const currentLesson = { position: 1, module_id: MODULE_ID };
    const neighborLesson = { id: NEIGHBOR_ID, position: 2 };

    const { supabase, updateMock } = makeReorderSupabase(currentLesson, [neighborLesson], 1);

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const result = await reorderLessonAction(
      initialState,
      makeFormData({ lesson_id: LESSON_ID, direction: "down" }),
    );

    expect(result.success).toBe(true);
    // Verify two update calls were made (swap)
    expect(updateMock).toHaveBeenCalledTimes(2);
  });

  it("retorna sucesso sem executar swap quando posicao ja mudou (double-submit guard)", async () => {
    const currentLesson = { position: 1, module_id: MODULE_ID };
    const neighborLesson = { id: NEIGHBOR_ID, position: 2 };

    // freshPosition differs from current.position — simulates concurrent call already moved it
    const { supabase, updateMock } = makeReorderSupabase(currentLesson, [neighborLesson], 2);

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const result = await reorderLessonAction(
      initialState,
      makeFormData({ lesson_id: LESSON_ID, direction: "down" }),
    );

    expect(result.success).toBe(true);
    // No swap should have been executed
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("retorna erro quando nao existe vizinha (aula ja esta no limite)", async () => {
    let callCount = 0;
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
      },
      from: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { position: 1, module_id: MODULE_ID }, error: null }),
          };
        }
        // neighbor query returns empty array
        const chainable: Record<string, unknown> = {};
        const terminal = vi.fn().mockResolvedValue({ data: [], error: null });
        chainable.select = vi.fn().mockReturnValue(chainable);
        chainable.eq = vi.fn().mockReturnValue(chainable);
        chainable.is = vi.fn().mockReturnValue(chainable);
        chainable.limit = vi.fn().mockReturnValue(chainable);
        chainable.lt = vi.fn().mockReturnValue(chainable);
        chainable.gt = vi.fn().mockReturnValue(chainable);
        chainable.order = terminal;
        return chainable;
      }),
    };

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const result = await reorderLessonAction(
      initialState,
      makeFormData({ lesson_id: LESSON_ID, direction: "up" }),
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("limite");
  });
});
