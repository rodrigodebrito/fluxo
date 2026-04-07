import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import {
  getAuthUser,
  unauthorizedResponse,
  insufficientCreditsResponse,
  verifyCredits,
  chargeCredits,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/auth-guard";
import { checkPromptSafety } from "@/lib/content-filter";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
  useFileOutput: false,
});

// Wan 2.1 I2V models on Replicate (WaveSpeed optimized)
const WAN_480P = "wavespeedai/wan-2.1-i2v-480p";
const WAN_720P = "wavespeedai/wan-2.1-i2v-720p";

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

  const { prompt, imageUrl, resolution, numFrames, aspectRatio, cost } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 });
  }

  const safety = checkPromptSafety(prompt);
  if (!safety.safe) {
    return NextResponse.json({ error: safety.reason }, { status: 403 });
  }

  if (!imageUrl) {
    return NextResponse.json({ error: "Imagem e obrigatoria para Wan 2.1 I2V" }, { status: 400 });
  }

  const finalCost = cost || 15;
  const { hasCredits } = await verifyCredits(user.id, "wan-i2v", finalCost);
  if (!hasCredits) return insufficientCreditsResponse(finalCost);

  try {
    const model = resolution === "480p" ? WAN_480P : WAN_720P;

    const input: Record<string, unknown> = {
      image: imageUrl,
      prompt,
      num_frames: numFrames || 81,
      fps: 16,
      guide_scale: 5,
      sample_steps: 30,
      sample_shift: 5,
    };

    // Only pass aspect_ratio for 720p (480p uses fixed 832x480)
    if (resolution !== "480p" && aspectRatio) {
      input.aspect_ratio = aspectRatio;
    }

    console.log("[generate-wan] model:", model, "input:", JSON.stringify(input));

    const output = await replicate.run(model as `${string}/${string}`, { input });

    console.log("[generate-wan] raw output:", JSON.stringify(output));

    // Parse output - can be string URL or FileOutput object
    let videoUrl: string | null = null;
    if (typeof output === "string") {
      videoUrl = output;
    } else if (output && typeof output === "object") {
      if ("url" in output) {
        videoUrl = (output as { url: string }).url;
      } else if (typeof (output as { toString: () => string }).toString === "function") {
        const str = String(output);
        if (str.startsWith("http")) videoUrl = str;
      }
    }

    if (!videoUrl) {
      return NextResponse.json({ error: "Nenhum video gerado" }, { status: 500 });
    }

    // Charge credits
    await chargeCredits(user.id, "wan-i2v", finalCost);

    return NextResponse.json({
      success: true,
      urls: [videoUrl],
    });
  } catch (err) {
    console.error("[generate-wan] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Erro ao gerar video: ${msg}` },
      { status: 500 }
    );
  }
}
