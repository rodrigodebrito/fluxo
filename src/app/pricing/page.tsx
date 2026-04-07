"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    credits: 700,
    price: "R$ 34,90",
    priceValue: 34.9,
    perCredit: "R$ 0,050",
    features: [
      "700 creditos/mes",
      "Todos os modelos de IA",
      "Workflows ilimitados",
      "Suporte por email",
    ],
    popular: false,
  },
  {
    id: "creator",
    name: "Creator",
    credits: 1700,
    price: "R$ 79,90",
    priceValue: 79.9,
    perCredit: "R$ 0,047",
    features: [
      "1.700 creditos/mes",
      "Todos os modelos de IA",
      "Workflows ilimitados",
      "Suporte prioritario",
      "Templates de workflow",
    ],
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 4000,
    price: "R$ 179,90",
    priceValue: 179.9,
    perCredit: "R$ 0,045",
    features: [
      "4.000 creditos/mes",
      "Todos os modelos de IA",
      "Workflows ilimitados",
      "Suporte prioritario",
      "Templates de workflow",
      "Acesso antecipado a novos modelos",
    ],
    popular: false,
  },
];

const PACKS = [
  { id: "pack-500", credits: 500, price: "R$ 24,90", priceValue: 24.9 },
  { id: "pack-1000", credits: 1000, price: "R$ 44,90", priceValue: 44.9 },
  { id: "pack-2500", credits: 2500, price: "R$ 99,90", priceValue: 99.9 },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (productId: string, mode: "subscription" | "payment") => {
    setLoading(productId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, mode }),
      });

      if (res.status === 401) {
        router.push("/login?redirect=/pricing");
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      alert("Erro ao processar pagamento. Tente novamente.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <nav className="border-b border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Fluxo AI
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
            >
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            Escolha seu plano
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Comece gratis com 50 creditos. Assine para gerar mais conteudo com IA.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-8 flex flex-col ${
                plan.popular
                  ? "border-purple-500/50 bg-purple-500/5 shadow-lg shadow-purple-500/10"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-600 rounded-full text-xs font-semibold">
                  Mais popular
                </div>
              )}

              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <div className="mb-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-zinc-500 text-sm">/mes</span>
              </div>
              <p className="text-xs text-zinc-500 mb-6">{plan.perCredit} por credito</p>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                    <svg className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.id, "subscription")}
                disabled={loading !== null}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.popular
                    ? "bg-purple-600 hover:bg-purple-500 text-white"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processando...
                  </span>
                ) : (
                  `Assinar ${plan.name}`
                )}
              </button>
              <p className="text-[10px] text-zinc-600 mt-2 text-center">Recorrente via cartao de credito</p>
            </div>
          ))}
        </div>

        {/* Credit Packs */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">Creditos avulsos</h2>
            <p className="text-zinc-500 text-sm">
              Compre creditos extras a qualquer momento. Creditos avulsos nao expiram.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {PACKS.map((pack) => (
              <div
                key={pack.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col items-center text-center"
              >
                <div className="text-3xl font-bold text-purple-400 mb-1">
                  {pack.credits.toLocaleString("pt-BR")}
                </div>
                <p className="text-xs text-zinc-500 mb-4">creditos</p>
                <p className="text-xl font-bold mb-4">{pack.price}</p>

                <button
                  onClick={() => handleCheckout(pack.id, "payment")}
                  disabled={loading !== null}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === pack.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processando...
                    </span>
                  ) : (
                    "Comprar"
                  )}
                </button>
                <p className="text-[10px] text-zinc-600 mt-2">PIX, cartao ou Mercado Pago</p>
              </div>
            ))}
          </div>
        </div>

        {/* Free tier note */}
        <div className="text-center border-t border-zinc-800 pt-10">
          <p className="text-zinc-500 text-sm mb-4">
            Novo por aqui? Cadastre-se e ganhe <span className="text-white font-semibold">50 creditos gratis</span> para testar.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm font-semibold transition-colors"
          >
            Criar conta gratis
          </Link>
        </div>
      </div>
    </div>
  );
}
