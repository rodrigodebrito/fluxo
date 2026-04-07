import { NextRequest, NextResponse } from "next/server";
import { getPaymentClient, getCreditsForProductId } from "@/lib/mercadopago";
import { addCredits } from "@/lib/credits";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Só processar notificações de pagamento
  if (body.type !== "payment" && body.action !== "payment.updated" && body.action !== "payment.created") {
    return NextResponse.json({ received: true });
  }

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
    const couponId = metadata?.coupon_id;

    if (!userId || !productId) {
      console.error("[mp-webhook] Missing metadata:", { userId, productId });
      return NextResponse.json({ received: true });
    }

    const supabase = await createServiceClient();

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

    // Registrar uso do cupom se aplicavel
    if (couponId) {
      await supabase.from("coupon_uses").insert({
        coupon_id: couponId,
        user_id: userId,
        payment_id: String(paymentId),
      });
      const { data: coupon } = await supabase.from("coupons").select("used_count").eq("id", couponId).single();
      if (coupon) {
        await supabase.from("coupons").update({ used_count: (coupon.used_count || 0) + 1 }).eq("id", couponId);
      }
      console.log(`[mp-webhook] Coupon ${couponId} used by ${userId}`);
    }

    // Verificar primeira compra (bonus +50)
    const { data: priorLogs } = await supabase
      .from("credit_logs")
      .select("id")
      .eq("user_id", userId)
      .like("reason", "mp_payment_%")
      .limit(1);
    const isFirstPurchase = !priorLogs || priorLogs.length === 0;

    await addCredits(userId, info.credits, `mp_payment_${paymentId}`);
    console.log(`[mp-webhook] Added ${info.credits} credits for user ${userId} (payment ${paymentId})`);

    if (isFirstPurchase) {
      await addCredits(userId, 50, "first_purchase_bonus");
      console.log(`[mp-webhook] Added 50 bonus credits (first purchase) for user ${userId}`);
    }
  } catch (err) {
    console.error("[mp-webhook] Error:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ received: true });
}

// MP faz GET pra verificar se o endpoint existe
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
