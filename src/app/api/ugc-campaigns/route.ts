import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("ugc_campaigns")
    .select("id, name, product_thumbnail, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      productThumbnail: c.product_thumbnail,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }))
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const body = await request.json();
  if (!body.data) return NextResponse.json({ error: "data obrigatorio" }, { status: 400 });

  const { data, error } = await supabase
    .from("ugc_campaigns")
    .insert({
      user_id: user.id,
      name: body.name || "Campanha sem nome",
      product_thumbnail: body.productThumbnail || null,
      data: body.data,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: data.id,
    name: data.name,
    productThumbnail: data.product_thumbnail,
    data: data.data,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
}
