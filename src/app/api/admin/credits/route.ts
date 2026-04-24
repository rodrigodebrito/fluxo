import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { addCredits } from "@/lib/credits";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  // Check admin role
  const serviceClient = await createServiceClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, amount, action } = body;

  if (!userId || !amount || amount <= 0) {
    return NextResponse.json({ error: "userId e amount (> 0) sao obrigatorios" }, { status: 400 });
  }

  if (action === "remove") {
    // Remover creditos (admin) — debita diretamente, mesmo que fique 0
    const { data: userProfile } = await serviceClient
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();

    const current = userProfile?.credits || 0;
    const toRemove = Math.min(amount, current); // Nao deixa ficar negativo
    const newCredits = current - toRemove;

    await serviceClient
      .from("profiles")
      .update({ credits: newCredits })
      .eq("id", userId);

    // Log da remocao
    await serviceClient.from("credit_logs").insert({
      user_id: userId,
      amount: -toRemove,
      reason: "admin_remove",
      model: null,
      status: "admin_remove",
      metadata: { admin_id: user.id, requested: amount, removed: toRemove },
    });

    return NextResponse.json({ credits: newCredits, removed: toRemove });
  }

  // Default: adicionar creditos
  const newCredits = await addCredits(userId, amount, "admin_grant");

  return NextResponse.json({ credits: newCredits });
}
