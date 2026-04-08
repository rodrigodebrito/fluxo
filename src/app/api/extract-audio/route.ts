import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { execFile } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

// ffmpeg-static provides the binary path
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath = require("ffmpeg-static") as string;

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

  const { videoUrl, format = "mp3", cost = 1 } = body;

  if (!videoUrl) {
    return NextResponse.json({ error: "videoUrl obrigatorio" }, { status: 400 });
  }

  // Check credits
  const hasCredits = await verifyCredits(user.id, cost);
  if (!hasCredits) return insufficientCreditsResponse(cost);

  try {
    // Download video
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error("Falha ao baixar video");
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    const ts = Date.now();
    const tmpVideo = path.join(tmpdir(), `ea-video-${ts}.mp4`);
    const ext = format === "wav" ? "wav" : "mp3";
    const tmpAudio = path.join(tmpdir(), `ea-audio-${ts}.${ext}`);

    await writeFile(tmpVideo, videoBuffer);

    // Extract audio with ffmpeg
    const codecArgs = format === "wav"
      ? ["-vn", "-acodec", "pcm_s16le", "-ar", "44100"]
      : ["-vn", "-acodec", "libmp3lame", "-q:a", "2"];

    await new Promise<void>((resolve, reject) => {
      execFile(ffmpegPath, ["-i", tmpVideo, ...codecArgs, "-y", tmpAudio], { timeout: 60000 }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Read extracted audio
    const audioBuffer = await readFile(tmpAudio);

    // Cleanup temp files
    await Promise.all([unlink(tmpVideo), unlink(tmpAudio)]).catch(() => {});

    // Upload to Supabase storage
    const supabase = await createClient();
    const fileName = `${user.id}/${ts}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const contentType = format === "wav" ? "audio/wav" : "audio/mpeg";

    const { error: uploadError } = await supabase.storage
      .from("upload")
      .upload(fileName, audioBuffer, { contentType, upsert: false });

    if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from("upload").getPublicUrl(fileName);
    const audioUrl = urlData.publicUrl;

    // Charge credits
    await chargeCredits(user.id, "extract-audio", cost);

    return NextResponse.json({ audioUrl });
  } catch (err) {
    console.error("[extract-audio] error:", err);
    const msg = err instanceof Error ? err.message : "Erro ao extrair audio";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
