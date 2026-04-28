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
import { deleteModuleAction, reorderModuleAction, updateModuleAction } from "./update-module";

const MODULE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COURSE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const NEIGHBOR_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function makeAdminSupabase(overrides: Record<string, unknown> = {}) {
  const updateChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: undefined as unknown,
  };
  // Make the final .eq() resolve
  updateChain.eq = vi.fn().mockResolvedValue({ error: null });
  updateChain.update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-1" } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    ...overrides,
  };
}

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

describe("updateModuleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna erro quando usuario nao eh admin", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      makeNonAdminSupabase() as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("student");

    const result = await updateModuleAction(
      initialState,
      makeFormData({ module_id: MODULE_ID, title: "Modulo Teste" }),
    );

    expect(result.success).toBe(false);
    expect(result.message.toLowerCase()).toContain("permiss");
  });

  it("retorna sucesso quando admin atualiza modulo valido", async () => {
    const supabase = makeAdminSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
    );
    vi.mocked(fetchUserRole).mockResolvedValue("admin");

    const result = await updateModuleAction(
      initialState,
      makeFormData({ module_id: MODULE_ID, title: "Titulo Atualizado" }),
    );

    expect(result.success).toBe(true);
  });
});

describe("deleteModuleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("soft-deleta modulo quando admin solicita remocao", async () => {
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

    const result = await deleteModuleAction(
      initialState,
      makeFormData({ module_id: MODULE_ID }),
    );

    expect(result.success).toBe(true);
    expect(result.message.toLowerCase()).toContain("arquivado");
    // Verify soft delete: UPDATE with deleted_at, not a hard DELETE
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
  });
});

describe("reorderModuleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("troca posicoes entre modulo e vizinho acima (direction=up)", async () => {
    const currentModule = { position: 2, course_id: COURSE_ID };
    const neighborModule = { id: NEIGHBOR_ID, position: 1 };

    // Track calls to from() to differentiate read vs update calls
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
          // First call: read current module
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: currentModule, error: null }),
          };
        }
        if (selectCallCount === 2) {
          // Second call: find neighbor
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: neighborModule, error: null }),
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

    const result = await reorderModuleAction(
      initialState,
      makeFormData({ module_id: MODULE_ID, direction: "up" }),
    );

    expect(result.success).toBe(true);
    // Verify two update calls were made (swap)
    expect(updateMock).toHaveBeenCalledTimes(2);
  });
});
