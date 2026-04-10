import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = (page - 1) * limit;

  if (!userId) {
    return NextResponse.json({ error: "userId obrigatorio" }, { status: 400 });
  }

  // Get user info
  const { data: targetUser } = await serviceClient
    .from("profiles")
    .select("id, name, email, credits, plan, created_at")
    .eq("id", userId)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
  }

  // Get total count
  const { count } = await serviceClient
    .from("credit_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  // Get paginated logs
  const { data: logs, error } = await serviceClient
    .from("credit_logs")
    .select("id, amount, reason, model, prompt, status, metadata, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Summary stats
  const { data: statsData } = await serviceClient
    .from("credit_logs")
    .select("amount, model, status")
    .eq("user_id", userId);

  let totalSpent = 0;
  let totalAdded = 0;
  const modelCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};

  for (const log of statsData || []) {
    if (log.amount < 0) totalSpent += Math.abs(log.amount);
    else totalAdded += log.amount;
    if (log.model) modelCounts[log.model] = (modelCounts[log.model] || 0) + 1;
    if (log.status) statusCounts[log.status] = (statusCounts[log.status] || 0) + 1;
  }

  return NextResponse.json({
    user: targetUser,
    logs: logs || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
    stats: { totalSpent, totalAdded, modelCounts, statusCounts },
  });
}
