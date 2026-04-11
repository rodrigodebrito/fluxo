import { NextRequest, NextResponse } from "next/server";
import { createGptImageTask } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "generation");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const body = await request.json();
  const { prompt, inputUrls, aspectRatio, quality, background } = body;

  const model = inputUrls?.length > 0 ? "gpt-image-img" : "gpt-image-txt";
  const { hasCredits, cost } = await verifyCredits(user.id, model, body.cost);
  if (!hasCredits) return insufficientCreditsResponse(cost);

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key nao configurada" }, { status: 500 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 });
  }

  try {
    const result = await createGptImageTask(apiKey, {
      prompt,
      inputUrls,
      aspectRatio: aspectRatio || "1:1",
      quality: quality || "medium",
      background,
    });

    if (result.code !== 200 || !result.data) {
      return NextResponse.json(
        { error: result.msg || "Erro ao criar task GPT Image" },
        { status: result.code || 500 }
      );
    }

    await chargeCredits(user.id, model, cost, { prompt: (prompt || "").slice(0, 500), status: "pending" });

    return NextResponse.json({ taskId: result.data.taskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
