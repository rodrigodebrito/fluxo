import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorizedResponse } from "@/lib/auth-guard";
import { stripe, PLANS, CREDIT_PACKS } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const { priceId: productId, mode } = await request.json();

  if (!productId) {
    return NextResponse.json({ error: "productId obrigatorio" }, { status: 400 });
  }

  // Resolver o Stripe price ID a partir do product ID
  let stripePriceId: string | undefined;

  if (mode === "subscription") {
    const plan = PLANS.find((p) => p.id === productId);
    stripePriceId = plan?.priceId;
  } else {
    const pack = CREDIT_PACKS.find((p) => p.id === productId);
    stripePriceId = pack?.priceId;
  }

  if (!stripePriceId) {
    return NextResponse.json(
      { error: "Produto nao encontrado. Configure os price IDs no ambiente." },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  // Buscar ou criar stripe_customer_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, name")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: profile?.name || undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: stripePriceId, quantity: 1 }],
    mode: mode === "subscription" ? "subscription" : "payment",
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
    metadata: { supabase_user_id: user.id },
    payment_method_types: mode === "subscription"
      ? ["card"]
      : ["card", "boleto", "pix"],
  });

  return NextResponse.json({ url: session.url });
}
