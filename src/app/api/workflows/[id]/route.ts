import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: buscar workflow por id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const { data: workflow, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !workflow) {
    return NextResponse.json({ error: "Workflow nao encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: workflow.id,
    name: workflow.name,
    data: JSON.stringify(workflow.data),
    thumbnail: workflow.thumbnail,
    createdAt: workflow.created_at,
    updatedAt: workflow.updated_at,
  });
}

// PUT: atualizar workflow
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const body = await request.json();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.data !== undefined) updateData.data = body.data;
  if (body.thumbnail !== undefined) updateData.thumbnail = body.thumbnail;

  const { data: workflow, error } = await supabase
    .from("workflows")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !workflow) {
    return NextResponse.json({ error: "Workflow nao encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: workflow.id,
    name: workflow.name,
    data: JSON.stringify(workflow.data),
    thumbnail: workflow.thumbnail,
    createdAt: workflow.created_at,
    updatedAt: workflow.updated_at,
  });
}

// DELETE: deletar workflow
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const { error } = await supabase
    .from("workflows")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
