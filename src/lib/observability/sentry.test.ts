import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock @sentry/nextjs BEFORE importing the wrapper to intercept calls
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import * as SentrySDK from "@sentry/nextjs";
import { captureException, captureMessage } from "@/lib/observability/sentry";

const ORIGINAL_SENTRY_DSN = process.env.SENTRY_DSN;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  if (ORIGINAL_SENTRY_DSN !== undefined) {
    process.env.SENTRY_DSN = ORIGINAL_SENTRY_DSN;
  } else {
    delete process.env.SENTRY_DSN;
  }
});

describe("captureException", () => {
  it("no-ops when SENTRY_DSN is absent", () => {
    delete process.env.SENTRY_DSN;
    captureException(new Error("test error"));
    expect(SentrySDK.captureException).not.toHaveBeenCalled();
  });

  it("calls Sentry.captureException with err and extra ctx when DSN is set", () => {
    process.env.SENTRY_DSN = "https://example@sentry.io/1";
    const err = new Error("test error");
    captureException(err, { userId: "abc" });
    expect(SentrySDK.captureException).toHaveBeenCalledWith(err, {
      extra: { userId: "abc" },
    });
  });
});

describe("captureMessage", () => {
  it("no-ops when SENTRY_DSN is absent", () => {
    delete process.env.SENTRY_DSN;
    captureMessage("hello");
    expect(SentrySDK.captureMessage).not.toHaveBeenCalled();
  });

  it("calls Sentry.captureMessage with level and extra when DSN is set", () => {
    process.env.SENTRY_DSN = "https://example@sentry.io/1";
    captureMessage("hello", "warning", { key: "val" });
    expect(SentrySDK.captureMessage).toHaveBeenCalledWith("hello", {
      level: "warning",
      extra: { key: "val" },
    });
  });
});
