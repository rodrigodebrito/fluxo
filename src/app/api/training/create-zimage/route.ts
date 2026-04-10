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
import { submitFalTask } from "@/lib/ai/fal";

const TRAINING_COST = 34; // ~$1.70 = 34 creditos (2000 steps default)
const FAL_TRAINER_ENDPOINT = "fal-ai/z-image-turbo-trainer-v2";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "generation");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const { hasCredits } = await verifyCredits(user.id, "custom-model", TRAINING_COST);
  if (!hasCredits) return insufficientCreditsResponse(TRAINING_COST);

  let stepInfo = "parsing formdata";
  try {
    const formData = await request.formData();
    const name = (formData.get("name") as string)?.trim();
    const triggerWord = (formData.get("trigger_word") as string)?.trim();
    const steps = parseInt((formData.get("steps") as string) || "2000");
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

    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return NextResponse.json(
        { error: "FAL_KEY nao configurada no servidor" },
        { status: 500 }
      );
    }

    // 1. Upload first image as thumbnail to Supabase
    stepInfo = "uploading thumbnail";
    const supabase = await createClient();
    let thumbnailUrl = "";
    const uniqueSlug = `zimage-${name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30)}-${Date.now().toString(36)}`;
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
      console.warn("[training/create-zimage] thumbnail upload failed:", thumbErr);
    }

    // 2. Create ZIP with images + captions (using trigger word as default caption)
    stepInfo = "creating zip";
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = await file.arrayBuffer();
      const ext = file.name.split(".").pop() || "jpg";
      const baseName = String(i + 1).padStart(3, "0");
      zip.file(`${baseName}.${ext}`, buffer);
      // Caption with trigger word for each image
      zip.file(`${baseName}.txt`, `a photo of ${triggerWord}`);
    }
    const zipArrayBuffer = await zip.generateAsync({ type: "arraybuffer" });
    const zipBuffer = Buffer.from(zipArrayBuffer);
    console.log(`[training/create-zimage] zip created: ${zipBuffer.length} bytes, ${files.length} files`);

    // 3. Upload ZIP to Supabase Storage (fal.ai needs a public URL)
    stepInfo = "uploading zip";
    const zipPath = `${user.id}/training/${uniqueSlug}.zip`;
    const { error: uploadError } = await supabase.storage.from("upload").upload(zipPath, zipBuffer, {
      contentType: "application/zip",
      upsert: true,
    });
    if (uploadError) {
      throw new Error(`Erro ao subir ZIP: ${uploadError.message}`);
    }
    const { data: zipPubUrl } = supabase.storage.from("upload").getPublicUrl(zipPath);
    const imageDataUrl = zipPubUrl.publicUrl;
    console.log(`[training/create-zimage] zip uploaded: ${imageDataUrl}`);

    // 4. Create DB record
    stepInfo = "saving to database";
    const serviceClient = await createServiceClient();
    const { data: dbRecord, error: dbError } = await serviceClient
      .from("trained_models")
      .insert({
        user_id: user.id,
        name,
        trigger_word: triggerWord,
        provider: "fal-zimage",
        status: "training",
        thumbnail_url: thumbnailUrl,
      })
      .select("id")
      .single();

    if (dbError || !dbRecord) {
      console.error("[training/create-zimage] db error:", dbError);
      return NextResponse.json(
        { error: `Erro ao salvar modelo: ${dbError?.message || "unknown"}` },
        { status: 500 }
      );
    }

    // 5. Submit training to fal.ai queue
    stepInfo = "starting training";
    const result = await submitFalTask(falKey, FAL_TRAINER_ENDPOINT, {
      image_data_url: imageDataUrl,
      steps,
      default_caption: `a photo of ${triggerWord}`,
      learning_rate: 0.0005,
    });
    console.log(`[training/create-zimage] training submitted: ${result.request_id}`);

    // 6. Update DB with training ID (fal request_id) and status/response URLs
    const trainingId = `fal:${result.request_id}|${FAL_TRAINER_ENDPOINT}|${result.status_url || ""}|${result.response_url || ""}`;
    await serviceClient
      .from("trained_models")
      .update({ training_id: trainingId })
      .eq("id", dbRecord.id);

    // 7. Charge credits
    await chargeCredits(user.id, "custom-model", TRAINING_COST);

    return NextResponse.json({
      id: dbRecord.id,
      trainingId: result.request_id,
      status: "training",
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[training/create-zimage] error at step "${stepInfo}":`, errorMessage, err);
    return NextResponse.json(
      { error: `Erro no treino (${stepInfo}): ${errorMessage}` },
      { status: 500 }
    );
  }
}
