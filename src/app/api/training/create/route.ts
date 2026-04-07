import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  getAuthUser,
  unauthorizedResponse,
  insufficientCreditsResponse,
  checkRateLimit,
  rateLimitResponse,
  verifyCredits,
  chargeCredits,
} from "@/lib/auth-guard";
import {
  createReplicateModel,
  uploadTrainingZip,
  startTraining,
} from "@/lib/ai/replicate";

const TRAINING_COST = 50;

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "generation");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  // Check credits
  const { hasCredits } = await verifyCredits(user.id, "custom-model", TRAINING_COST);
  if (!hasCredits) return insufficientCreditsResponse(TRAINING_COST);

  let stepInfo = "parsing formdata";
  try {
    const formData = await request.formData();
    const name = (formData.get("name") as string)?.trim();
    const triggerWord = (formData.get("trigger_word") as string)?.trim();
    const files = formData.getAll("images") as File[];

    if (!name || !triggerWord) {
      return NextResponse.json(
        { error: "Nome e trigger word sao obrigatorios" },
        { status: 400 }
      );
    }

    if (files.length < 5) {
      return NextResponse.json(
        { error: "Envie pelo menos 5 fotos para o treino" },
        { status: 400 }
      );
    }

    if (files.length > 30) {
      return NextResponse.json(
        { error: "Maximo de 30 fotos por treino" },
        { status: 400 }
      );
    }

    // Check env vars
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN nao configurado no servidor" },
        { status: 500 }
      );
    }

    // Sanitize model name for Replicate (lowercase, no spaces, must start with letter)
    let modelSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);

    // Replicate requires model name to start with a letter
    if (!/^[a-z]/.test(modelSlug)) {
      modelSlug = "m-" + modelSlug;
    }

    const uniqueSlug = `${modelSlug}-${Date.now().toString(36)}`;

    // 1. Upload first image as thumbnail to Supabase
    stepInfo = "uploading thumbnail";
    const supabase = await createClient();
    let thumbnailUrl = "";
    try {
      const thumbFile = files[0];
      const ext = thumbFile.name.split(".").pop() || "png";
      const thumbPath = `${user.id}/models/${uniqueSlug}-thumb.${ext}`;
      await supabase.storage.from("upload").upload(thumbPath, thumbFile, {
        contentType: thumbFile.type,
        upsert: true,
      });
      const { data: pubUrl } = supabase.storage.from("upload").getPublicUrl(thumbPath);
      thumbnailUrl = pubUrl.publicUrl;
    } catch (thumbErr) {
      console.warn("[training/create] thumbnail upload failed:", thumbErr);
    }

    // 2. Create ZIP from uploaded files
    stepInfo = "creating zip";
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      zip.file(file.name, buffer);
    }
    const zipArrayBuffer = await zip.generateAsync({ type: "arraybuffer" });
    const zipBuffer = Buffer.from(zipArrayBuffer);
    console.log(`[training/create] zip created: ${zipBuffer.length} bytes, ${files.length} files`);

    // 3. Upload ZIP to Replicate
    stepInfo = "uploading zip to replicate";
    const imageZipUrl = await uploadTrainingZip(zipBuffer);
    console.log(`[training/create] zip uploaded: ${imageZipUrl}`);

    // 4. Create Replicate model destination
    stepInfo = "creating replicate model";
    const replicateModelId = await createReplicateModel(
      uniqueSlug,
      `Modelo treinado: ${name} (trigger: ${triggerWord})`
    );
    console.log(`[training/create] model created: ${replicateModelId}`);

    // 5. Create DB record
    stepInfo = "saving to database";
    const serviceClient = await createServiceClient();
    const { data: dbRecord, error: dbError } = await serviceClient
      .from("trained_models")
      .insert({
        user_id: user.id,
        name,
        trigger_word: triggerWord,
        replicate_model_id: replicateModelId,
        status: "training",
        thumbnail_url: thumbnailUrl,
      })
      .select("id")
      .single();

    if (dbError || !dbRecord) {
      console.error("[training/create] db error:", dbError);
      return NextResponse.json(
        { error: `Erro ao salvar modelo: ${dbError?.message || "unknown"}` },
        { status: 500 }
      );
    }

    // 6. Start training
    stepInfo = "starting training";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const webhookUrl = appUrl
      ? `${appUrl.startsWith("http") ? appUrl : `https://${appUrl}`}/api/webhooks/replicate?model_id=${dbRecord.id}`
      : undefined;

    const { trainingId } = await startTraining(
      replicateModelId,
      imageZipUrl,
      triggerWord,
      webhookUrl
    );
    console.log(`[training/create] training started: ${trainingId}`);

    // 7. Update DB with training ID
    await serviceClient
      .from("trained_models")
      .update({ training_id: trainingId })
      .eq("id", dbRecord.id);

    // 8. Charge credits
    await chargeCredits(user.id, "custom-model", TRAINING_COST);

    return NextResponse.json({
      id: dbRecord.id,
      trainingId,
      status: "training",
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[training/create] error at step "${stepInfo}":`, errorMessage, err);
    return NextResponse.json(
      { error: `Erro no treino (${stepInfo}): ${errorMessage}` },
      { status: 500 }
    );
  }
}
