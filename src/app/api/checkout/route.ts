import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";
import { getPreferenceClient, PLANS, CREDIT_PACKS } from "@/lib/mercadopago";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { productId, mode } = await request.json();

  if (!productId) {
    return NextResponse.json({ error: "productId obrigatorio" }, { status: 400 });
  }

  // Resolver produto
  let title: string;
  let price: number;
  let productType: string;

  if (mode === "subscription") {
    const plan = PLANS.find((p) => p.id === productId);
    if (!plan) return NextResponse.json({ error: "Plano nao encontrado" }, { status: 400 });
    title = `Fluxo AI - Plano ${plan.name} (${plan.credits} creditos)`;
    price = plan.priceValue;
    productType = `subscription_${plan.id}`;
  } else {
    const pack = CREDIT_PACKS.find((p) => p.id === productId);
    if (!pack) return NextResponse.json({ error: "Pacote nao encontrado" }, { status: 400 });
    title = `Fluxo AI - ${pack.credits} Creditos`;
    price = pack.priceValue;
    productType = `pack_${pack.id}`;
  }

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = process.env.MP_WEBHOOK_URL || `${origin}/api/webhook/mercadopago`;

  try {
    const preference = getPreferenceClient();

    const result = await preference.create({
      body: {
        items: [
          {
            id: productId,
            title,
            quantity: 1,
            unit_price: price,
            currency_id: "BRL",
          },
        ],
        payer: {
          email: user.email || undefined,
        },
        metadata: {
          user_id: user.id,
          product_id: productId,
          product_type: productType,
          mode,
        },
        back_urls: {
          success: `${origin}/dashboard?checkout=success`,
          failure: `${origin}/pricing?checkout=failed`,
          pending: `${origin}/dashboard?checkout=pending`,
        },
        auto_return: "approved",
        notification_url: webhookUrl,
        payment_methods: {
          excluded_payment_types: [
            { id: "ticket" }, // exclui boleto (opcional, remova se quiser boleto)
          ],
        },
      },
    });

    return NextResponse.json({ url: result.init_point });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar preferencia";
    console.error("[checkout] MP error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
