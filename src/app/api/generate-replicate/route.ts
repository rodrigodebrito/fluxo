import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateWithTrainedModel, getTrainingStatus } from "@/lib/ai/replicate";
import {
  getAuthUser,
  unauthorizedResponse,
  insufficientCreditsResponse,
  verifyCredits,
  chargeCredits,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/auth-guard";

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

  const { trainedModelId, prompt, aspectRatio, numOutputs, cost, extraLoraId } = body;

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
    // Get weights URL — fetch from Replicate API if not cached in DB
    let weightsUrl = model.weights_url;
    if (!weightsUrl && model.training_id) {
      const status = await getTrainingStatus(model.training_id);
      if (status.weightsUrl) {
        weightsUrl = status.weightsUrl;
        // Cache in DB for next time
        await supabase
          .from("trained_models")
          .update({ weights_url: weightsUrl })
          .eq("id", model.id);
      }
    }

    if (!weightsUrl) {
      return NextResponse.json(
        { error: "Modelo sem URL de pesos LoRA. Tente retreinar." },
        { status: 400 }
      );
    }

    // Look up extra LoRA if provided
    let extraLoraUrl: string | undefined;
    if (extraLoraId) {
      const { data: extraModel } = await supabase
        .from("trained_models")
        .select("weights_url, training_id")
        .eq("id", extraLoraId)
        .eq("user_id", user.id)
        .eq("status", "ready")
        .single();

      if (extraModel?.weights_url) {
        extraLoraUrl = extraModel.weights_url;
      } else if (extraModel?.training_id) {
        const extraStatus = await getTrainingStatus(extraModel.training_id);
        if (extraStatus.weightsUrl) {
          extraLoraUrl = extraStatus.weightsUrl;
          await supabase
            .from("trained_models")
            .update({ weights_url: extraStatus.weightsUrl })
            .eq("id", extraLoraId);
        }
      }
    }

    const imageUrls = await generateWithTrainedModel({
      loraWeightsUrl: weightsUrl,
      prompt,
      aspectRatio: aspectRatio || "1:1",
      numOutputs: numOutputs || 1,
      extraLoraUrl,
    });

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
    return NextResponse.json(
      { error: "Erro ao gerar imagem. Tente novamente." },
      { status: 500 }
    );
  }
}
