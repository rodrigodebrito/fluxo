"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import UserCredits from "@/components/Header/UserCredits";

interface Generation {
  id: string;
  model: string;
  prompt: string;
  result_urls: string[];
  cost: number;
  type: string;
  created_at: string;
}

const MODEL_LABELS: Record<string, string> = {
  "nano-banana-pro": "Nano Banana Pro",
  "gpt-image-txt": "GPT Image 1.5",
  "gpt-image-img": "GPT Image 1.5",
  "flux-2-pro": "Flux 2 Pro",
  "flux-2-edit": "Flux 2 Edit",
  veo3: "Veo 3.1",
  kling: "Kling 3.0",
  seedance: "Seedance 2.0",
  llm: "LLM",
};

const MODEL_COLORS: Record<string, string> = {
  "nano-banana-pro": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "gpt-image-txt": "bg-green-500/10 text-green-400 border-green-500/20",
  "gpt-image-img": "bg-green-500/10 text-green-400 border-green-500/20",
  "flux-2-pro": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "flux-2-edit": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  veo3: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  kling: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  seedance: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  llm: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

export default function HistoryPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; type: string } | null>(null);

  const fetchGenerations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filter) params.set("type", filter);
      const res = await fetch(`/api/generations?${params}`);
      const data = await res.json();
      setGenerations(data.generations || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  const formatDate = (date: string) => {
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
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const isVideo = (url: string) => {
    return /\.(mp4|webm|mov)(\?|$)/i.test(url);
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">Fluxo AI</h1>
            </Link>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
                Workflows
              </Link>
              <Link href="/history" className="px-3 py-1.5 text-sm text-white bg-zinc-800 rounded-lg">
                Historico
              </Link>
            </nav>
          </div>
          <UserCredits />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title + filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Historico de Geracoes</h2>
            <p className="text-sm text-zinc-500 mt-1">{total} {total === 1 ? "geracao" : "geracoes"} no total</p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            {[
              { label: "Todos", value: null },
              { label: "Imagens", value: "image" },
              { label: "Videos", value: "video" },
            ].map((f) => (
              <button
                key={f.label}
                onClick={() => { setFilter(f.value); setPage(1); }}
                className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === f.value
                    ? "bg-purple-600 text-white font-medium"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-zinc-500">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Carregando...
            </div>
          </div>
        ) : generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 border border-zinc-800">
              <svg className="w-10 h-10 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v13.5a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <p className="text-zinc-400 text-sm mb-2">Nenhuma geracao ainda</p>
            <p className="text-zinc-600 text-xs mb-6">Suas geracoes aparecerao aqui automaticamente</p>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Ir para o Editor
            </Link>
          </div>
        ) : (
          <>
            {/* Gallery grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {generations.map((gen) => (
                <div key={gen.id} className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-all hover:-translate-y-0.5">
                  {/* Media preview */}
                  <div
                    className="relative aspect-square bg-zinc-800 cursor-pointer overflow-hidden"
                    onClick={() => setLightbox({ url: gen.result_urls[0], type: gen.type })}
                  >
                    {gen.result_urls[0] && isVideo(gen.result_urls[0]) ? (
                      <>
                        <video
                          src={gen.result_urls[0]}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-purple-600/80 transition-colors">
                            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          </div>
                        </div>
                      </>
                    ) : gen.result_urls[0] ? (
                      <img src={gen.result_urls[0]} alt={gen.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
                        </svg>
                      </div>
                    )}

                    {/* Multi-result badge */}
                    {gen.result_urls.length > 1 && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-[10px] text-white font-medium">
                        +{gen.result_urls.length - 1}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${MODEL_COLORS[gen.model] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                        {MODEL_LABELS[gen.model] || gen.model}
                      </span>
                      <span className="text-[10px] text-zinc-600">{gen.cost} cred</span>
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-1.5">{gen.prompt || "Sem prompt"}</p>
                    <p className="text-[10px] text-zinc-600">{formatDate(gen.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-zinc-500">
                  {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Proximo
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-white transition-colors z-10"
            onClick={() => setLightbox(null)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            {isVideo(lightbox.url) ? (
              <video
                src={lightbox.url}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] rounded-lg"
              />
            ) : (
              <img
                src={lightbox.url}
                alt="Geracao"
                className="max-w-full max-h-[90vh] rounded-lg object-contain"
              />
            )}

            {/* Download button */}
            <a
              href={lightbox.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
