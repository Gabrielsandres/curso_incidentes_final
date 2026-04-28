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

describe("reorderLessonAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("troca posicoes entre aula e vizinha abaixo (direction=down)", async () => {
    const currentLesson = { position: 1, module_id: MODULE_ID };
    const neighborLesson = { id: NEIGHBOR_ID, position: 2 };

    let selectCallCount = 0;
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
      },
      from: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: read current lesson
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: currentLesson, error: null }),
          };
        }
        if (selectCallCount === 2) {
          // Second call: find neighbor
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: neighborLesson, error: null }),
          };
        }
        // Subsequent calls: update positions
        return { update: updateMock };
      }),
    };

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
});
