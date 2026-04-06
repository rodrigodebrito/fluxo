import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, contact } = body;

  if (!name || !contact) {
    return NextResponse.json({ error: "Nome e contato sao obrigatorios" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // Verificar se ja atingiu 50 vagas
  const { count } = await supabase
    .from("waitlist")
    .select("*", { count: "exact", head: true });

  if (count !== null && count >= 50) {
    return NextResponse.json({ error: "Lista de espera cheia! Todas as 50 vagas foram preenchidas." }, { status: 409 });
  }

  // Verificar se contato ja existe
  const { data: existing } = await supabase
    .from("waitlist")
    .select("id")
    .eq("contact", contact.trim())
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "Voce ja esta na lista!" }, { status: 409 });
  }

  const { error } = await supabase
    .from("waitlist")
    .insert({
      name: name.trim(),
      contact: contact.trim(),
    });

  if (error) {
    console.error("[waitlist] insert error:", error.message);
    return NextResponse.json({ error: "Erro ao salvar. Tente novamente." }, { status: 500 });
  }

  // Retornar posicao na fila
  const { count: newCount } = await supabase
    .from("waitlist")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    success: true,
    position: newCount || 1,
    remaining: 50 - (newCount || 1),
  });
}

export async function GET() {
  const supabase = await createServiceClient();

  const { count } = await supabase
    .from("waitlist")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    total: count || 0,
    remaining: 50 - (count || 0),
  });
}
