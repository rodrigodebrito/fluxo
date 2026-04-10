import { NextRequest, NextResponse } from "next/server";
import { createWan27Task } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";
import { checkPromptSafety } from "@/lib/content-filter";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "generation");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const body = await request.json();
  const { hasCredits, cost } = await verifyCredits(user.id, "wan-i2v", body.cost);
  if (!hasCredits) return insufficientCreditsResponse(cost);

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key nao configurada" }, { status: 500 });
  }

  const { prompt, negativePrompt, firstFrameUrl, lastFrameUrl, firstClipUrl, drivingAudioUrl, resolution, duration, promptExtend, seed } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 });
  }

  const safety = checkPromptSafety(prompt);
  if (!safety.safe) {
    return NextResponse.json({ error: safety.reason }, { status: 403 });
  }

  const result = await createWan27Task(apiKey, {
    prompt,
    negativePrompt,
    firstFrameUrl,
    lastFrameUrl,
    firstClipUrl,
    drivingAudioUrl,
    resolution: resolution || "720p",
    duration: duration || 5,
    promptExtend: promptExtend ?? true,
    seed,
    nsfwChecker: false,
  });

  if (result.code !== 200 || !result.data) {
    return NextResponse.json(
      { error: result.msg || "Erro ao criar task Wan 2.7" },
      { status: result.code || 500 }
    );
  }

  await chargeCredits(user.id, "wan-i2v", cost, { prompt: (prompt || "").slice(0, 500), status: "pending" });

  return NextResponse.json({ taskId: result.data.taskId });
}
