// Rate limiter em memoria (funciona com 1 instancia no Render)
// Para escalar com multiplas instancias, migrar para Upstash Redis

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpa entradas expiradas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  /** Maximo de requests no intervalo */
  limit: number;
  /** Janela de tempo em segundos */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // segundos ate reset
}

export function rateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // Nova janela
    store.set(key, {
      count: 1,
      resetAt: now + config.windowSeconds * 1000,
    });
    return { allowed: true, remaining: config.limit - 1, resetIn: config.windowSeconds };
  }

  if (entry.count >= config.limit) {
    const resetIn = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, resetIn };
  }

  entry.count++;
  const resetIn = Math.ceil((entry.resetAt - now) / 1000);
  return { allowed: true, remaining: config.limit - entry.count, resetIn };
}

// Configs por tipo de rota
export const RATE_LIMITS = {
  // Geracoes de IA — mais restrito (custa dinheiro)
  generation: { limit: 10, windowSeconds: 60 },     // 10 por minuto
  // Upload de arquivos
  upload: { limit: 20, windowSeconds: 60 },          // 20 por minuto
  // LLM (barato, mas ainda custa)
  llm: { limit: 15, windowSeconds: 60 },             // 15 por minuto
  // Auth (login, register, reset)
  auth: { limit: 5, windowSeconds: 300 },            // 5 por 5 minutos
  // Geral (API routes leves)
  general: { limit: 60, windowSeconds: 60 },         // 60 por minuto
} as const;
