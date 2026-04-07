import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceClient = await createServiceClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return serviceClient;
}

// Listar cupons
export async function GET() {
  const supabase = await checkAdmin();
  if (!supabase) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { data: coupons, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(coupons);
}

// Criar cupom
export async function POST(request: NextRequest) {
  const supabase = await checkAdmin();
  if (!supabase) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const { code, discountType, discountValue, maxUses, minPurchase, expiresAt } = body;

  if (!code || !discountType || !discountValue) {
    return NextResponse.json({ error: "code, discountType e discountValue sao obrigatorios" }, { status: 400 });
  }

  if (!["percent", "fixed"].includes(discountType)) {
    return NextResponse.json({ error: "discountType deve ser 'percent' ou 'fixed'" }, { status: 400 });
  }

  if (discountType === "percent" && (discountValue < 1 || discountValue > 100)) {
    return NextResponse.json({ error: "Percentual deve ser entre 1 e 100" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("coupons")
    .insert({
      code: code.toUpperCase().trim(),
      discount_type: discountType,
      discount_value: discountValue,
      max_uses: maxUses || null,
      min_purchase: minPurchase || 0,
      expires_at: expiresAt || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ja existe um cupom com este codigo" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Atualizar cupom (toggle active)
export async function PATCH(request: NextRequest) {
  const supabase = await checkAdmin();
  if (!supabase) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id, active } = await request.json();

  if (!id || typeof active !== "boolean") {
    return NextResponse.json({ error: "id e active sao obrigatorios" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("coupons")
    .update({ active })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Deletar cupom
export async function DELETE(request: NextRequest) {
  const supabase = await checkAdmin();
  if (!supabase) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });

  // Deletar usos primeiro (FK)
  await supabase.from("coupon_uses").delete().eq("coupon_id", id);
  const { error } = await supabase.from("coupons").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
