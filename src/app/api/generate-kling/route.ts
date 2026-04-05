import { NextRequest, NextResponse } from "next/server";
import { createKlingTask } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalido" }, { status: 400 });
  }

  const { hasCredits, cost } = await verifyCredits(user.id, "kling", body.cost);
  if (!hasCredits) return insufficientCreditsResponse(cost);

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key nao configurada" }, { status: 500 });
  }

  const { prompt, imageUrls, mode, duration, aspectRatio, sound, elements } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 });
  }

  try {
    const result = await createKlingTask(apiKey, {
      prompt,
      imageUrls,
      mode: mode || "std",
      duration: duration || 5,
      aspectRatio: aspectRatio || "16:9",
      sound: sound ?? false,
      elements,
    });

    if (result.code !== 200 || !result.data) {
      return NextResponse.json(
        { error: result.msg || "Erro ao criar task Kling" },
        { status: result.code || 500 }
      );
    }

    await chargeCredits(user.id, "kling", cost);

    return NextResponse.json({ taskId: result.data.taskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[generate-kling] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
