import { NextRequest, NextResponse } from "next/server";
import { createSeedreamEditTask } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "generation");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const body = await request.json();
  const { prompt, imageUrls, aspectRatio, quality } = body;

  const { hasCredits, cost } = await verifyCredits(user.id, "seedream-edit");
  if (!hasCredits) return insufficientCreditsResponse(cost);

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key nao configurada" }, { status: 500 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 });
  }

  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    return NextResponse.json({ error: "Pelo menos 1 imagem e obrigatoria" }, { status: 400 });
  }

  if (imageUrls.length > 4) {
    return NextResponse.json({ error: "Maximo 4 imagens" }, { status: 400 });
  }

  try {
    const result = await createSeedreamEditTask(apiKey, {
      prompt,
      imageUrls,
      aspectRatio: aspectRatio || "9:16",
      quality: quality === "high" ? "high" : "basic",
    });

    if (result.code !== 200 || !result.data) {
      return NextResponse.json(
        { error: result.msg || "Erro ao criar task Seedream" },
        { status: result.code || 500 }
      );
    }

    const charge = await chargeCredits(user.id, "seedream-edit", cost, {
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
