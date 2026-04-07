import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = await createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

export async function GET() {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createServiceClient();

  const { data: models } = await supabase
    .from("trained_models")
    .select("*")
    .order("created_at", { ascending: false });

  // Enrich with user emails
  const userIds = [...new Set((models || []).map((m) => m.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, name")
    .in("id", userIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const enriched = (models || []).map((m) => ({
    ...m,
    user_email: profileMap.get(m.user_id)?.email || profileMap.get(m.user_id)?.name || m.user_id,
  }));

  return NextResponse.json({ models: enriched });
}

export async function DELETE(request: Request) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const supabase = await createServiceClient();

  // Get model for cleanup
  const { data: model } = await supabase
    .from("trained_models")
    .select("replicate_model_id")
    .eq("id", id)
    .single();

  if (model?.replicate_model_id) {
    const { deleteReplicateModel } = await import("@/lib/ai/replicate");
    await deleteReplicateModel(model.replicate_model_id);
  }

  await supabase.from("trained_models").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
