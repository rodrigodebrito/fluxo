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
  const { userId, amount } = body;

  if (!userId || !amount || amount <= 0) {
    return NextResponse.json({ error: "userId e amount (> 0) sao obrigatorios" }, { status: 400 });
  }

  const newCredits = await addCredits(userId, amount, "admin_grant");

  return NextResponse.json({ credits: newCredits });
}
