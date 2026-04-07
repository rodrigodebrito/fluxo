import { NextRequest, NextResponse } from "next/server";
import { getPaymentClient, getPreApprovalClient, getCreditsForProductId, PLANS } from "@/lib/mercadopago";
import { addCredits } from "@/lib/credits";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createServiceClient();

  // ── Pagamento avulso (pack) ──
  if (body.type === "payment" || body.action === "payment.updated" || body.action === "payment.created") {
    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ received: true });

    try {
      const paymentClient = getPaymentClient();
      const payment = await paymentClient.get({ id: paymentId });

      if (!payment || payment.status !== "approved") {
        console.log(`[mp-webhook] Payment ${paymentId} status: ${payment?.status} (ignoring)`);
        return NextResponse.json({ received: true });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = payment.metadata as any;
      const userId = metadata?.user_id;
      const productId = metadata?.product_id;

      if (!userId || !productId) {
        // Pode ser pagamento de assinatura (sem metadata custom) — tratar abaixo
        // Assinaturas geram pagamentos com external_reference
        const extRef = (payment as { external_reference?: string }).external_reference;
        if (extRef && extRef.includes("|")) {
          return await handleSubscriptionPayment(supabase, payment, paymentId);
        }
        console.log(`[mp-webhook] Payment ${paymentId} without metadata (ignoring)`);
        return NextResponse.json({ received: true });
      }

      // Idempotência: verificar se já processou
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

      // Verificar primeira compra
      const { data: priorLogs } = await supabase
        .from("credit_logs")
        .select("id")
        .eq("user_id", userId)
        .like("reason", "mp_payment_%")
        .limit(1);
      const isFirstPurchase = !priorLogs || priorLogs.length === 0;

      await addCredits(userId, info.credits, `mp_payment_${paymentId}`);
      console.log(`[mp-webhook] Added ${info.credits} credits for user ${userId} (pack payment ${paymentId})`);

      if (isFirstPurchase) {
        await addCredits(userId, 50, "first_purchase_bonus");
        console.log(`[mp-webhook] Added 50 bonus credits (first purchase) for user ${userId}`);
      }
    } catch (err) {
      console.error("[mp-webhook] Payment error:", err instanceof Error ? err.message : err);
    }

    return NextResponse.json({ received: true });
  }

  // ── Assinatura (subscription_preapproval) ──
  if (body.type === "subscription_preapproval" || body.action?.startsWith("updated") || body.action?.startsWith("created")) {
    const preapprovalId = body.data?.id;
    if (!preapprovalId) return NextResponse.json({ received: true });

    try {
      const preApprovalClient = getPreApprovalClient();
      const sub = await preApprovalClient.get({ id: preapprovalId });

      if (!sub) return NextResponse.json({ received: true });

      const extRef = sub.external_reference || "";
      const [userId, planId] = extRef.split("|");
      if (!userId || !planId) {
        console.log(`[mp-webhook] Subscription ${preapprovalId} missing external_reference`);
        return NextResponse.json({ received: true });
      }

      // Atualizar status do plano
      if (sub.status === "authorized") {
        await supabase
          .from("profiles")
          .update({ plan: planId, stripe_subscription_id: preapprovalId })
          .eq("id", userId);
        console.log(`[mp-webhook] Subscription ${preapprovalId} authorized for user ${userId}, plan ${planId}`);
      } else if (sub.status === "cancelled" || sub.status === "paused") {
        await supabase
          .from("profiles")
          .update({ plan: "free", stripe_subscription_id: null })
          .eq("id", userId);
        console.log(`[mp-webhook] Subscription ${preapprovalId} ${sub.status} for user ${userId}`);
      }
    } catch (err) {
      console.error("[mp-webhook] Subscription error:", err instanceof Error ? err.message : err);
    }

    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}

// Processar pagamento recorrente de assinatura (créditos mensais)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionPayment(supabase: any, payment: any, paymentId: string | number) {
  const extRef = payment.external_reference || "";
  const [userId, planId] = extRef.split("|");
  if (!userId || !planId) return NextResponse.json({ received: true });

  // Idempotência
  const { data: existingLog } = await supabase
    .from("credit_logs")
    .select("id")
    .eq("reason", `mp_subscription_${paymentId}`)
    .limit(1);

  if (existingLog && existingLog.length > 0) {
    console.log(`[mp-webhook] Subscription payment ${paymentId} already processed`);
    return NextResponse.json({ received: true });
  }

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) {
    console.error("[mp-webhook] Unknown plan:", planId);
    return NextResponse.json({ received: true });
  }

  // Verificar primeira compra (bonus)
  const { data: priorLogs } = await supabase
    .from("credit_logs")
    .select("id")
    .eq("user_id", userId)
    .or("reason.like.mp_payment_%,reason.like.mp_subscription_%")
    .limit(1);
  const isFirstPurchase = !priorLogs || priorLogs.length === 0;

  await addCredits(userId, plan.credits, `mp_subscription_${paymentId}`);
  console.log(`[mp-webhook] Added ${plan.credits} credits for user ${userId} (subscription ${planId}, payment ${paymentId})`);

  // Atualizar plano
  await supabase
    .from("profiles")
    .update({ plan: planId })
    .eq("id", userId);

  if (isFirstPurchase) {
    await addCredits(userId, 50, "first_purchase_bonus");
    console.log(`[mp-webhook] Added 50 bonus credits (first purchase) for user ${userId}`);
  }

  return NextResponse.json({ received: true });
}

// MP faz GET pra verificar se o endpoint existe
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
