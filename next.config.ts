import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,
  // ⬇️ Substitua 'hideSourceMaps: true' por:
  sourcemaps: { hideSources: true },

  // opcional: como você já tinha
  disableServerWebpackPlugin: process.env.NODE_ENV === "development",
});
