import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getClientEnv, getEnv, resetEnvCache } from "./env";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  resetEnvCache();
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  };
});

afterEach(() => {
  resetEnvCache();
  process.env = { ...ORIGINAL_ENV };
});

describe("env helpers", () => {
  it("reads server variables successfully", () => {
    const parsed = getEnv();
    expect(parsed.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
  });

  it("exposes client safe variables only", () => {
    const clientEnv = getClientEnv();
    expect(clientEnv).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
  });

  it("throws when mandatory env vars are missing", () => {
    resetEnvCache();
    const rest = { ...process.env };
    delete rest.NEXT_PUBLIC_SUPABASE_URL;
    process.env = { ...rest, NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => {
      resetEnvCache();
      getEnv();
    }).toThrowError();

    consoleSpy.mockRestore();
  });
});
