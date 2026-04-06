import { NextRequest, NextResponse } from "next/server";
import { createImageTask } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "generation");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const body = await request.json();
  const { hasCredits, cost } = await verifyCredits(user.id, "nano-banana-pro", body.cost);
  if (!hasCredits) return insufficientCreditsResponse(cost);

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key nao configurada" },
      { status: 500 }
    );
  }

  const { prompt, imageInput, aspectRatio, resolution, outputFormat, seed } = body;

  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt e obrigatorio" },
      { status: 400 }
    );
  }

  const result = await createImageTask(apiKey, {
    prompt,
    imageInput,
    aspectRatio,
    resolution,
    outputFormat,
    seed,
  });

  if (result.code !== 200 || !result.data) {
    return NextResponse.json(
      { error: result.msg || "Erro ao criar task" },
      { status: result.code || 500 }
    );
  }

  await chargeCredits(user.id, "nano-banana-pro", cost);

  return NextResponse.json({ taskId: result.data.taskId });
}
