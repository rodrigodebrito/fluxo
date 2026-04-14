import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import crypto from "crypto";

// Verificar assinatura do webhook do Replicate (HMAC-SHA256)
function verifyReplicateSignature(body: string, signature: string | null): boolean {
  const secret = process.env.REPLICATE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[webhook/replicate] REPLICATE_WEBHOOK_SECRET nao configurado — pulando verificacao");
    return true;
  }
  if (!signature) {
    console.error("[webhook/replicate] Header webhook-signature ausente");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const expected = `sha256=${hmac}`;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verificar assinatura se secret configurado
  if (process.env.REPLICATE_WEBHOOK_SECRET) {
    const signature = request.headers.get("webhook-signature");
    if (!verifyReplicateSignature(rawBody, signature)) {
      console.error("[webhook/replicate] Assinatura invalida — rejeitando");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
  }

  const modelId = request.nextUrl.searchParams.get("model_id");

  try {
    const body = JSON.parse(rawBody);
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
