import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Session replay for debugging
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0, // 100% when error happens

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Ignore common non-actionable errors
  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection",
    "AbortError",
    "cancelled",
  ],
});
