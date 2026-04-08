import { NextRequest, NextResponse } from "next/server";
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

// GET: List all templates (admin)
export async function GET() {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("workflow_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST: Create template from existing workflow or raw data
export async function POST(request: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, description, category, thumbnail, data, workflowId } = body;

  const supabase = await createServiceClient();

  // If workflowId provided, clone from existing workflow
  let templateData = data;
  if (workflowId && !templateData) {
    const { data: workflow } = await supabase
      .from("workflows")
      .select("data, thumbnail")
      .eq("id", workflowId)
      .single();

    if (!workflow) return NextResponse.json({ error: "Workflow nao encontrado" }, { status: 404 });
    templateData = workflow.data;
  }

  if (!name || !templateData) {
    return NextResponse.json({ error: "Nome e dados sao obrigatorios" }, { status: 400 });
  }

  const { data: template, error } = await supabase
    .from("workflow_templates")
    .insert({
      name,
      description: description || "",
      category: category || "geral",
      thumbnail: thumbnail || null,
      data: templateData,
      is_published: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(template);
}

// DELETE: Remove template
export async function DELETE(request: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("workflow_templates")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH: Update template (publish/unpublish, edit details)
export async function PATCH(request: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { id, name, description, category, thumbnail, is_published, featured } = body;

  if (!id) return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });

  const supabase = await createServiceClient();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (category !== undefined) updates.category = category;
  if (thumbnail !== undefined) updates.thumbnail = thumbnail;
  if (is_published !== undefined) updates.is_published = is_published;
  if (featured !== undefined) updates.featured = featured;

  const { data, error } = await supabase
    .from("workflow_templates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
