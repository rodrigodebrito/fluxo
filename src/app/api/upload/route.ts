import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";

// Aumentar timeout pra uploads grandes (multiplas 4K)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const rl = checkRateLimit(user.id, "upload");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  // Whitelist de tipos permitidos (imagem, video, audio)
  const ALLOWED_TYPES = [
    "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/bmp", "image/svg+xml",
    "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm", "audio/aac",
  ];
  const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg", "mp4", "webm", "mov", "avi", "mp3", "wav", "ogg", "aac"];

  for (const file of files) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Tipo de arquivo nao permitido: ${file.name} (${file.type})` },
        { status: 400 }
      );
    }
  }

  const urls: string[] = [];

  for (const file of files) {
    try {
      // Generate unique filename
      const ext = file.name.split(".").pop() || "png";
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("upload")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("[upload] supabase error:", uploadError.message);
        // Fallback to catbox.moe
        const catboxUrl = await uploadToCatbox(file);
        if (catboxUrl) urls.push(catboxUrl);
        continue;
      }

      const { data: publicUrl } = supabase.storage
        .from("upload")
        .getPublicUrl(fileName);

      urls.push(publicUrl.publicUrl);
    } catch (err) {
      console.error("[upload] failed for file:", file.name, err);
      // Fallback to catbox.moe
      const catboxUrl = await uploadToCatbox(file);
      if (catboxUrl) urls.push(catboxUrl);
    }
  }

  if (urls.length === 0) {
    return NextResponse.json(
      { error: "Falha ao fazer upload dos arquivos" },
      { status: 500 }
    );
  }

  return NextResponse.json({ urls });
}

// Fallback: upload to catbox.moe
async function uploadToCatbox(file: File): Promise<string | null> {
  try {
    const catboxForm = new FormData();
    catboxForm.append("reqtype", "fileupload");
    catboxForm.append("fileToUpload", file);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: catboxForm,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const url = await response.text();
    if (url.trim().startsWith("https://")) return url.trim();
    return null;
  } catch {
    return null;
  }
}
