import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";
import { getPreferenceClient, CREDIT_PACKS } from "@/lib/mercadopago";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { productId } = await request.json();

  if (!productId) {
    return NextResponse.json({ error: "productId obrigatorio" }, { status: 400 });
  }

  const pack = CREDIT_PACKS.find((p) => p.id === productId);
  if (!pack) return NextResponse.json({ error: "Pacote nao encontrado" }, { status: 400 });

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = process.env.MP_WEBHOOK_URL || `${origin}/api/webhook/mercadopago`;

  try {
    const preference = getPreferenceClient();

    const result = await preference.create({
      body: {
        items: [
          {
            id: productId,
            title: `Fluxo AI - ${pack.credits} Creditos`,
            quantity: 1,
            unit_price: pack.priceValue,
            currency_id: "BRL",
          },
        ],
        payer: {
          email: user.email || undefined,
        },
        metadata: {
          user_id: user.id,
          product_id: productId,
        },
        back_urls: {
          success: `${origin}/dashboard?checkout=success`,
          failure: `${origin}/pricing?checkout=failed`,
          pending: `${origin}/dashboard?checkout=pending`,
        },
        auto_return: "approved",
        notification_url: webhookUrl,
      },
    });

    return NextResponse.json({ url: result.init_point });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar checkout";
    console.error("[checkout] MP error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
