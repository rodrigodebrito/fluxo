import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

// ── Planos de assinatura ──
// Os price IDs devem ser configurados no .env apos criar os produtos no Stripe Dashboard
export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    credits: 700,
    pricePromo: "R$ 34,90",
    priceRegular: "R$ 49,90",
    priceId: process.env.STRIPE_PRICE_STARTER || "",
  },
  {
    id: "creator",
    name: "Creator",
    credits: 1700,
    pricePromo: "R$ 79,90",
    priceRegular: "R$ 114,90",
    priceId: process.env.STRIPE_PRICE_CREATOR || "",
  },
  {
    id: "pro",
    name: "Pro",
    credits: 4000,
    pricePromo: "R$ 179,90",
    priceRegular: "R$ 249,90",
    priceId: process.env.STRIPE_PRICE_PRO || "",
  },
] as const;

// ── Pacotes avulsos (one-time) ──
export const CREDIT_PACKS = [
  {
    id: "pack-500",
    credits: 500,
    price: "R$ 24,90",
    priceId: process.env.STRIPE_PRICE_PACK_500 || "",
  },
  {
    id: "pack-1000",
    credits: 1000,
    price: "R$ 44,90",
    priceId: process.env.STRIPE_PRICE_PACK_1000 || "",
  },
  {
    id: "pack-2500",
    credits: 2500,
    price: "R$ 99,90",
    priceId: process.env.STRIPE_PRICE_PACK_2500 || "",
  },
] as const;

// Mapear price ID para creditos (para webhook)
export function getCreditsForPriceId(priceId: string): { credits: number; type: "subscription" | "pack"; planId?: string } | null {
  const plan = PLANS.find((p) => p.priceId === priceId);
  if (plan) return { credits: plan.credits, type: "subscription", planId: plan.id };

  const pack = CREDIT_PACKS.find((p) => p.priceId === priceId);
  if (pack) return { credits: pack.credits, type: "pack" };

  return null;
}
