import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";

// Salvar uma geracao
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { model, prompt, resultUrls, cost, type } = body;

  if (!resultUrls || resultUrls.length === 0) {
    return NextResponse.json({ error: "Sem resultados para salvar" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  const { error } = await supabase.from("generations").insert({
    user_id: user.id,
    model: model || "unknown",
    prompt: (prompt || "").slice(0, 2000),
    result_urls: resultUrls,
    cost: cost || 0,
    type: type || "image",
  });

  if (error) {
    console.error("[generations] insert error:", error.message);
    return NextResponse.json({ error: "Erro ao salvar geracao" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Listar geracoes do usuario
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const supabase = await createServiceClient();

  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;
  const type = request.nextUrl.searchParams.get("type"); // "image", "video", or null for all

  let query = supabase
    .from("generations")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) {
    query = query.eq("type", type);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[generations] list error:", error.message);
    return NextResponse.json({ error: "Erro ao listar geracoes" }, { status: 500 });
  }

  return NextResponse.json({
    generations: data || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
