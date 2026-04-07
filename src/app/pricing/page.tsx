"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PACKS = [
  { id: "pack-500", credits: 500, price: "R$ 24,90", priceValue: 24.9, perCredit: "R$ 0,050" },
  { id: "pack-1000", credits: 1000, price: "R$ 44,90", priceValue: 44.9, perCredit: "R$ 0,045", popular: true },
  { id: "pack-2500", credits: 2500, price: "R$ 99,90", priceValue: 99.9, perCredit: "R$ 0,040" },
];

interface CouponData {
  valid: boolean;
  couponId: string;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  discount: number;
  finalAmount: number;
}

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponData, setCouponData] = useState<Record<string, CouponData | null>>({});
  const [couponError, setCouponError] = useState("");

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    setCouponData({});

    try {
      const results: Record<string, CouponData | null> = {};
      for (const pack of PACKS) {
        const res = await fetch("/api/coupons/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: couponCode, amount: pack.priceValue }),
        });
        const data = await res.json();
        if (!res.ok) {
          setCouponError(data.error || "Cupom invalido");
          setCouponData({});
          return;
        }
        results[pack.id] = data;
      }
      setCouponData(results);
    } catch {
      setCouponError("Erro ao validar cupom");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponData({});
    setCouponError("");
  };

  const handleCheckout = async (productId: string) => {
    setLoading(productId);
    const appliedCoupon = couponData[productId];
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          mode: "payment",
          ...(appliedCoupon ? { couponId: appliedCoupon.couponId, couponCode: appliedCoupon.code } : {}),
        }),
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

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Comprar Creditos
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Creditos nao expiram. Use quando quiser para gerar imagens e videos com IA.
          </p>
        </div>

        {/* Coupon Input */}
        <div className="max-w-md mx-auto mb-10">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cupom de desconto"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
              disabled={couponLoading || Object.keys(couponData).length > 0}
              className="flex-1 px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
            />
            {Object.keys(couponData).length > 0 ? (
              <button
                onClick={handleRemoveCoupon}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-xl transition-colors border border-zinc-700"
              >
                Remover
              </button>
            ) : (
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {couponLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Aplicar"
                )}
              </button>
            )}
          </div>
          {couponError && (
            <p className="text-red-400 text-xs mt-2 text-center">{couponError}</p>
          )}
          {Object.keys(couponData).length > 0 && (
            <p className="text-green-400 text-xs mt-2 text-center">
              Cupom {couponCode} aplicado!
              {couponData[PACKS[0].id]?.discountType === "percent"
                ? ` (${couponData[PACKS[0].id]?.discountValue}% de desconto)`
                : ` (R$ ${couponData[PACKS[0].id]?.discountValue.toFixed(2).replace(".", ",")} de desconto)`}
            </p>
          )}
        </div>

        {/* Credit Packs */}
        <div className="grid md:grid-cols-3 gap-6">
          {PACKS.map((pack) => {
            const appliedCoupon = couponData[pack.id];
            return (
              <div
                key={pack.id}
                className={`relative rounded-2xl border p-8 flex flex-col items-center text-center ${
                  pack.popular
                    ? "border-purple-500/50 bg-purple-500/5 shadow-lg shadow-purple-500/10"
                    : "border-zinc-800 bg-zinc-900/50"
                }`}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-600 rounded-full text-xs font-semibold">
                    Mais popular
                  </div>
                )}

                <div className="text-4xl font-bold text-purple-400 mb-1">
                  {pack.credits.toLocaleString("pt-BR")}
                </div>
                <p className="text-sm text-zinc-500 mb-1">creditos</p>
                <p className="text-xs text-zinc-600 mb-6">{pack.perCredit} por credito</p>

                {appliedCoupon ? (
                  <div className="mb-6">
                    <p className="text-lg text-zinc-500 line-through">{pack.price}</p>
                    <p className="text-3xl font-bold text-green-400">
                      R$ {appliedCoupon.finalAmount.toFixed(2).replace(".", ",")}
                    </p>
                    <p className="text-xs text-green-400/70 mt-1">
                      -{appliedCoupon.discountType === "percent"
                        ? `${appliedCoupon.discountValue}%`
                        : `R$ ${appliedCoupon.discount.toFixed(2).replace(".", ",")}`}
                    </p>
                  </div>
                ) : (
                  <p className="text-3xl font-bold mb-6">{pack.price}</p>
                )}

                <button
                  onClick={() => handleCheckout(pack.id)}
                  disabled={loading !== null}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                    pack.popular
                      ? "bg-purple-600 hover:bg-purple-500 text-white"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                <p className="text-[10px] text-zinc-600 mt-3">PIX, cartao ou Mercado Pago</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
