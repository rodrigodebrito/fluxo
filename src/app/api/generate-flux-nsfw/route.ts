import { NextRequest, NextResponse } from "next/server";
import { generateWithFluxNSFW } from "@/lib/ai/replicate";
import {
  getAuthUser,
  unauthorizedResponse,
  insufficientCreditsResponse,
  verifyCredits,
  chargeCredits,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/auth-guard";
import { checkPromptSafety } from "@/lib/content-filter";
import { createServiceClient } from "@/lib/supabase/server";

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

  const { prompt, aspectRatio, cfgScale, steps, seed, numOutputs, cost } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 });
  }

  const safety = checkPromptSafety(prompt);
  if (!safety.safe) {
    return NextResponse.json({ error: safety.reason }, { status: 403 });
  }

  const finalCost = cost || 8;
  const { hasCredits } = await verifyCredits(user.id, "flux-nsfw", finalCost);
  if (!hasCredits) return insufficientCreditsResponse(finalCost);

  try {
    // Map aspect ratio to width/height
    const sizeMap: Record<string, { width: number; height: number }> = {
      "1:1": { width: 1024, height: 1024 },
      "16:9": { width: 1344, height: 768 },
      "9:16": { width: 768, height: 1344 },
      "4:3": { width: 1184, height: 896 },
      "3:4": { width: 896, height: 1184 },
      "3:2": { width: 1248, height: 832 },
      "2:3": { width: 832, height: 1248 },
    };
    const size = sizeMap[aspectRatio || "1:1"] || sizeMap["1:1"];

    const imageUrls = await generateWithFluxNSFW({
      prompt,
      width: size.width,
      height: size.height,
      cfgScale: cfgScale ?? 5,
      steps: steps ?? 20,
      seed: seed ?? -1,
      numOutputs: numOutputs || 1,
    });

    if (!imageUrls.length) {
      return NextResponse.json({ error: "Nenhuma imagem gerada" }, { status: 500 });
    }

    await chargeCredits(user.id, "flux-nsfw", finalCost);

    const supabase = await createServiceClient();
    await supabase.from("generations").insert({
      user_id: user.id,
      model: "flux-nsfw",
      prompt,
      result_urls: imageUrls,
      cost: finalCost,
      type: "image",
    });

    return NextResponse.json({ success: true, urls: imageUrls });
  } catch (err) {
    console.error("[generate-flux-nsfw] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Erro ao gerar imagem: ${msg}` }, { status: 500 });
  }
}
