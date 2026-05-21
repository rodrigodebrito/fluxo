import { NextRequest, NextResponse } from "next/server";
import { createGeminiOmniVideoTask } from "@/lib/ai/kie";
import { getGeminiOmniVideoCost } from "@/lib/credits";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "generation");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const body = await request.json();
  const { prompt, imageUrls, videoUrl, resolution, duration, videoDuration } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 });
  }

  const finalResolution = resolution === "4K" ? "4K" : resolution === "720p" ? "720p" : "1080p";
  const finalDuration = duration === 10 || duration === 8 || duration === 6 ? duration : 4;
  const hasVideoInput = Boolean(videoUrl);
  const cost = getGeminiOmniVideoCost(finalResolution, finalDuration, hasVideoInput);
  const { hasCredits } = await verifyCredits(user.id, "gemini-omni-video", cost);
  if (!hasCredits) return insufficientCreditsResponse(cost);

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key nao configurada" }, { status: 500 });
  }

  const limitedVideoDuration = typeof videoDuration === "number" && videoDuration > 0
    ? Math.min(30, Math.floor(videoDuration))
    : undefined;
  const videoEnd = hasVideoInput
    ? Math.min(finalDuration, limitedVideoDuration || finalDuration)
    : undefined;

  const result = await createGeminiOmniVideoTask(apiKey, {
    prompt,
    imageUrls: Array.isArray(imageUrls) ? imageUrls : undefined,
    videoUrl: typeof videoUrl === "string" && videoUrl ? videoUrl : undefined,
    videoStart: hasVideoInput ? 0 : undefined,
    videoEnd,
  });

  if (result.code !== 200 || !result.data) {
    return NextResponse.json(
      { error: result.msg || "Erro ao criar task Gemini Omni Video" },
      { status: result.code || 500 }
    );
  }

  const charge = await chargeCredits(user.id, "gemini-omni-video", cost, {
    prompt: (prompt || "").slice(0, 500),
    status: "pending",
    metadata: {
      taskId: result.data.taskId,
      provider: "kie",
      resolution: finalResolution,
      duration: finalDuration,
      hasVideoInput,
    },
  });
  if (!charge.success) {
    return NextResponse.json({ error: "Falha ao debitar creditos" }, { status: 500 });
  }

  return NextResponse.json({ taskId: result.data.taskId });
}
