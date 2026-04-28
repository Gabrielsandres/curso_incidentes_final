// src/lib/observability/sentry.ts
// NOT marked "use server" — must be importable from client components (global-error.tsx).
// Gates on process.env.SENTRY_DSN directly (NOT getEnv()) to keep import graph
// free of server-only modules like next/headers. This is intentional per D-03.

import * as Sentry from "@sentry/nextjs";

import { logger } from "@/lib/logger";

export type SentryContext = Record<string, unknown>;
export type SeverityLevel = "fatal" | "error" | "warning" | "log" | "info" | "debug";

let _warnedOnce = false;

function isEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN);
}

export function captureException(err: unknown, ctx?: SentryContext): void {
  if (!isEnabled()) {
    if (process.env.NODE_ENV === "production" && !_warnedOnce) {
      logger.warn("Sentry DSN not configured — error reporting disabled in production");
      _warnedOnce = true;
    }
    return;
  }
  Sentry.captureException(err, { extra: ctx });
}

export function captureMessage(
  message: string,
  level: SeverityLevel = "info",
  ctx?: SentryContext
): void {
  if (!isEnabled()) return;
  Sentry.captureMessage(message, { level, extra: ctx });
}
