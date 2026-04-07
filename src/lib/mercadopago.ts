import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

// Lazy init
let _client: MercadoPagoConfig | null = null;

export function getMP(): MercadoPagoConfig {
  if (!_client) {
    _client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
    });
  }
  return _client;
}

export function getPreferenceClient() {
  return new Preference(getMP());
}

export function getPaymentClient() {
  return new Payment(getMP());
}

// -- Planos de assinatura (mensal) --
export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    credits: 700,
    price: "R$ 34,90",
    priceValue: 34.9,
  },
  {
    id: "creator",
    name: "Creator",
    credits: 1700,
    price: "R$ 79,90",
    priceValue: 79.9,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 4000,
    price: "R$ 179,90",
    priceValue: 179.9,
  },
];

// -- Pacotes avulsos (one-time) --
export const CREDIT_PACKS = [
  { id: "pack-500", credits: 500, price: "R$ 24,90", priceValue: 24.9 },
  { id: "pack-1000", credits: 1000, price: "R$ 44,90", priceValue: 44.9 },
  { id: "pack-2500", credits: 2500, price: "R$ 99,90", priceValue: 99.9 },
];

// Mapear product ID para creditos (para webhook)
export function getCreditsForProductId(productId: string): { credits: number; type: "subscription" | "pack"; planId?: string } | null {
  const plan = PLANS.find((p) => p.id === productId);
  if (plan) return { credits: plan.credits, type: "subscription", planId: plan.id };

  const pack = CREDIT_PACKS.find((p) => p.id === productId);
  if (pack) return { credits: pack.credits, type: "pack" };

  return null;
}
