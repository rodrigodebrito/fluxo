import { NextRequest, NextResponse } from "next/server";
import { getTaskStatus, getVeoTaskStatus, parseResultUrls } from "@/lib/ai/kie";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key nao configurada" }, { status: 500 });
  }

  const taskId = request.nextUrl.searchParams.get("taskId");
  const type = request.nextUrl.searchParams.get("type") || "image";
  const model = request.nextUrl.searchParams.get("model") || "";

  if (!taskId) {
    return NextResponse.json({ error: "taskId é obrigatório" }, { status: 400 });
  }

  // Veo video tasks (only veo3 uses the special veo endpoint)
  if (type === "video" && (model === "veo3" || !model)) {
    try {
      const result = await getVeoTaskStatus(apiKey, taskId);
      console.log("[veo-status]", taskId, JSON.stringify(result));

      // Se data é null, ainda está processando
      if (!result.data) {
        return NextResponse.json({
          state: "generating",
          progress: 30,
          resultUrls: [],
          error: null,
        });
      }

      const { successFlag, response, errorMessage } = result.data;

      let state: string;
      if (successFlag === 1) state = "success";
      else if (successFlag === 2 || successFlag === 3) state = "fail";
      else state = "generating";

      // A API pode retornar em fullResultUrls, resultUrls, ou full_result_urls
      const resultUrls = state === "success" && response
        ? (response.fullResultUrls || response.resultUrls || response.full_result_urls || [])
        : [];

      return NextResponse.json({
        state,
        progress: state === "success" ? 100 : 50,
        resultUrls,
        error: state === "fail" ? (errorMessage || "Geracao de video falhou") : null,
      });
    } catch (err) {
      console.error("[veo-status] error:", err);
      const message = err instanceof Error ? err.message : "Erro ao buscar status";
      return NextResponse.json({
        state: "fail",
        progress: 0,
        resultUrls: [],
        error: message,
      });
    }
  }

  // Generic Kie AI tasks (Nano Banana, Seedance, Kling, Wan, Grok, etc)
  const result = await getTaskStatus(apiKey, taskId);

  if (result.code !== 200 || !result.data) {
    return NextResponse.json(
      { error: result.msg || "Erro ao buscar status" },
      { status: result.code || 500 }
    );
  }

  const { state, resultJson, failMsg, progress } = result.data;
  const resultUrls = state === "success" ? parseResultUrls(resultJson) : [];

  return NextResponse.json({
    state,
    progress,
    resultUrls,
    error: state === "fail" ? failMsg : null,
  });
}
