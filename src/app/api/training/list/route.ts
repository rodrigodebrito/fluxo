import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const supabase = await createServiceClient();

  const { data: models, error } = await supabase
    .from("trained_models")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[training/list] error:", error);
    return NextResponse.json({ error: "Erro ao buscar modelos" }, { status: 500 });
  }

  return NextResponse.json({ models: models || [] });
}

export async function DELETE(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // Verify ownership
  const { data: model } = await supabase
    .from("trained_models")
    .select("id, replicate_model_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!model) {
    return NextResponse.json({ error: "Modelo nao encontrado" }, { status: 404 });
  }

  // Delete from Replicate
  if (model.replicate_model_id) {
    const { deleteReplicateModel } = await import("@/lib/ai/replicate");
    await deleteReplicateModel(model.replicate_model_id);
  }

  // Delete from DB
  await supabase.from("trained_models").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
