import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const modelId = request.nextUrl.searchParams.get("model_id");

  try {
    const body = await request.json();
    const status = body.status;
    const version = body.output?.version;
    const weightsUrl = body.output?.weights;
    const error = body.error;

    if (!modelId) {
      return NextResponse.json({ error: "model_id required" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    if (status === "succeeded" && version) {
      await supabase
        .from("trained_models")
        .update({
          status: "ready",
          replicate_version: version,
          weights_url: weightsUrl || null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", modelId);
    } else if (status === "failed" || status === "canceled") {
      await supabase
        .from("trained_models")
        .update({ status: "failed" })
        .eq("id", modelId);

      console.error("[webhook/replicate] training failed:", error);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/replicate] error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
