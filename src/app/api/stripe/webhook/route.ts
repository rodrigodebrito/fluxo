import { NextRequest, NextResponse } from "next/server";
import { getStripe, getCreditsForPriceId } from "@/lib/stripe";
import { addCredits } from "@/lib/credits";
import { createServiceClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook verification failed";
    console.error("[stripe-webhook] Signature error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = await createServiceClient();

  switch (event.type) {
    // Pagamento avulso (creditos) ou primeira assinatura
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId) break;

      // Verificar se e primeira compra (para bonus de +50)
      const { data: logs } = await supabase
        .from("credit_logs")
        .select("id")
        .eq("user_id", userId)
        .like("reason", "pack_purchase_%")
        .limit(1);
      const { data: subLogs } = await supabase
        .from("credit_logs")
        .select("id")
        .eq("user_id", userId)
        .like("reason", "subscription_%")
        .limit(1);
      const isFirstPurchase = (!logs || logs.length === 0) && (!subLogs || subLogs.length === 0);

      if (session.mode === "payment") {
        // Pacote avulso - buscar line items para saber qual pack
        const lineItems = await getStripe().checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0]?.price?.id;
        if (!priceId) break;

        const info = getCreditsForPriceId(priceId);
        if (info) {
          await addCredits(userId, info.credits, `pack_purchase_${info.credits}`);
          console.log(`[stripe-webhook] Added ${info.credits} credits (pack) for user ${userId}`);

          // Bonus primeira compra
          if (isFirstPurchase) {
            await addCredits(userId, 50, "first_purchase_bonus");
            console.log(`[stripe-webhook] Added 50 bonus credits (first purchase) for user ${userId}`);
          }
        }
      }

      if (session.mode === "subscription") {
        // Assinatura - salvar subscription ID e plan
        const subscriptionId = session.subscription as string;
        const sub = await getStripe().subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price?.id;
        if (!priceId) break;

        const info = getCreditsForPriceId(priceId);
        if (info) {
          await supabase
            .from("profiles")
            .update({
              plan: info.planId,
              stripe_subscription_id: subscriptionId,
            })
            .eq("id", userId);

          await addCredits(userId, info.credits, `subscription_${info.planId}`);
          console.log(`[stripe-webhook] Activated plan ${info.planId} (+${info.credits} credits) for user ${userId}`);

          // Bonus primeira compra
          if (isFirstPurchase) {
            await addCredits(userId, 50, "first_purchase_bonus");
            console.log(`[stripe-webhook] Added 50 bonus credits (first purchase) for user ${userId}`);
          }
        }
      }
      break;
    }

    // Renovacao mensal da assinatura
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      // Ignorar a primeira fatura (ja tratada no checkout.session.completed)
      if (invoice.billing_reason === "subscription_create") break;

      const customerId = invoice.customer as string;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (!profile) break;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const priceId = (invoice.lines.data[0] as any)?.price?.id as string | undefined;
      if (!priceId) break;

      const info = getCreditsForPriceId(priceId);
      if (info) {
        await addCredits(profile.id, info.credits, `subscription_renewal_${info.planId}`);
        console.log(`[stripe-webhook] Renewed +${info.credits} credits for user ${profile.id}`);
      }
      break;
    }

    // Cancelamento de assinatura
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({
            plan: "free",
            stripe_subscription_id: null,
          })
          .eq("id", profile.id);

        console.log(`[stripe-webhook] Cancelled subscription for user ${profile.id}`);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
