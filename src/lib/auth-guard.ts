import { createClient } from "@/lib/supabase/server";
import { checkCredits, debitCredits, getModelCost } from "@/lib/credits";
import { NextResponse } from "next/server";

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

export async function verifyCredits(userId: string, model: string) {
  const cost = getModelCost(model);
  const hasCredits = await checkCredits(userId, cost);
  return { hasCredits, cost };
}

export async function chargeCredits(userId: string, model: string) {
  const cost = getModelCost(model);
  return debitCredits(userId, cost, `generation_${model}`);
}
