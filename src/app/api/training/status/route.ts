import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";
import { getTrainingStatus } from "@/lib/ai/replicate";

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

  // If still training, check Replicate for updates
  if (model.status === "training" && model.training_id) {
    try {
      const status = await getTrainingStatus(model.training_id);

      if (status.status === "succeeded" && status.version) {
        // Update DB
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

  return NextResponse.json(model);
}
