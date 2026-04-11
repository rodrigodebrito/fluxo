/**
 * Validates required environment variables on startup.
 * Called in instrumentation.ts — if any required var is missing,
 * logs a clear error so it's obvious what needs to be configured.
 */

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "KIE_API_KEY",
  "OPENAI_API_KEY",
  "FAL_KEY",
] as const;

const OPTIONAL_VARS = [
  "PIAPI_API_KEY",
  "MP_ACCESS_TOKEN",
  "FAL_ADMIN_KEY",
  "MP_WEBHOOK_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const;

export function validateEnv() {
  const missing: string[] = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(
      `\n❌ VARIAVEIS DE AMBIENTE OBRIGATORIAS FALTANDO:\n` +
      missing.map((k) => `   - ${k}`).join("\n") +
      `\n\nO app pode nao funcionar corretamente sem essas variaveis.\n`
    );
  }

  // Log optional vars that are not set (info level, not error)
  const missingOptional = OPTIONAL_VARS.filter((k) => !process.env[k]);
  if (missingOptional.length > 0) {
    console.warn(
      `⚠️  Variaveis opcionais nao configuradas: ${missingOptional.join(", ")}`
    );
  }

  return missing.length === 0;
}
