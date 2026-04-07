import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateWithTrainedModel, getTrainingStatus } from "@/lib/ai/replicate";
import type { LoraInput } from "@/lib/ai/replicate";
import {
  getAuthUser,
  unauthorizedResponse,
  insufficientCreditsResponse,
  verifyCredits,
  chargeCredits,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/auth-guard";

async function resolveWeightsUrl(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createServiceClient>>,
  model: { id: string; weights_url?: string | null; training_id?: string | null; replicate_model_id?: string | null }
): Promise<string | null> {
  if (model.weights_url) return model.weights_url;

  // Try fetching from Replicate API
  if (model.training_id) {
    const status = await getTrainingStatus(model.training_id);
    if (status.weightsUrl) {
      await supabase
        .from("trained_models")
        .update({ weights_url: status.weightsUrl })
        .eq("id", model.id);
      return status.weightsUrl;
    }
  }

  // Fallback: use replicate_model_id as HF-style path (lucataco/flux-dev-multi-lora accepts this)
  if (model.replicate_model_id) return model.replicate_model_id;

  return null;
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "generation");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalido" }, { status: 400 });
  }

  const { trainedModelId, prompt, aspectRatio, numOutputs, cost, extraLoraIds, nsfwEnabled } = body;

  if (!trainedModelId) {
    return NextResponse.json(
      { error: "Selecione um modelo treinado" },
      { status: 400 }
    );
  }

  if (!prompt) {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 });
  }

  const finalCost = cost || 10;
  const { hasCredits } = await verifyCredits(user.id, "custom-model", finalCost);
  if (!hasCredits) return insufficientCreditsResponse(finalCost);

  // Verify model belongs to user and is ready
  const supabase = await createServiceClient();
  const { data: model } = await supabase
    .from("trained_models")
    .select("*")
    .eq("id", trainedModelId)
    .eq("user_id", user.id)
    .eq("status", "ready")
    .single();

  if (!model) {
    return NextResponse.json(
      { error: "Modelo nao encontrado ou ainda em treinamento" },
      { status: 404 }
    );
  }

  try {
    // Build LoRA list
    const loras: LoraInput[] = [];

    // Main LoRA
    const mainUrl = await resolveWeightsUrl(supabase, model);
    if (!mainUrl) {
      return NextResponse.json(
        { error: "Modelo sem URL de pesos LoRA. Tente retreinar." },
        { status: 400 }
      );
    }
    loras.push({ url: mainUrl, scale: 1 });

    // Extra LoRA(s) — supports multiple
    const loraIds: string[] = Array.isArray(extraLoraIds) ? extraLoraIds : [];
    for (const loraId of loraIds) {
      if (!loraId) continue;
      const { data: extraModel } = await supabase
        .from("trained_models")
        .select("id, weights_url, training_id, replicate_model_id")
        .eq("id", loraId)
        .eq("user_id", user.id)
        .eq("status", "ready")
        .single();

      if (extraModel) {
        const extraUrl = await resolveWeightsUrl(supabase, extraModel);
        if (extraUrl) {
          loras.push({ url: extraUrl, scale: 1 });
        }
      }
    }

    console.log("[generate-replicate] loras:", loras.map(l => l.url));

    const imageUrls = await generateWithTrainedModel({
      loras,
      prompt,
      aspectRatio: aspectRatio || "1:1",
      numOutputs: numOutputs || 1,
      nsfwEnabled: nsfwEnabled ?? true,
    });

    console.log("[generate-replicate] imageUrls:", imageUrls);

    if (!imageUrls.length) {
      return NextResponse.json(
        { error: "Nenhuma imagem gerada" },
        { status: 500 }
      );
    }

    // Charge credits
    await chargeCredits(user.id, "custom-model", finalCost);

    // Save to generations
    await supabase.from("generations").insert({
      user_id: user.id,
      model: "custom-model",
      prompt,
      result_urls: imageUrls,
      cost: finalCost,
      type: "image",
    });

    return NextResponse.json({
      success: true,
      urls: imageUrls,
    });
  } catch (err) {
    console.error("[generate-replicate] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Erro ao gerar imagem: ${msg}` },
      { status: 500 }
    );
  }
}
