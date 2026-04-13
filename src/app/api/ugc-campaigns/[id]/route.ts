import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("ugc_campaigns")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Campanha nao encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    productThumbnail: data.product_thumbnail,
    data: data.data,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const body = await request.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) update.name = body.name;
  if (body.data !== undefined) update.data = body.data;
  if (body.productThumbnail !== undefined) update.product_thumbnail = body.productThumbnail;

  const { data, error } = await supabase
    .from("ugc_campaigns")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Campanha nao encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    productThumbnail: data.product_thumbnail,
    data: data.data,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const { error } = await supabase
    .from("ugc_campaigns")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
