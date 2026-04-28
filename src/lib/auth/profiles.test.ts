import { describe, expect, it, vi } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/observability/sentry", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureProfileExists } from "@/lib/auth/profiles";

describe("ensureProfileExists", () => {
  it("does nothing when profile row already exists", async () => {
    const insertFn = vi.fn(async () => ({ error: null }));
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { id: "user-1" }, error: null })),
          })),
        })),
        insert: insertFn,
      })),
    };
    vi.mocked(createSupabaseAdminClient).mockReturnValue(mockClient as never);

    await ensureProfileExists("user-1");

    expect(insertFn).not.toHaveBeenCalled();
  });

  it("inserts fallback profile when profile is missing", async () => {
    const insertFn = vi.fn(async () => ({ error: null }));
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
        insert: insertFn,
      })),
    };
    vi.mocked(createSupabaseAdminClient).mockReturnValue(mockClient as never);

    await ensureProfileExists("user-2", { fullName: "Maria" });

    expect(insertFn).toHaveBeenCalledWith({
      id: "user-2",
      full_name: "Maria",
      role: "student",
    });
  });

  it("logs error and returns when admin client read fails — does NOT attempt insert", async () => {
    const insertFn = vi.fn(async () => ({ error: null }));
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: null,
              error: { message: "connection refused", code: "PGRST000" },
            })),
          })),
        })),
        insert: insertFn,
      })),
    };
    vi.mocked(createSupabaseAdminClient).mockReturnValue(mockClient as never);

    await ensureProfileExists("user-3");

    expect(insertFn).not.toHaveBeenCalled();
  });
});
