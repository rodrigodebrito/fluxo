import { NextRequest, NextResponse } from "next/server";
import { getVeo4kVideo } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";

export const maxDuration = 60;

// Veo 4K upscale: submit step. Retorna o mesmo taskId (reusa o taskId do Veo base).
// O polling e feito via /api/status com model=veo-4k.
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "generation");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalido" }, { status: 400 });
  }

  const { sourceTaskId, index, cost } = body;
  if (!sourceTaskId || typeof sourceTaskId !== "string") {
    return NextResponse.json({ error: "sourceTaskId obrigatorio (taskId do Veo 3.1 original)" }, { status: 400 });
  }

  const { hasCredits, cost: finalCost } = await verifyCredits(user.id, "veo-4k", cost);
  if (!hasCredits) return insufficientCreditsResponse(finalCost);

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "KIE_API_KEY nao configurada" }, { status: 500 });
  }

  try {
    const result = await getVeo4kVideo(apiKey, sourceTaskId, typeof index === "number" ? index : 0);
    console.log("[upscale-veo-4k] submit sourceTaskId=", sourceTaskId, "response=", JSON.stringify(result));

    // Kie retorna 422 "4k is processing" como erro NAO-200 mas significa "aceito, ta processando"
    // Retorna 200 com resultUrls null = aceito, ta processando
    // Retorna erros reais tipo "No generation found" tambem como nao-200
    if (result.code !== 200 && !/processing|5-10 minutes|already/i.test(result.msg || "")) {
      return NextResponse.json({ error: `Kie rejeitou: ${result.msg || "erro desconhecido"} (code ${result.code})` }, { status: 400 });
    }

    await chargeCredits(user.id, "veo-4k", finalCost, { status: "pending", metadata: { sourceTaskId } });

    // Reusa o mesmo taskId pro polling
    return NextResponse.json({ taskId: sourceTaskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[upscale-veo-4k] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
