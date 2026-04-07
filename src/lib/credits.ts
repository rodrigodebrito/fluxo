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
  reason: string
): Promise<{ success: boolean; remaining: number }> {
  const supabase = await createServiceClient();

  // Get current credits
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();

  const current = profile?.credits || 0;
  if (current < amount) {
    return { success: false, remaining: current };
  }

  const newCredits = current - amount;

  // Update credits
  await supabase
    .from("profiles")
    .update({ credits: newCredits })
    .eq("id", userId);

  // Log the debit
  await supabase.from("credit_logs").insert({
    user_id: userId,
    amount: -amount,
    reason,
  });

  return { success: true, remaining: newCredits };
}

export async function addCredits(
  userId: string,
  amount: number,
  reason: string = "admin_grant"
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
  });

  return newCredits;
}

// Base credit costs per model (minimum)
export function getModelCost(model: string): number {
  switch (model) {
    case "nano-banana-pro": return 18;
    case "veo3": return 60;
    case "seedance": return 40;
    case "kling": return 70;
    case "kling-o3-i2v": return 120;
    case "kling-o3-edit": return 180;
    case "kling-o1-ref": return 180;
    case "kling-motion": return 50;
    case "gpt-image-txt": return 4;
    case "gpt-image-img": return 4;
    case "flux-2-pro": return 6;
    case "flux-2-edit": return 6;
    case "bg-removal": return 1;
    case "upscale": return 2;
    case "custom-model": return 10;
    case "llm": return 1;
    default: return 18;
  }
}
