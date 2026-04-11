import { NextRequest, NextResponse } from "next/server";
import { createGrokImagineTask } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "generation");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const body = await request.json();
  const { hasCredits, cost } = await verifyCredits(user.id, "grok-i2v", body.cost);
  if (!hasCredits) return insufficientCreditsResponse(cost);

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key nao configurada" }, { status: 500 });
  }

  const { prompt, imageUrls, mode, duration, resolution, aspectRatio } = body;

  if (!imageUrls || imageUrls.length === 0) {
    return NextResponse.json({ error: "Imagem e obrigatoria" }, { status: 400 });
  }

  const result = await createGrokImagineTask(apiKey, {
    imageUrls,
    prompt,
    mode: mode || "normal",
    duration: duration || 6,
    resolution: resolution || "480p",
    aspectRatio: aspectRatio || "16:9",
    nsfwChecker: false,
  });

  if (result.code !== 200 || !result.data) {
    return NextResponse.json(
      { error: result.msg || "Erro ao criar task Grok Imagine" },
      { status: result.code || 500 }
    );
  }

  await chargeCredits(user.id, "grok-i2v", cost, { prompt: (prompt || "").slice(0, 500), status: "pending" });

  return NextResponse.json({ taskId: result.data.taskId });
}
