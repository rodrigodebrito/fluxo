import { NextRequest, NextResponse } from "next/server";
import { pollFalStatus, getFalResult } from "@/lib/ai/fal";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");
  const falEndpoint = searchParams.get("falEndpoint");

  if (!taskId || !falEndpoint) {
    return NextResponse.json({ error: "taskId e falEndpoint sao obrigatorios" }, { status: 400 });
  }

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "FAL_KEY nao configurada" }, { status: 500 });
  }

  try {
    const status = await pollFalStatus(falKey, falEndpoint, taskId);

    if (status.status === "COMPLETED") {
      // Fetch actual result
      const result = await getFalResult(falKey, falEndpoint, taskId);
      return NextResponse.json({
        state: "success",
        resultUrls: result.video?.url ? [result.video.url] : [],
        progress: 100,
      });
    }

    if (status.status === "IN_PROGRESS") {
      return NextResponse.json({
        state: "generating",
        resultUrls: [],
        progress: 50,
      });
    }

    // IN_QUEUE
    return NextResponse.json({
      state: "generating",
      resultUrls: [],
      progress: 10,
      queuePosition: status.queue_position,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[status-fal] error:", message);
    return NextResponse.json({
      state: "fail",
      resultUrls: [],
      progress: 0,
      error: message,
    });
  }
}
