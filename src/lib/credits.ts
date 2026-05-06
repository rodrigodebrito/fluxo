import { createServiceClient } from "@/lib/supabase/server";

export async function checkCredits(userId: string, amount: number): Promise<boolean> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();

  return (data?.credits || 0) >= amount;
}

export async function debitCredits(
  userId: string,
  amount: number,
  reason: string,
  details?: { model?: string; prompt?: string; status?: string; metadata?: Record<string, unknown> }
): Promise<{ success: boolean; remaining: number }> {
  const supabase = await createServiceClient();

  // Debit atômico via RPC (evita race condition)
  const { data: remaining, error: rpcError } = await supabase.rpc("debit_credits", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (rpcError) {
    console.error("[debitCredits] RPC error, falling back:", rpcError.message);
    // Fallback: método não-atômico (caso RPC não exista ainda)
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();
    const current = profile?.credits || 0;
    if (current < amount) return { success: false, remaining: current };
    const newCredits = current - amount;
    await supabase.from("profiles").update({ credits: newCredits }).eq("id", userId);

    await supabase.from("credit_logs").insert({
      user_id: userId,
      amount: -amount,
      reason,
      model: details?.model || reason.replace("generation_", "") || null,
      prompt: details?.prompt?.slice(0, 500) || null,
      status: details?.status || "pending",
      metadata: details?.metadata || null,
    });
    return { success: true, remaining: newCredits };
  }

  // RPC retorna -1 se créditos insuficientes
  if (remaining === -1) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();
    return { success: false, remaining: profile?.credits || 0 };
  }

  // Log the debit
  await supabase.from("credit_logs").insert({
    user_id: userId,
    amount: -amount,
    reason,
    model: details?.model || reason.replace("generation_", "") || null,
    prompt: details?.prompt?.slice(0, 500) || null,
    status: details?.status || "pending",
    metadata: details?.metadata || null,
  });

  return { success: true, remaining: remaining as number };
}

export async function addCredits(
  userId: string,
  amount: number,
  reason: string = "admin_grant",
  details?: { model?: string; status?: string; metadata?: Record<string, unknown> }
): Promise<number> {
  const supabase = await createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();

  const newCredits = (profile?.credits || 0) + amount;

  await supabase
    .from("profiles")
    .update({ credits: newCredits })
    .eq("id", userId);

  await supabase.from("credit_logs").insert({
    user_id: userId,
    amount,
    reason,
    model: details?.model || null,
    status: details?.status || (reason === "refund" ? "refund" : reason),
    metadata: details?.metadata || null,
  });

  return newCredits;
}

// Custo do GPT Image 2 varia por resolution: 1K=6, 2K=10, 4K=16
export function getGptImage2Cost(resolution?: string): number {
  if (resolution === "4K") return 16;
  if (resolution === "2K") return 10;
  return 6;
}

// Base credit costs per model (minimum)
export function getModelCost(model: string): number {
  switch (model) {
    case "nano-banana-pro": return 18;
    case "veo3": return 60;
    case "veo-4k": return 120;
    case "seedance": return 165;
    case "kling": return 70;
    case "kling-o3-i2v": return 120;
    case "kling-o3-edit": return 180;
    case "kling-o1-ref": return 180;
    case "kling-motion": return 50;
    case "gpt-image-txt": return 4;
    case "gpt-image-img": return 4;
    case "gpt-image-2": return 6;
    case "seedream-edit": return 8;
    case "flux-2-pro": return 6;
    case "flux-2-edit": return 6;
    case "bg-removal": return 1;
    case "upscale": return 2;
    case "extract-audio": return 1;
    case "custom-model": return 20;
    case "wan-i2v": return 80;
    case "kling-avatar": return 40; // fallback, real cost is per-second
    case "grok-i2v": return 10;
    case "zimage-t2i": return 2;
    case "zimage-i2i": return 2;
    case "zimage-lora": return 3;
    case "zimage-i2i-lora": return 3;
    case "llm": return 1;
    default: return 18;
  }
}

// Happy Horse: custo dinamico por resolucao e duracao
export function getHappyHorseCost(resolution?: string, duration?: number): number {
  const perSec = resolution === "1080p" ? 53 : 31;
  return perSec * (duration || 5);
}
