import { NextRequest, NextResponse } from "next/server";
import { createKlingTask, createKlingMotionTask } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "generation");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalido" }, { status: 400 });
  }

  const creditModel = body.model === "kling-motion" ? "kling-motion" : "kling";
  const { hasCredits, cost } = await verifyCredits(user.id, creditModel, body.cost);
  if (!hasCredits) return insufficientCreditsResponse(cost);

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key nao configurada" }, { status: 500 });
  }

  // Kling Motion Control
  if (body.model === "kling-motion") {
    const { prompt, inputUrls, videoUrls, motionVersion, motionMode, characterOrientation } = body;

    if (!inputUrls || inputUrls.length === 0) {
      return NextResponse.json({ error: "Imagem do personagem e obrigatoria" }, { status: 400 });
    }
    if (!videoUrls || videoUrls.length === 0) {
      return NextResponse.json({ error: "Video de referencia e obrigatorio" }, { status: 400 });
    }

    try {
      const result = await createKlingMotionTask(apiKey, {
        prompt: prompt || undefined,
        inputUrls,
        videoUrls,
        version: (motionVersion as "2.6" | "3.0") || "2.6",
        mode: (motionMode as "720p" | "1080p") || "720p",
        characterOrientation: (characterOrientation as "image" | "video") || "video",
      });

      if (result.code !== 200 || !result.data) {
        return NextResponse.json(
          { error: result.msg || "Erro ao criar task Kling Motion" },
          { status: result.code || 500 }
        );
      }

      await chargeCredits(user.id, "kling-motion", cost, { prompt: (prompt || "").slice(0, 500), status: "pending" });
      return NextResponse.json({ taskId: result.data.taskId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("[generate-kling-motion] error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Kling 3.0 standard
  const { prompt, imageUrls, mode, duration, aspectRatio, sound, elements, multiShotEnabled, multiShots } = body;

  const isMultiShot = multiShotEnabled && multiShots?.length > 0;
  if (!prompt && !isMultiShot) {
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
      multiShotEnabled,
      multiShots,
    });

    if (result.code !== 200 || !result.data) {
      return NextResponse.json(
        { error: result.msg || "Erro ao criar task Kling" },
        { status: result.code || 500 }
      );
    }

    await chargeCredits(user.id, "kling", cost, { prompt: (prompt || "").slice(0, 500), status: "pending" });

    return NextResponse.json({ taskId: result.data.taskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[generate-kling] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
