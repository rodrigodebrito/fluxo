import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  // Fetch all stats in parallel
  const [usersResult, waitlistResult, generationsResult, creditsResult, recentGensResult, waitlistEntriesResult] = await Promise.all([
    // Total users
    serviceClient.from("profiles").select("*", { count: "exact", head: true }),
    // Waitlist count
    serviceClient.from("waitlist").select("*", { count: "exact", head: true }),
    // Total generations
    serviceClient.from("generations").select("*", { count: "exact", head: true }),
    // Total credits spent (sum of positive credit_logs debits)
    serviceClient.from("credit_logs").select("amount").lt("amount", 0),
    // Recent generations (last 20)
    serviceClient
      .from("generations")
      .select("id, model, prompt, result_urls, cost, type, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(20),
    // Waitlist entries
    serviceClient
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  // Calculate total credits spent
  const totalCreditsSpent = creditsResult.data
    ? creditsResult.data.reduce((sum, log) => sum + Math.abs(log.amount), 0)
    : 0;

  // Get user emails for recent generations
  const userIds = [...new Set((recentGensResult.data || []).map((g) => g.user_id))];
  const { data: userProfiles } = await serviceClient
    .from("profiles")
    .select("id, name, email")
    .in("id", userIds);

  const userMap = new Map((userProfiles || []).map((u) => [u.id, u]));

  const recentGenerations = (recentGensResult.data || []).map((g) => ({
    ...g,
    user_name: userMap.get(g.user_id)?.name || userMap.get(g.user_id)?.email || "Desconhecido",
  }));

  // Generations per model
  const modelCounts: Record<string, number> = {};
  if (recentGensResult.data) {
    for (const g of recentGensResult.data) {
      modelCounts[g.model] = (modelCounts[g.model] || 0) + 1;
    }
  }

  return NextResponse.json({
    totalUsers: usersResult.count || 0,
    waitlistCount: waitlistResult.count || 0,
    waitlistRemaining: 50 - (waitlistResult.count || 0),
    totalGenerations: generationsResult.count || 0,
    totalCreditsSpent,
    recentGenerations,
    waitlistEntries: waitlistEntriesResult.data || [],
    modelCounts,
  });
}
