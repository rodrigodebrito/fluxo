import { NextRequest, NextResponse } from "next/server";
import { createSeedanceTask, createByteDanceAsset, getAssetStatus } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";
import { checkPromptSafety } from "@/lib/content-filter";

// Registra imagem na Asset Library e aguarda ficar pronta (Kie AI)
async function registerAndWaitAsset(apiKey: string, url: string, assetType: "Image" | "Video" | "Audio" = "Image"): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await createByteDanceAsset(apiKey, url, assetType);
  const assetId = result.data || result.id;
  if (!assetId) {
    console.warn("[seedance] Asset creation failed for", url, result);
    throw new Error(`Falha ao registrar ${assetType.toLowerCase()} na Asset Library`);
  }
  console.log("[seedance] Asset criado:", assetId, "— aguardando processamento...");

  // Polling: esperar asset ficar Active (max 90s)
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const status = await getAssetStatus(apiKey, assetId);
    console.log("[seedance] Asset status raw:", JSON.stringify(status));

    const st = status.status || status.data?.status || (typeof status.data === 'string' ? status.data : null);

    if (st === "Active" || st === "active") {
      console.log("[seedance] Asset pronto:", assetId);
      return `asset://${assetId}`;
    }
    if (st === "Failed" || st === "failed") {
      throw new Error(status.errorMsg || status.data?.errorMsg || "Asset processing failed");
    }
  }
  throw new Error("Timeout: asset demorou muito para processar");
}

