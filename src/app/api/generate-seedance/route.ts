import { NextRequest, NextResponse } from "next/server";
import { createSeedanceTask, createByteDanceAsset, getAssetStatus } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits } from "@/lib/auth-guard";

// Registra imagem na Asset Library e aguarda ficar pronta
async function registerAndWaitAsset(apiKey: string, url: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await createByteDanceAsset(apiKey, url, "Image");
  const assetId = result.data || result.id;
  if (!assetId) {
    console.warn("[seedance] Asset creation failed for", url, result);
    throw new Error("Falha ao registrar imagem na Asset Library");
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

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();

  // Block Seedance 2.0 (still disabled)
  const sdModel = body.sdModel || "bytedance/seedance-2";
  if (sdModel.includes("seedance-2")) {
    return NextResponse.json(
      { error: "Seedance 2.0 esta temporariamente indisponivel." },
      { status: 503 }
    );
  }

  const costModel = "seedance";
  const { hasCredits, cost } = await verifyCredits(user.id, costModel, body.cost);
  if (!hasCredits) return insufficientCreditsResponse(cost);

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key nao configurada" }, { status: 500 });
  }

  const { prompt, firstFrameUrl, lastFrameUrl, referenceImageUrls, resolution, aspectRatio, duration, generateAudio, seed, fixedLens, webSearch } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 });
  }

  try {
    let processedFirstFrame: string | undefined;
    let processedLastFrame: string | undefined;

    if (firstFrameUrl) {
      processedFirstFrame = await registerAndWaitAsset(apiKey, firstFrameUrl);
    }
    if (lastFrameUrl) {
      processedLastFrame = await registerAndWaitAsset(apiKey, lastFrameUrl);
    }

    let processedRefUrls: string[] | undefined;
    if (referenceImageUrls && referenceImageUrls.length > 0) {
      processedRefUrls = [];
      for (const refUrl of referenceImageUrls) {
        const assetUrl = await registerAndWaitAsset(apiKey, refUrl);
        processedRefUrls.push(assetUrl);
      }
    }

    const result = await createSeedanceTask(apiKey, {
      prompt,
      sdModel,
      firstFrameUrl: processedFirstFrame,
      lastFrameUrl: processedLastFrame,
      referenceImageUrls: processedRefUrls,
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

    await chargeCredits(user.id, costModel, cost);

    return NextResponse.json({ taskId: result.data.taskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
