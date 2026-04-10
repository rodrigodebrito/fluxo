import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const apiKey = process.env.PIAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "PIAPI_API_KEY nao configurada" }, { status: 500 });
  }

  const taskId = request.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId e obrigatorio" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.piapi.ai/api/v1/task/${taskId}`, {
      headers: { "X-API-Key": apiKey },
    });

    const data = await res.json();

    if (data.code !== 200 || !data.data) {
      return NextResponse.json({
        state: "fail",
        progress: 0,
        resultUrls: [],
        error: data.message || "Erro ao buscar status PiAPI",
      });
    }

    const task = data.data;
    const status = task.status;

    if (status === "completed") {
      const videoUrl = task.output?.video;
      return NextResponse.json({
        state: "success",
        progress: 100,
        resultUrls: videoUrl ? [videoUrl] : [],
        error: null,
      });
    }

    if (status === "failed") {
      const errMsg = task.error?.message || task.logs?.join(", ") || "Geracao falhou";
      return NextResponse.json({
        state: "fail",
        progress: 0,
        resultUrls: [],
        error: errMsg,
      });
    }

    // pending, processing, staged
    return NextResponse.json({
      state: "generating",
      progress: status === "processing" ? 50 : 20,
      resultUrls: [],
      error: null,
    });
  } catch (err) {
    console.error("[status-piapi] error:", err);
    const message = err instanceof Error ? err.message : "Erro ao buscar status";
    return NextResponse.json({
      state: "fail",
      progress: 0,
      resultUrls: [],
      error: message,
    });
  }
}
