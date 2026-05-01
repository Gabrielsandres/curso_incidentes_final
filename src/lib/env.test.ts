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

describe("SUPABASE_SERVICE_ROLE_KEY prod refinement", () => {
  it("throws when NODE_ENV=production and key is absent", () => {
    const origNodeEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
    });
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetEnvCache();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => getEnv()).toThrowError();

    consoleSpy.mockRestore();
    Object.defineProperty(process.env, "NODE_ENV", {
      value: origNodeEnv,
      configurable: true,
    });
    resetEnvCache();
  });

  it("does not throw when NODE_ENV=test and key is absent", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetEnvCache();
    expect(() => getEnv()).not.toThrow();
  });
});

describe("Bunny env vars", () => {
  it("BUNNY_STREAM_TOKEN_TTL_SECONDS defaults to 3600 when not set", () => {
    delete process.env.BUNNY_STREAM_TOKEN_TTL_SECONDS;
    resetEnvCache();
    const env = getEnv();
    expect(env.BUNNY_STREAM_TOKEN_TTL_SECONDS).toBe(3600);
  });

  it("BUNNY_STREAM_TOKEN_TTL_SECONDS accepts a custom numeric value", () => {
    process.env.BUNNY_STREAM_TOKEN_TTL_SECONDS = "7200";
    resetEnvCache();
    const env = getEnv();
    expect(env.BUNNY_STREAM_TOKEN_TTL_SECONDS).toBe(7200);
  });

  it("BUNNY_STREAM_TOKEN_KEY and BUNNY_STREAM_LIBRARY_ID are optional in dev/test", () => {
    delete process.env.BUNNY_STREAM_TOKEN_KEY;
    delete process.env.BUNNY_STREAM_LIBRARY_ID;
    resetEnvCache();
    expect(() => getEnv()).not.toThrow();
  });

  it("throws when NODE_ENV=production and BUNNY_STREAM_TOKEN_KEY is absent", () => {
    const origNodeEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
    });
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-key";
    delete process.env.BUNNY_STREAM_TOKEN_KEY;
    resetEnvCache();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => getEnv()).toThrowError();

    consoleSpy.mockRestore();
    Object.defineProperty(process.env, "NODE_ENV", {
      value: origNodeEnv,
      configurable: true,
    });
    resetEnvCache();
  });

  it("throws when NODE_ENV=production and BUNNY_STREAM_LIBRARY_ID is absent", () => {
    const origNodeEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
    });
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-key";
    process.env.BUNNY_STREAM_TOKEN_KEY = "fake-token-key";
    delete process.env.BUNNY_STREAM_LIBRARY_ID;
    resetEnvCache();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => getEnv()).toThrowError();

    consoleSpy.mockRestore();
    Object.defineProperty(process.env, "NODE_ENV", {
      value: origNodeEnv,
      configurable: true,
    });
    resetEnvCache();
  });
});
