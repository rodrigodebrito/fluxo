import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";
import { getPreferenceClient, getPreApprovalClient, PLANS, CREDIT_PACKS } from "@/lib/mercadopago";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { productId, mode } = await request.json();

  if (!productId) {
    return NextResponse.json({ error: "productId obrigatorio" }, { status: 400 });
  }

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    // ── Assinatura recorrente (cartão) via PreApproval ──
    if (mode === "subscription") {
      const plan = PLANS.find((p) => p.id === productId);
      if (!plan) return NextResponse.json({ error: "Plano nao encontrado" }, { status: 400 });

      const preApproval = getPreApprovalClient();

      const result = await preApproval.create({
        body: {
          reason: `Fluxo AI - Plano ${plan.name}`,
          external_reference: `${user.id}|${plan.id}`,
          payer_email: user.email || undefined,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: plan.priceValue,
            currency_id: "BRL",
          },
          back_url: `${origin}/dashboard?checkout=success`,
        },
      });

      return NextResponse.json({ url: result.init_point });
    }

    // ── Pacote avulso (PIX + cartão) via Preference ──
    const pack = CREDIT_PACKS.find((p) => p.id === productId);
    if (!pack) return NextResponse.json({ error: "Pacote nao encontrado" }, { status: 400 });

    const preference = getPreferenceClient();
    const webhookUrl = process.env.MP_WEBHOOK_URL || `${origin}/api/webhook/mercadopago`;

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
          product_type: `pack_${pack.id}`,
          mode: "payment",
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
