import { NextRequest, NextResponse } from "next/server";
import { getPaymentClient, getCreditsForProductId } from "@/lib/mercadopago";
import { addCredits } from "@/lib/credits";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // MP envia diferentes tipos de notificação
  // Queremos apenas "payment" (não "merchant_order", "plan", etc.)
  if (body.type !== "payment" && body.action !== "payment.updated") {
    return NextResponse.json({ received: true });
  }

  const paymentId = body.data?.id;
  if (!paymentId) {
    return NextResponse.json({ received: true });
  }

  try {
    // Buscar detalhes do pagamento na API do MP
    const paymentClient = getPaymentClient();
    const payment = await paymentClient.get({ id: paymentId });

    if (!payment) {
      console.error("[mp-webhook] Payment not found:", paymentId);
      return NextResponse.json({ received: true });
    }

    // Só processar pagamentos aprovados
    if (payment.status !== "approved") {
      console.log(`[mp-webhook] Payment ${paymentId} status: ${payment.status} (ignoring)`);
      return NextResponse.json({ received: true });
    }

    // Extrair metadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = payment.metadata as any;
    const userId = metadata?.user_id;
    const productId = metadata?.product_id;
    const mode = metadata?.mode;

    if (!userId || !productId) {
      console.error("[mp-webhook] Missing metadata:", { userId, productId });
      return NextResponse.json({ received: true });
    }

    const supabase = await createServiceClient();

    // Verificar se este pagamento já foi processado (idempotência)
    const { data: existingLog } = await supabase
      .from("credit_logs")
      .select("id")
      .eq("reason", `mp_payment_${paymentId}`)
      .limit(1);

    if (existingLog && existingLog.length > 0) {
      console.log(`[mp-webhook] Payment ${paymentId} already processed`);
      return NextResponse.json({ received: true });
    }

    const info = getCreditsForProductId(productId);
    if (!info) {
      console.error("[mp-webhook] Unknown product:", productId);
      return NextResponse.json({ received: true });
    }

    // Verificar se é primeira compra (bonus +50)
    const { data: priorLogs } = await supabase
      .from("credit_logs")
      .select("id")
      .eq("user_id", userId)
      .like("reason", "mp_payment_%")
      .limit(1);
    const isFirstPurchase = !priorLogs || priorLogs.length === 0;

    // Adicionar créditos
    await addCredits(userId, info.credits, `mp_payment_${paymentId}`);
    console.log(`[mp-webhook] Added ${info.credits} credits for user ${userId} (payment ${paymentId})`);

    // Se assinatura, atualizar o plano do usuario
    if (mode === "subscription" && info.planId) {
      await supabase
        .from("profiles")
        .update({ plan: info.planId })
        .eq("id", userId);
      console.log(`[mp-webhook] Updated plan to ${info.planId} for user ${userId}`);
    }

    // Bonus primeira compra
    if (isFirstPurchase) {
      await addCredits(userId, 50, "first_purchase_bonus");
      console.log(`[mp-webhook] Added 50 bonus credits (first purchase) for user ${userId}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook error";
    console.error("[mp-webhook] Error:", message);
    // Retornar 200 mesmo em erro pra MP não ficar reenviando
    return NextResponse.json({ received: true });
  }
}

// MP faz GET pra verificar se o endpoint existe
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
