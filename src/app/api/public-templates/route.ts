import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// GET: List published templates (any authenticated user)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = await createServiceClient();
  const { data, error } = await service
    .from("workflow_templates")
    .select("id, name, description, category, thumbnail, featured, usage_count, created_at")
    .eq("is_published", true)
    .order("featured", { ascending: false })
    .order("usage_count", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST: Use template — creates a copy as user's workflow
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { templateId } = body;
  if (!templateId) return NextResponse.json({ error: "templateId obrigatorio" }, { status: 400 });

  const service = await createServiceClient();

  // Get template
  const { data: template } = await service
    .from("workflow_templates")
    .select("*")
    .eq("id", templateId)
    .eq("is_published", true)
    .single();

  if (!template) return NextResponse.json({ error: "Template nao encontrado" }, { status: 404 });

  // Create workflow copy for user
  const { data: workflow, error } = await service
    .from("workflows")
    .insert({
      name: template.name,
      data: template.data,
      thumbnail: template.thumbnail,
      user_id: user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Increment usage count
  await service
    .from("workflow_templates")
    .update({ usage_count: (template.usage_count || 0) + 1 })
    .eq("id", templateId);

  return NextResponse.json({ workflowId: workflow.id });
}
