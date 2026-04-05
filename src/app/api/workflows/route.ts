import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: listar workflows do usuario logado
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const { data: workflows, error } = await supabase
    .from("workflows")
    .select("id, name, thumbnail, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map snake_case to camelCase for frontend compatibility
  const mapped = (workflows || []).map((w) => ({
    id: w.id,
    name: w.name,
    thumbnail: w.thumbnail,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  }));

  return NextResponse.json(mapped);
}

// POST: criar novo workflow
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const body = await request.json();

  const { data: workflow, error } = await supabase
    .from("workflows")
    .insert({
      name: body.name || "untitled",
      data: body.data || { nodes: [], edges: [] },
      thumbnail: body.thumbnail || null,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: workflow.id,
    name: workflow.name,
    data: workflow.data,
    thumbnail: workflow.thumbnail,
    createdAt: workflow.created_at,
    updatedAt: workflow.updated_at,
  });
}
