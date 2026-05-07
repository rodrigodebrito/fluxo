import { NextRequest, NextResponse } from "next/server";
import { createHappyHorseTask } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";

export const maxDuration = 60;

// Happy Horse: 31 cred/s (720p) · 53 cred/s (1080p)
function getHappyHorseCost(resolution: string, duration: number): number {
  const perSec = resolution === "1080p" ? 53 : 31;
  return perSec * duration;
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "generation");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const body = await request.json();
  const { prompt, imageUrls, resolution, duration } = body;

  if (!imageUrls || imageUrls.length === 0) {
    return NextResponse.json({ error: "Imagem e obrigatoria" }, { status: 400 });
  }

  const finalResolution = resolution || "1080p";
  const finalDuration = duration || 5;
  const cost = getHappyHorseCost(finalResolution, finalDuration);

  const { hasCredits } = await verifyCredits(user.id, "happyhorse", cost);
  if (!hasCredits) {
    return NextResponse.json(
      { error: `Creditos insuficientes. Custo: ${cost} creditos` },
      { status: 402 }
    );
  }

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key nao configurada" }, { status: 500 });
  }

  const result = await createHappyHorseTask(apiKey, {
    prompt,
    imageUrls,
    resolution: finalResolution,
    duration: finalDuration,
    seed: body.seed ?? null,
  });

  if (result.code !== 200 || !result.data) {
    return NextResponse.json(
      { error: result.msg || "Erro ao criar task Happy Horse" },
      { status: result.code || 500 }
    );
  }

  const charge = await chargeCredits(user.id, "happyhorse", cost, {
    prompt: (prompt || "").slice(0, 500),
    status: "pending",
    metadata: { taskId: result.data.taskId, provider: "kie", resolution: finalResolution, duration: finalDuration },
  });
  if (!charge.success) {
    return NextResponse.json({ error: "Falha ao debitar creditos" }, { status: 500 });
  }

  return NextResponse.json({ taskId: result.data.taskId });
}