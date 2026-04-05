import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-guard";

export async function GET() {
  try {
    const user = await getAuthUser();
    return NextResponse.json({
      ok: true,
      auth: !!user,
      userId: user?.id || null,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING",
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "MISSING",
      kieKey: process.env.KIE_API_KEY ? "set" : "MISSING",
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}
