import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    middlewareClientMaxBodySize: "50mb",
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry org and project (set via env vars)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only upload source maps in production builds
  silent: !process.env.CI,

  // Tunnel route to avoid ad blockers
  tunnelRoute: "/monitoring",

  // Disable Sentry telemetry
  telemetry: false,

  // Source maps config
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
});
