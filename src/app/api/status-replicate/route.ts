import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    return NextResponse.json({ error: "REPLICATE_API_TOKEN nao configurado" }, { status: 500 });
  }

  const predictionId = request.nextUrl.searchParams.get("taskId");
  if (!predictionId) {
    return NextResponse.json({ error: "taskId obrigatorio" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({
        state: "fail",
        progress: 0,
        resultUrls: [],
        error: `Replicate API error: ${res.status} ${text.slice(0, 200)}`,
      });
    }

    const data = await res.json();
    console.log("[status-replicate]", predictionId, "status:", data.status);

    // Replicate statuses: starting, processing, succeeded, failed, canceled
    if (data.status === "succeeded") {
      // Output can be a string URL or array of URLs
      let resultUrls: string[] = [];
      if (typeof data.output === "string") {
        resultUrls = [data.output];
      } else if (Array.isArray(data.output)) {
        resultUrls = data.output.filter((u: unknown) => typeof u === "string");
      }

      return NextResponse.json({
        state: "success",
        progress: 100,
        resultUrls,
        error: null,
      });
    }

    if (data.status === "failed") {
      return NextResponse.json({
        state: "fail",
        progress: 0,
        resultUrls: [],
        error: data.error || "Geracao falhou no Replicate",
      });
    }

    if (data.status === "canceled") {
      return NextResponse.json({
        state: "fail",
        progress: 0,
        resultUrls: [],
        error: "Cancelado",
      });
    }

    // starting / processing
    return NextResponse.json({
      state: "generating",
      progress: data.status === "processing" ? 50 : 20,
      resultUrls: [],
      error: null,
    });
  } catch (err) {
    console.error("[status-replicate] error:", err);
    const message = err instanceof Error ? err.message : "Erro ao buscar status";
    return NextResponse.json({
      state: "fail",
      progress: 0,
      resultUrls: [],
      error: message,
    });
  }
}
