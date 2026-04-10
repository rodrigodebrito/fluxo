import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAuthUser, unauthorizedResponse, insufficientCreditsResponse, verifyCredits, chargeCredits, checkRateLimit, rateLimitResponse } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const rl = checkRateLimit(user.id, "llm");
  if (!rl.allowed) return rateLimitResponse(rl.resetIn);

  const body = await request.json();
  const { prompt, systemPrompt, model, temperature, imageUrls } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt e obrigatorio" }, { status: 400 });
  }

  const { hasCredits, cost } = await verifyCredits(user.id, "llm", body.cost);
  if (!hasCredits) return insufficientCreditsResponse(cost);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key nao configurada" }, { status: 500 });
  }

  try {
    const openai = new OpenAI({ apiKey });

    // Build messages
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    // Build user message content (text + optional images for vision)
    if (imageUrls && imageUrls.length > 0) {
      const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        { type: "text", text: prompt },
        ...imageUrls.map((url: string) => ({
          type: "image_url" as const,
          image_url: { url },
        })),
      ];
      messages.push({ role: "user", content });
    } else {
      messages.push({ role: "user", content: prompt });
    }

    const completion = await openai.chat.completions.create({
      model: model || "gpt-4.1",
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: 4096,
    });

    const text = completion.choices[0]?.message?.content || "";

    await chargeCredits(user.id, "llm", cost, { prompt: (prompt || "").slice(0, 500), status: "pending" });

    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
