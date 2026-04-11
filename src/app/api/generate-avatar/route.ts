import { NextRequest, NextResponse } from "next/server";
import { createAvatarTask, createTTSTask, getTaskStatus, parseResultUrls } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";

export const maxDuration = 120;

// Poll TTS task until audio URL is ready (max 60s)
async function waitForTTS(apiKey: string, taskId: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const status = await getTaskStatus(apiKey, taskId);

    if (status.data?.state === "success") {
      const urls = parseResultUrls(status.data.resultJson);
      if (urls.length > 0) return urls[0];
      throw new Error("TTS completou mas sem URL de audio");
    }
    if (status.data?.state === "fail") {
      throw new Error(status.data.failMsg || "Falha ao gerar audio TTS");
    }
  }
  throw new Error("Timeout: TTS demorou muito para processar");
}

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

  const { imageUrl, audioUrl, text, prompt, voiceId, speed, languageCode, avatarTier, cost } = body;

  if (!imageUrl) {
    return NextResponse.json({ error: "Imagem e obrigatoria" }, { status: 400 });
  }

  if (!audioUrl && !text) {
    return NextResponse.json({ error: "Audio ou texto e obrigatorio" }, { status: 400 });
  }

  const { hasCredits, cost: finalCost } = await verifyCredits(user.id, "kling-avatar", cost);
  if (!hasCredits) return insufficientCreditsResponse(finalCost);

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "KIE API key nao configurada" }, { status: 500 });
  }

  try {
    let finalAudioUrl = audioUrl;

    // If no audio URL, generate TTS first
    if (!finalAudioUrl && text) {
      console.log("[avatar] generating TTS for text:", text.substring(0, 80));
      const ttsResult = await createTTSTask(apiKey, {
        text,
        voiceId,
        speed: speed || 1.0,
        languageCode: languageCode || "pt",
      });

      if (ttsResult.code !== 200 || !ttsResult.data) {
        return NextResponse.json(
          { error: ttsResult.msg || "Erro ao gerar audio TTS" },
          { status: ttsResult.code || 500 }
        );
      }

      console.log("[avatar] TTS task created:", ttsResult.data.taskId);
      finalAudioUrl = await waitForTTS(apiKey, ttsResult.data.taskId);
      console.log("[avatar] TTS audio ready:", finalAudioUrl);
    }

    // Create avatar task
    console.log("[avatar] creating avatar task, tier:", avatarTier || "standard");
    const result = await createAvatarTask(apiKey, {
      imageUrl,
      audioUrl: finalAudioUrl,
      prompt: prompt || undefined,
      tier: avatarTier || "standard",
    });

    if (result.code !== 200 || !result.data) {
      return NextResponse.json(
        { error: result.msg || "Erro ao criar task Avatar" },
        { status: result.code || 500 }
      );
    }

    await chargeCredits(user.id, "kling-avatar", finalCost, { prompt: (text || prompt || "").slice(0, 500), status: "pending" });

    return NextResponse.json({ taskId: result.data.taskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[avatar] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
