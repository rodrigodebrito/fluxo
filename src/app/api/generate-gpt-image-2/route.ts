import { NextRequest, NextResponse } from "next/server";
import { createGptImage2Task } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";
import { getGptImage2Cost } from "@/lib/credits";

export const maxDuration = 60;

type Resolution = "1K" | "2K" | "4K";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "generation");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const body = await request.json();
  const { prompt, inputUrls, aspectRatio } = body;
  const resolution: Resolution = (body.resolution as Resolution) || "1K";
  const finalAspectRatio = aspectRatio || "1:1";

  // Restricoes da API Kie:
  // - aspect_ratio "auto" so suporta 1K
  // - aspect_ratio "1:1" nao suporta 4K
  if (finalAspectRatio === "auto" && resolution !== "1K") {
    return NextResponse.json(
      { error: "Aspect ratio 'auto' so suporta resolution 1K. Selecione um aspect ratio especifico para usar 2K ou 4K." },
      { status: 400 }
    );
  }
  if (finalAspectRatio === "1:1" && resolution === "4K") {
    return NextResponse.json(
      { error: "Aspect ratio 1:1 nao suporta 4K. Use 1K ou 2K com 1:1, ou outro aspect ratio para 4K." },
      { status: 400 }
    );
  }

  const model = "gpt-image-2";
  const expectedCost = getGptImage2Cost(resolution);
  const { hasCredits, cost } = await verifyCredits(user.id, model, expectedCost);
  if (!hasCredits) return insufficientCreditsResponse(cost);

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key nao configurada" }, { status: 500 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 });
  }

  try {
    const result = await createGptImage2Task(apiKey, {
      prompt,
      inputUrls,
      aspectRatio: finalAspectRatio,
      resolution,
    });

    if (result.code !== 200 || !result.data) {
      return NextResponse.json(
        { error: result.msg || "Erro ao criar task GPT Image 2" },
        { status: result.code || 500 }
      );
    }

    const charge = await chargeCredits(user.id, model, cost, {
      prompt: (prompt || "").slice(0, 500),
      status: "pending",
      metadata: { taskId: result.data.taskId, provider: "kie" },
    });
    if (!charge.success) {
      return NextResponse.json({ error: "Falha ao debitar creditos" }, { status: 500 });
    }

    return NextResponse.json({ taskId: result.data.taskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
