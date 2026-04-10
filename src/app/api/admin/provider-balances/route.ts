import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

interface ProviderBalance {
  provider: string;
  balance: number | null;
  currency: string;
  error?: string;
  low?: boolean;
}

const LOW_THRESHOLDS: Record<string, number> = {
  "fal.ai": 5,
  "PiAPI": 5,
  "Kie AI": 100,
};

async function fetchFalBalance(): Promise<ProviderBalance> {
  const key = process.env.FAL_KEY;
  if (!key) return { provider: "fal.ai", balance: null, currency: "USD", error: "FAL_KEY nao configurada" };

  try {
    const res = await fetch("https://api.fal.ai/v1/account/billing?expand=credits", {
      headers: { Authorization: `Key ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { provider: "fal.ai", balance: null, currency: "USD", error: `HTTP ${res.status}: ${text.slice(0, 100)}` };
    }
    const data = await res.json();
    const balance = data.credits?.current_balance ?? data.balance ?? null;
    return {
      provider: "fal.ai",
      balance: typeof balance === "number" ? Math.round(balance * 100) / 100 : null,
      currency: "USD",
      low: typeof balance === "number" && balance < LOW_THRESHOLDS["fal.ai"],
    };
  } catch (err) {
    return { provider: "fal.ai", balance: null, currency: "USD", error: (err as Error).message };
  }
}

async function fetchKieBalance(): Promise<ProviderBalance> {
  const key = process.env.KIE_API_KEY;
  if (!key) return { provider: "Kie AI", balance: null, currency: "creditos", error: "KIE_API_KEY nao configurada" };

  try {
    const res = await fetch("https://api.kie.ai/api/v1/chat/credit", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { provider: "Kie AI", balance: null, currency: "creditos", error: `HTTP ${res.status}: ${text.slice(0, 100)}` };
    }
    const data = await res.json();
    const balance = typeof data.data === "number" ? data.data : null;
    return {
      provider: "Kie AI",
      balance,
      currency: "creditos",
      low: typeof balance === "number" && balance < LOW_THRESHOLDS["Kie AI"],
    };
  } catch (err) {
    return { provider: "Kie AI", balance: null, currency: "creditos", error: (err as Error).message };
  }
}

async function fetchPiAPIBalance(): Promise<ProviderBalance> {
  const key = process.env.PIAPI_API_KEY;
  if (!key) return { provider: "PiAPI", balance: null, currency: "USD", error: "PIAPI_API_KEY nao configurada" };

  try {
    const res = await fetch("https://api.piapi.ai/account/info", {
      headers: { "x-api-key": key },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { provider: "PiAPI", balance: null, currency: "USD", error: `HTTP ${res.status}: ${text.slice(0, 100)}` };
    }
    const data = await res.json();
    const balance = data.equivalent_in_usd ?? data.data?.equivalent_in_usd ?? data.credits ?? null;
    return {
      provider: "PiAPI",
      balance: typeof balance === "number" ? Math.round(balance * 100) / 100 : null,
      currency: "USD",
      low: typeof balance === "number" && balance < LOW_THRESHOLDS["PiAPI"],
    };
  } catch (err) {
    return { provider: "PiAPI", balance: null, currency: "USD", error: (err as Error).message };
  }
}

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

  // Fetch all 3 in parallel
  const [fal, kie, piapi] = await Promise.all([
    fetchFalBalance(),
    fetchKieBalance(),
    fetchPiAPIBalance(),
  ]);

  return NextResponse.json({
    providers: [fal, kie, piapi],
    hasLowBalance: [fal, kie, piapi].some((p) => p.low),
  });
}
