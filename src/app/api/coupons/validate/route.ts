import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { code, amount } = await request.json();

  if (!code) {
    return NextResponse.json({ error: "Codigo obrigatorio" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // Buscar cupom
  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .eq("active", true)
    .single();

  if (!coupon) {
    return NextResponse.json({ error: "Cupom invalido" }, { status: 400 });
  }

  // Verificar validade
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: "Cupom expirado" }, { status: 400 });
  }

  // Verificar usos máximos
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    return NextResponse.json({ error: "Cupom esgotado" }, { status: 400 });
  }

  // Verificar se usuario já usou este cupom
  const { data: existingUse } = await supabase
    .from("coupon_uses")
    .select("id")
    .eq("coupon_id", coupon.id)
    .eq("user_id", user.id)
    .limit(1);

  if (existingUse && existingUse.length > 0) {
    return NextResponse.json({ error: "Voce ja usou este cupom" }, { status: 400 });
  }

  // Verificar valor mínimo
  if (coupon.min_purchase && amount < coupon.min_purchase) {
    return NextResponse.json({ error: `Compra minima de R$ ${coupon.min_purchase.toFixed(2).replace(".", ",")}` }, { status: 400 });
  }

  // Calcular desconto
  let discount = 0;
  if (coupon.discount_type === "percent") {
    discount = Math.round((amount * coupon.discount_value / 100) * 100) / 100;
  } else {
    discount = Math.min(coupon.discount_value, amount);
  }

  const finalAmount = Math.max(amount - discount, 0.01); // MP exige minimo R$0.01

  return NextResponse.json({
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    discountType: coupon.discount_type,
    discountValue: coupon.discount_value,
    discount,
    finalAmount,
  });
}
