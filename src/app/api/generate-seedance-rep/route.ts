import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";
import { checkPromptSafety } from "@/lib/content-filter";

const SEEDANCE_MODEL = "bytedance/seedance-2.0";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "generation");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const body = await request.json();

  const costModel = "seedance-rep";
  const { hasCredits, cost } = await verifyCredits(user.id, costModel, body.cost);
  if (!hasCredits) return insufficientCreditsResponse(cost);

  const { prompt, firstFrameUrl, aspectRatio, duration } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 });
  }

  const safety = checkPromptSafety(prompt);
  if (!safety.safe) {
    return NextResponse.json({ error: safety.reason }, { status: 403 });
  }

  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    return NextResponse.json({ error: "REPLICATE_API_TOKEN nao configurado" }, { status: 500 });
  }

  try {
    // Build input
    const input: Record<string, unknown> = {
      prompt,
      duration: duration || 5,
      aspect_ratio: aspectRatio || "16:9",
    };

    if (firstFrameUrl) {
      input.image = firstFrameUrl;
    }

    console.log("[seedance-rep] creating prediction:", JSON.stringify({ model: SEEDANCE_MODEL, input }));

    // Create prediction via model-specific endpoint (no version needed)
    const res = await fetch(`https://api.replicate.com/v1/models/${SEEDANCE_MODEL}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        Prefer: "respond-async",
      },
      body: JSON.stringify({ input }),
    });

    const data = await res.json();
    console.log("[seedance-rep] prediction response:", JSON.stringify(data).slice(0, 500));

    if (!res.ok || !data.id) {
      throw new Error(data.detail || data.error || "Erro ao criar prediction Replicate");
    }

    await chargeCredits(user.id, costModel, cost, { prompt: (prompt || "").slice(0, 500), status: "pending" });

    // Return with rep: prefix so polling knows which provider to use
    return NextResponse.json({ taskId: `rep:${data.id}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[seedance-rep] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
