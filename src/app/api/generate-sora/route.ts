import { NextRequest, NextResponse } from "next/server";
import { submitFalTask, createSoraCharacter, buildSoraInput, getSoraEndpoint } from "@/lib/ai/fal";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";
import { checkPromptSafety } from "@/lib/content-filter";

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

  const { model, prompt, imageUrl, duration, aspectRatio, seed, charVideoUrl1, charVideoUrl2, charName1, charName2, cost } = body;

  if (!prompt || !prompt.trim()) {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 });
  }

  const safety = checkPromptSafety(prompt);
  if (!safety.safe) {
    return NextResponse.json({ error: safety.reason }, { status: 403 });
  }

  const { hasCredits, cost: finalCost } = await verifyCredits(user.id, model, cost);
  if (!hasCredits) return insufficientCreditsResponse(finalCost);

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "FAL_KEY nao configurada" }, { status: 500 });
  }

  try {
    let characterIds: string[] | undefined;

    // Sora 2 Characters: create characters from video clips first
    if (model === "sora-2-char") {
      if (!charVideoUrl1) {
        return NextResponse.json({ error: "Video do Character 1 e obrigatorio" }, { status: 400 });
      }

      characterIds = [];
      const name1 = charName1 || "character1";
      console.log("[sora-char] Creating character 1:", name1);
      const char1 = await createSoraCharacter(falKey, charVideoUrl1, name1);
      characterIds.push(char1.id);
      console.log("[sora-char] Character 1 created:", char1.id);

      if (charVideoUrl2) {
        const name2 = charName2 || "character2";
        console.log("[sora-char] Creating character 2:", name2);
        const char2 = await createSoraCharacter(falKey, charVideoUrl2, name2);
        characterIds.push(char2.id);
        console.log("[sora-char] Character 2 created:", char2.id);
      }
    }

    // Determine endpoint: T2V or I2V based on image input
    const endpoint = getSoraEndpoint(!!imageUrl);

    const input = buildSoraInput({
      prompt,
      imageUrl: imageUrl || undefined,
      duration: duration || 4,
      aspectRatio: aspectRatio || "16:9",
      characterIds,
      seed: seed ?? undefined,
    });

    console.log("[sora] model:", model, "endpoint:", endpoint, "input:", JSON.stringify(input));

    const result = await submitFalTask(falKey, endpoint, input);

    await chargeCredits(user.id, model, finalCost);

    return NextResponse.json({
      taskId: result.request_id,
      falEndpoint: endpoint,
      statusUrl: result.status_url || undefined,
      responseUrl: result.response_url || undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[sora] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
