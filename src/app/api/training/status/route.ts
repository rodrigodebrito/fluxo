import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";
import { getTrainingStatus } from "@/lib/ai/replicate";
import { pollFalStatus, getFalResult } from "@/lib/ai/fal";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // Get from DB
  const { data: model } = await supabase
    .from("trained_models")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!model) {
    return NextResponse.json({ error: "Modelo nao encontrado" }, { status: 404 });
  }

  // If still training, check provider for updates
  if (model.status === "training" && model.training_id) {
    // fal.ai Z-Image training
    if (model.training_id.startsWith("fal:")) {
      try {
        const falKey = process.env.FAL_KEY;
        if (!falKey) throw new Error("FAL_KEY nao configurada");

        // Parse training_id: "fal:requestId|endpoint|statusUrl|responseUrl"
        const parts = model.training_id.slice(4).split("|");
        const [requestId, endpoint, statusUrl, responseUrl] = parts;

        const status = await pollFalStatus(falKey, endpoint, requestId, statusUrl || undefined);

        if (status.status === "COMPLETED") {
          // Get result to extract weights URL
          const result = await getFalResult(falKey, endpoint, requestId, responseUrl || undefined);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const weightsUrl = (result as any).diffusers_lora_file?.url || null;

          await supabase
            .from("trained_models")
            .update({
              status: "ready",
              weights_url: weightsUrl,
              completed_at: new Date().toISOString(),
            })
            .eq("id", id);

          return NextResponse.json({
            ...model,
            status: "ready",
            weights_url: weightsUrl,
          });
        }

        // Still processing
        return NextResponse.json({
          ...model,
          falStatus: status.status,
        });
      } catch (err) {
        console.error("[training/status] fal error:", err);
        // Check if it's a permanent failure
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("failed") || msg.includes("FAILED")) {
          await supabase
            .from("trained_models")
            .update({ status: "failed" })
            .eq("id", id);
          return NextResponse.json({ ...model, status: "failed", error: msg });
        }
      }
    } else {
      // Replicate training
      try {
        const status = await getTrainingStatus(model.training_id);

        if (status.status === "succeeded" && status.version) {
          await supabase
            .from("trained_models")
            .update({
              status: "ready",
              replicate_version: status.version,
              weights_url: status.weightsUrl || null,
              completed_at: new Date().toISOString(),
            })
            .eq("id", id);

          return NextResponse.json({
            ...model,
            status: "ready",
            replicate_version: status.version,
            weights_url: status.weightsUrl,
          });
        }

        if (status.status === "failed" || status.status === "canceled") {
          await supabase
            .from("trained_models")
            .update({ status: "failed" })
            .eq("id", id);

          return NextResponse.json({
            ...model,
            status: "failed",
            error: status.error,
          });
        }

        // Still processing
        return NextResponse.json({
          ...model,
          replicateStatus: status.status,
        });
      } catch (err) {
        console.error("[training/status] replicate error:", err);
      }
    }
  }

  return NextResponse.json(model);
}
