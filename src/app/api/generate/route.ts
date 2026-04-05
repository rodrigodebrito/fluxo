import { NextRequest, NextResponse } from "next/server";
import { createImageTask } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { hasCredits, cost } = await verifyCredits(user.id, "nano-banana-pro");
  if (!hasCredits) return insufficientCreditsResponse(cost);

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key nao configurada" },
      { status: 500 }
    );
  }

  const body = await request.json();
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

  // Debit credits after successful task creation
  await chargeCredits(user.id, "nano-banana-pro");

  return NextResponse.json({ taskId: result.data.taskId });
}
