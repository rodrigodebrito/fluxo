import { createClient } from "@/lib/supabase/server";
import { checkCredits, debitCredits, getModelCost } from "@/lib/credits";
import { NextResponse } from "next/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
}

export function insufficientCreditsResponse(cost: number) {
  return NextResponse.json(
    { error: `Creditos insuficientes. Custo: ${cost} creditos` },
    { status: 402 }
  );
}

export async function verifyCredits(userId: string, model: string, cost?: number) {
  const finalCost = cost || getModelCost(model);
  const hasCredits = await checkCredits(userId, finalCost);
  return { hasCredits, cost: finalCost };
}

export async function chargeCredits(userId: string, model: string, cost?: number, details?: { prompt?: string; status?: string; metadata?: Record<string, unknown> }) {
  const finalCost = cost || getModelCost(model);
  return debitCredits(userId, finalCost, `generation_${model}`, { model, ...details });
}

export function rateLimitResponse(resetIn: number) {
  return NextResponse.json(
    { error: `Muitas requisicoes. Tente novamente em ${resetIn} segundos.` },
    { status: 429 }
  );
}

export function checkRateLimit(userId: string, type: keyof typeof RATE_LIMITS) {
  const config = RATE_LIMITS[type];
  return rateLimit(`${type}:${userId}`, config);
}
