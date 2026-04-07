import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";
import { getPreferenceClient, CREDIT_PACKS } from "@/lib/mercadopago";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { productId, couponId, couponCode } = await request.json();

  if (!productId) {
    return NextResponse.json({ error: "productId obrigatorio" }, { status: 400 });
  }

  const pack = CREDIT_PACKS.find((p) => p.id === productId);
  if (!pack) return NextResponse.json({ error: "Pacote nao encontrado" }, { status: 400 });

  let finalPrice = pack.priceValue;

  // Validar e aplicar cupom se fornecido
  if (couponId && couponCode) {
    const supabase = await createServiceClient();
    const { data: coupon } = await supabase
      .from("coupons")
      .select("*")
      .eq("id", couponId)
      .eq("code", couponCode.toUpperCase().trim())
      .eq("active", true)
      .single();

    if (coupon) {
      // Re-validar: expirado, esgotado, ja usado
      const expired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
      const exhausted = coupon.max_uses && coupon.used_count >= coupon.max_uses;

      const { data: existingUse } = await supabase
        .from("coupon_uses")
        .select("id")
        .eq("coupon_id", coupon.id)
        .eq("user_id", user.id)
        .limit(1);
      const alreadyUsed = existingUse && existingUse.length > 0;

      if (!expired && !exhausted && !alreadyUsed) {
        let discount = 0;
        if (coupon.discount_type === "percent") {
          discount = Math.round((pack.priceValue * coupon.discount_value / 100) * 100) / 100;
        } else {
          discount = Math.min(coupon.discount_value, pack.priceValue);
        }
        finalPrice = Math.max(pack.priceValue - discount, 0.01);
      }
    }
  }

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = process.env.MP_WEBHOOK_URL || `${origin}/api/webhook/mercadopago`;

  try {
    const preference = getPreferenceClient();

    const result = await preference.create({
      body: {
        items: [
          {
            id: productId,
            title: `Fluxo AI - ${pack.credits} Creditos`,
            quantity: 1,
            unit_price: finalPrice,
            currency_id: "BRL",
          },
        ],
        payer: {
          email: user.email || undefined,
        },
        metadata: {
          user_id: user.id,
          product_id: productId,
          coupon_id: couponId || null,
          coupon_code: couponCode || null,
        },
        back_urls: {
          success: `${origin}/dashboard?checkout=success`,
          failure: `${origin}/pricing?checkout=failed`,
          pending: `${origin}/dashboard?checkout=pending`,
        },
        auto_return: "approved",
        notification_url: webhookUrl,
      },
    });

    return NextResponse.json({ url: result.init_point });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar checkout";
    console.error("[checkout] MP error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
