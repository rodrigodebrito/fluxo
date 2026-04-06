import { NextRequest, NextResponse } from "next/server";
import { submitFalTask, buildFalInput, getFalEndpoint, FAL_MODELS } from "@/lib/ai/fal";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";

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

  const { model, cost, tier } = body;

  if (!model || !FAL_MODELS.has(model)) {
    return NextResponse.json({ error: `Modelo fal.ai invalido: ${model}` }, { status: 400 });
  }

  const endpoint = getFalEndpoint(model, tier || "pro");
  if (!endpoint) {
    return NextResponse.json({ error: `Endpoint fal.ai nao encontrado: ${model}/${tier}` }, { status: 400 });
  }

  const { hasCredits, cost: finalCost } = await verifyCredits(user.id, model, cost);
  if (!hasCredits) return insufficientCreditsResponse(finalCost);

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "FAL_KEY nao configurada" }, { status: 500 });
  }

  const { prompt } = body;
  if (!prompt) {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 });
  }

  try {
    const input = buildFalInput({
      model,
      prompt,
      negativePrompt: body.negativePrompt,
      imageUrls: body.imageUrls,
      videoUrl: body.videoUrl,
      endImageUrl: body.endImageUrl,
      duration: body.duration,
      aspectRatio: body.aspectRatio,
      generateAudio: body.generateAudio,
      cfgScale: body.cfgScale,
      keepAudio: body.keepAudio,
      elements: body.elements,
    });

    console.log("[generate-fal] model:", model, "endpoint:", endpoint, "input:", JSON.stringify(input));

    const result = await submitFalTask(falKey, endpoint, input);

    await chargeCredits(user.id, model, finalCost);

    return NextResponse.json({
      taskId: result.request_id,
      falEndpoint: endpoint,
      statusUrl: result.status_url || undefined,
      responseUrl: result.response_url || undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[generate-fal] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
