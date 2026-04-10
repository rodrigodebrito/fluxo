"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import UserCredits from "@/components/Header/UserCredits";

interface CreditLog {
  id: string;
  amount: number;
  reason: string;
  model: string | null;
  prompt: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const MODEL_LABELS: Record<string, string> = {
  "nano-banana-pro": "Nano Banana Pro",
  "gpt-image-txt": "GPT Image 1.5",
  "gpt-image-img": "GPT Image 1.5",
  "flux-2-pro": "Flux 2 Pro",
  "flux-2-edit": "Flux 2 Edit",
  "bg-removal": "BG Removal",
  upscale: "Upscale",
  veo3: "Veo 3.1",
  kling: "Kling 3.0",
  "kling-o3-i2v": "Kling O3 I2V",
  "kling-o3-edit": "Kling O3 Edit",
  "kling-o1-ref": "Kling O1 Ref",
  "kling-motion": "Kling Motion",
  "kling-avatar": "Kling Avatar",
  seedance: "Seedance 2.0",
  "wan-i2v": "Wan 2.7 I2V",
  "grok-i2v": "Grok Imagine",
  llm: "LLM",
  "custom-model": "Modelo Treinado",
  "extract-audio": "Extrair Audio",
  "zimage-t2i": "Z-Image T2I",
  "zimage-i2i": "Z-Image I2I",
  "zimage-lora": "Z-Image LoRA",
  "zimage-i2i-lora": "Z-Image I2I+LoRA",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "text-yellow-400 bg-yellow-500/10" },
  success: { label: "Sucesso", color: "text-green-400 bg-green-500/10" },
  fail: { label: "Falhou", color: "text-red-400 bg-red-500/10" },
  refund: { label: "Reembolso", color: "text-blue-400 bg-blue-500/10" },
  cancel: { label: "Cancelado", color: "text-zinc-400 bg-zinc-500/10" },
  purchase: { label: "Compra", color: "text-emerald-400 bg-emerald-500/10" },
  admin: { label: "Admin", color: "text-purple-400 bg-purple-500/10" },
};

export default function CreditsPage() {
  const [logs, setLogs] = useState<CreditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/credits/history?page=${page}&limit=50`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelative = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Agora mesmo";
    if (diffMin < 60) return `${diffMin}min atras`;
    if (diffHours < 24) return `${diffHours}h atras`;
    if (diffDays < 7) return `${diffDays}d atras`;
    return formatDate(date);
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-white">Historico de Creditos</h1>
              <p className="text-xs text-zinc-500">{total} transacoes</p>
            </div>
          </div>
          <UserCredits />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500">Nenhuma transacao encontrada</p>
          </div>
        ) : (
          <>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Data</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Modelo</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Prompt</th>
                    <th className="text-center px-4 py-3 text-xs text-zinc-500 font-medium">Status</th>
                    <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Creditos</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const isDebit = log.amount < 0;
                    const statusInfo = STATUS_LABELS[log.status || "success"] || STATUS_LABELS.success;
                    const modelLabel = log.model ? (MODEL_LABELS[log.model] || log.model) : reasonLabel(log.reason);

                    return (
                      <tr key={log.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-xs text-zinc-400" title={formatDate(log.created_at)}>
                            {formatRelative(log.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-zinc-200">{modelLabel}</span>
                        </td>
                        <td className="px-4 py-3 max-w-[300px]">
                          <p className="text-xs text-zinc-500 truncate" title={log.prompt || ""}>
                            {log.prompt || "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-semibold ${isDebit ? "text-red-400" : "text-green-400"}`}>
                            {isDebit ? "" : "+"}{log.amount}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs bg-zinc-800 text-zinc-300 rounded disabled:opacity-30 hover:bg-zinc-700 transition-colors"
                >
                  Anterior
                </button>
                <span className="text-xs text-zinc-500">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs bg-zinc-800 text-zinc-300 rounded disabled:opacity-30 hover:bg-zinc-700 transition-colors"
                >
                  Proxima
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function reasonLabel(reason: string): string {
  if (reason.startsWith("generation_")) return reason.replace("generation_", "").replace(/-/g, " ");
  if (reason === "admin_grant") return "Creditos Admin";
  if (reason === "purchase") return "Compra";
  if (reason === "refund") return "Reembolso";
  return reason;
}