// Upload imagem para PiAPI (converte URL externa → base64 → URL temporaria PiAPI)
async function uploadToPiAPI(apiKey: string, imageUrl: string): Promise<string> {
  console.log("[seedance-piapi] uploading image to PiAPI:", imageUrl.substring(0, 80));

  // Baixar imagem e converter para base64
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Falha ao baixar imagem: ${imgRes.status}`);
  const buffer = await imgRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  // Detectar extensao
  const contentType = imgRes.headers.get("content-type") || "image/png";
  const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg"
    : contentType.includes("webp") ? "webp"
    : contentType.includes("bmp") ? "bmp"
    : "png";

  const res = await fetch("https://upload.theapi.app/api/ephemeral_resource", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_name: `ref_${Date.now()}.${ext}`,
      file_data: `data:${contentType};base64,${base64}`,
    }),
  });

  const data = await res.json();
  console.log("[seedance-piapi] upload response:", JSON.stringify(data));

  if (data.code !== 200 || !data.data?.url) {
    throw new Error(data.message || "Falha ao fazer upload para PiAPI");
  }

  return data.data.url;
}

// --- PiAPI Seedance 2.0 ---
async function createPiAPITask(input: {
  prompt: string;
  mode: string;
  duration: number;
  aspectRatio: string;
  taskType: string;
  imageUrls?: string[];
  videoUrls?: string[];
  audioUrls?: string[];
}) {
  const apiKey = process.env.PIAPI_API_KEY;
  if (!apiKey) throw new Error("PIAPI_API_KEY nao configurada");

  const piInput: Record<string, unknown> = {
    prompt: input.prompt,
    mode: input.mode,
    duration: input.duration,
    aspect_ratio: input.aspectRatio,
  };

  if (input.imageUrls && input.imageUrls.length > 0) piInput.image_urls = input.imageUrls;
  if (input.videoUrls && input.videoUrls.length > 0) piInput.video_urls = input.videoUrls;
  if (input.audioUrls && input.audioUrls.length > 0) piInput.audio_urls = input.audioUrls;

  const body: Record<string, unknown> = {
    model: "seedance",
    task_type: input.taskType,
    input: piInput,
  };

  console.log("[seedance-piapi] creating task:", JSON.stringify(body));

  const res = await fetch("https://api.piapi.ai/api/v1/task", {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  console.log("[seedance-piapi] response:", JSON.stringify(data));

  if (data.code !== 200 || !data.data?.task_id) {
    throw new Error(data.message || data.error?.message || "Erro ao criar task PiAPI");
  }

  return data.data.task_id;
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "generation");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const body = await request.json();
  const sdModel = body.sdModel || "bytedance/seedance-2";

  const costModel = "seedance";
  const { hasCredits, cost } = await verifyCredits(user.id, costModel, body.cost);
  if (!hasCredits) return insufficientCreditsResponse(cost);

  const { prompt, firstFrameUrl, lastFrameUrl, referenceImageUrls, referenceVideoUrl, referenceAudioUrl, resolution, aspectRatio, duration, generateAudio, seed, fixedLens, webSearch } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 });
  }

  const safety = checkPromptSafety(prompt);
  if (!safety.safe) {
    return NextResponse.json({ error: safety.reason }, { status: 403 });
  }

  // --- Seedance 2.0 via PiAPI (alternativo — ativar passando sdModel com "piapi") ---
  if (sdModel.includes("piapi")) {
    try {
      const piApiKey = process.env.PIAPI_API_KEY;
      if (!piApiKey) throw new Error("PIAPI_API_KEY nao configurada");

      // Collect all reference inputs
      const imageUrls: string[] = [];
      const videoUrls: string[] = [];
      const audioUrls: string[] = [];

      if (firstFrameUrl) imageUrls.push(firstFrameUrl);
      if (lastFrameUrl) imageUrls.push(lastFrameUrl);
      if (referenceImageUrls && referenceImageUrls.length > 0) imageUrls.push(...referenceImageUrls);
      if (referenceVideoUrl) videoUrls.push(referenceVideoUrl);
      if (referenceAudioUrl) audioUrls.push(referenceAudioUrl);

      // Try uploading images to PiAPI ephemeral storage (may improve quality)
      // Falls back to original URLs if upload not available on current plan
      const processedImageUrls: string[] = [];
      if (imageUrls.length > 0) {
        for (const url of imageUrls) {
          try {
            const piUrl = await uploadToPiAPI(piApiKey, url);
            processedImageUrls.push(piUrl);
          } catch (uploadErr) {
            console.warn("[seedance-piapi] upload failed, using original URL:", (uploadErr as Error).message);
            processedImageUrls.push(url);
            break; // if one fails (plan issue), skip uploading the rest
          }
        }
        // If we broke early, fill remaining with original URLs
        if (processedImageUrls.length < imageUrls.length) {
          for (let i = processedImageUrls.length; i < imageUrls.length; i++) {
            processedImageUrls.push(imageUrls[i]);
          }
        }
      }

      // Determine mode based on inputs
      const finalImageUrls = processedImageUrls.length > 0 ? processedImageUrls : [];
      let mode = "text_to_video";
      if (finalImageUrls.length > 0 || videoUrls.length > 0 || audioUrls.length > 0) {
        mode = "omni_reference";
      }

      // Auto-inject @image references in prompt (like PiAPI playground does)
      let piPrompt = prompt;
      if (finalImageUrls.length > 0 && !prompt.includes("@image")) {
        const refs = finalImageUrls.map((_, i) => `@image${i + 1}`).join(" ");
        piPrompt = `${refs} ${prompt}`;
      }

      // Use preview versions (accept real faces without blocking)
      const isFast = sdModel.includes("fast");
      const taskType = isFast ? "seedance-2-fast-preview" : "seedance-2-preview";

      const taskId = await createPiAPITask({
        prompt: piPrompt,
        mode,
        duration: duration || 5,
        aspectRatio: aspectRatio || "16:9",
        taskType,
        imageUrls: finalImageUrls.length > 0 ? finalImageUrls : undefined,
        videoUrls: videoUrls.length > 0 ? videoUrls : undefined,
        audioUrls: audioUrls.length > 0 ? audioUrls : undefined,
      });

      await chargeCredits(user.id, costModel, cost, { prompt: (prompt || "").slice(0, 500), status: "pending" });

      // Return with piapi: prefix so status polling knows which provider to use
      return NextResponse.json({ taskId: `piapi:${taskId}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("[seedance-piapi] error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // --- Seedance 2.0 via Kie AI (default) ---
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "KIE API key nao configurada" }, { status: 500 });
  }

  try {
    // Seedance 2.0 accepts direct public URLs (no asset registration needed)
    const result = await createSeedanceTask(apiKey, {
      prompt,
      sdModel,
      firstFrameUrl: firstFrameUrl || undefined,
      lastFrameUrl: lastFrameUrl || undefined,
      referenceImageUrls: referenceImageUrls && referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
      referenceVideoUrls: referenceVideoUrl ? [referenceVideoUrl] : undefined,
      referenceAudioUrls: referenceAudioUrl ? [referenceAudioUrl] : undefined,
      resolution,
      aspectRatio,
      duration,
      generateAudio,
      webSearch,
      seed,
      fixedLens,
    });

    if (result.code !== 200 || !result.data) {
      return NextResponse.json(
        { error: result.msg || "Erro ao criar task Seedance" },
        { status: result.code || 500 }
      );
    }

    await chargeCredits(user.id, costModel, cost, { prompt: (prompt || "").slice(0, 500), status: "pending" });

    return NextResponse.json({ taskId: result.data.taskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
