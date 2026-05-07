import { NextRequest, NextResponse } from "next/server";
import { createVeoTask } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "generation");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const body = await request.json();
  const { hasCredits, cost } = await verifyCredits(user.id, "veo3");
  if (!hasCredits) return insufficientCreditsResponse(cost);

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key nao configurada" }, { status: 500 });
  }

  const { prompt, imageUrls, model, generationType, aspectRatio, seed, duration, resolution, enhancePrompt } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 });
  }

  const result = await createVeoTask(apiKey, {
    prompt,
    imageUrls,
    model: model || "veo3_fast",
    generationType,
    aspectRatio,
    seed,
    duration,
    resolution,
    enhancePrompt,
  });

  if (result.code !== 200 || !result.data) {
    return NextResponse.json(
      { error: result.msg || "Erro ao criar task de video" },
      { status: result.code || 500 }
    );
  }

  const charge = await chargeCredits(user.id, "veo3", cost, {
    prompt: (prompt || "").slice(0, 500),
    status: "pending",
    metadata: { taskId: result.data.taskId, provider: "kie" },
  });
  if (!charge.success) {
    return NextResponse.json({ error: "Falha ao debitar creditos" }, { status: 500 });
  }

  return NextResponse.json({ taskId: result.data.taskId });
}
