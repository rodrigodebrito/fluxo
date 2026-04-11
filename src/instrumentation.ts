export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
    // Validate env vars on server startup
    const { validateEnv } = await import("./lib/env");
    validateEnv();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = async (...args: unknown[]) => {
  const Sentry = await import("@sentry/nextjs");
  // @ts-expect-error - Sentry types may not match exactly
  return Sentry.captureRequestError(...args);
};
