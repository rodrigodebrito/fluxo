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

    // Sanitize model name for Replicate (lowercase, no spaces)
    const modelSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);

    const uniqueSlug = `${modelSlug}-${Date.now().toString(36)}`;

    // 1. Upload first image as thumbnail to Supabase
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
    } catch {
      // Thumbnail is optional
    }

    // 2. Create ZIP from uploaded files
    // We need to create a zip in memory - use JSZip-like approach
    // Since we can't easily zip in edge, we upload files individually and let Replicate handle it
    // Actually Replicate expects a ZIP, so let's build one manually
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      zip.file(file.name, buffer);
    }
    const zipBuffer = Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));

    // 3. Upload ZIP to Replicate
    const imageZipUrl = await uploadTrainingZip(zipBuffer);

    // 4. Create Replicate model destination
    const replicateModelId = await createReplicateModel(
      uniqueSlug,
      `Modelo treinado: ${name} (trigger: ${triggerWord})`
    );

    // 5. Create DB record
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
      return NextResponse.json(
        { error: "Erro ao salvar modelo" },
        { status: 500 }
      );
    }

    // 6. Start training
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "";
    const webhookUrl = appUrl
      ? `${appUrl.startsWith("http") ? appUrl : `https://${appUrl}`}/api/webhooks/replicate?model_id=${dbRecord.id}`
      : undefined;

    const { trainingId } = await startTraining(
      replicateModelId,
      imageZipUrl,
      triggerWord,
      webhookUrl
    );

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
    console.error("[training/create] error:", err);
    return NextResponse.json(
      { error: "Erro ao iniciar treino. Tente novamente." },
      { status: 500 }
    );
  }
}
