import { NextRequest, NextResponse } from "next/server";
import { createVeoTask } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { hasCredits, cost } = await verifyCredits(user.id, "veo3", body.cost);
  if (!hasCredits) return insufficientCreditsResponse(cost);

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key nao configurada" }, { status: 500 });
  }

  const { prompt, imageUrls, model, generationType, aspectRatio, seed } = body;

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
  });

  if (result.code !== 200 || !result.data) {
    return NextResponse.json(
      { error: result.msg || "Erro ao criar task de video" },
      { status: result.code || 500 }
    );
  }

  await chargeCredits(user.id, "veo3", cost);

  return NextResponse.json({ taskId: result.data.taskId });
}
