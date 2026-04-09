"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UserCredits from "@/components/Header/UserCredits";

interface Workflow {
  id: string;
  name: string;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string | null;
  featured: boolean;
  usage_count: number;
  created_at: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [usingTemplate, setUsingTemplate] = useState<string | null>(null);
  const [templateTab, setTemplateTab] = useState<"library" | "tutorials">("library");
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows");
      const data = await res.json();
      setWorkflows(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/public-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
    fetchTemplates();
  }, [fetchWorkflows, fetchTemplates]);

  const handleUseTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUsingTemplate(templateId);
    try {
      const res = await fetch("/api/public-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json();
      if (data.workflowId) {
        router.push(`/editor/${data.workflowId}`);
      }
    } finally {
      setUsingTemplate(null);
    }
  };

  const handleCreate = async () => {
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "untitled", data: { nodes: [], edges: [] } }),
    });
    const wf = await res.json();
    router.push(`/editor/${wf.id}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Deletar este workflow?")) return;
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  };

  const handleRenameStart = (wf: Workflow, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(wf.id);
    setEditName(wf.name);
  };

  const handleRenameSubmit = async (id: string) => {
    const newName = editName.trim() || "untitled";
    setEditingId(null);
    setWorkflows((prev) => prev.map((w) => w.id === id ? { ...w, name: newName } : w));
    await fetch(`/api/workflows/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Agora";
    if (diffHours < 24) return `${diffHours}h atras`;
    if (diffDays < 7) return `${diffDays}d atras`;
    return d.toLocaleDateString("pt-BR");
  };

  const filtered = search
    ? workflows.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))
    : workflows;

  const scrollCarousel = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
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

            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="px-3 py-1.5 text-sm text-white bg-zinc-800 rounded-lg">
                Workflows
              </Link>
              <Link href="/history" className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
                Historico
              </Link>
              <Link href="/models" className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
                Meus Modelos
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <UserCredits />
            <button
              onClick={handleCreate}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Workflow
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ===== TEMPLATE LIBRARY (top, like Weavy) ===== */}
        {!templatesLoading && templates.length > 0 && (
          <section className="mb-10 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setTemplateTab("library")}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${templateTab === "library" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}
              >
                Workflow library
              </button>
              <button
                onClick={() => setTemplateTab("tutorials")}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${templateTab === "tutorials" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}
              >
                Tutorials
              </button>
            </div>

            {templateTab === "library" && (
              <div className="relative group/carousel">
                {/* Scroll buttons */}
                <button
                  onClick={() => scrollCarousel("left")}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/70 hover:bg-black rounded-full flex items-center justify-center text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button
                  onClick={() => scrollCarousel("right")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/70 hover:bg-black rounded-full flex items-center justify-center text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>

                <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-1" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      onClick={(e) => handleUseTemplate(t.id, e)}
                      className="flex-shrink-0 w-[180px] cursor-pointer group/card"
                    >
                      <div className="relative h-[120px] bg-zinc-800 rounded-xl overflow-hidden mb-2">
                        {t.thumbnail ? (
                          <img src={t.thumbnail} alt={t.name} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
                            </svg>
                          </div>
                        )}
                        {t.featured && (
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-yellow-500/90 text-black text-[9px] font-bold rounded-full uppercase">
                            Destaque
                          </div>
                        )}
                        {usingTemplate === t.id && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 font-medium truncate px-1">{t.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {templateTab === "tutorials" && (
              <div className="text-center py-10 text-zinc-500 text-sm">
                Tutoriais em breve...
              </div>
            )}
          </section>
        )}

        {/* ===== MY FILES ===== */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-white">My files</h2>

          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-purple-500 w-56"
              />
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex md:hidden items-center gap-2 mb-6">
          <Link href="/dashboard" className="flex-1 py-2 text-sm text-center text-white bg-zinc-800 rounded-lg font-medium">
            Workflows
          </Link>
          <Link href="/history" className="flex-1 py-2 text-sm text-center text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg hover:text-white transition-colors">
            Historico
          </Link>
        </div>

        {/* Grid */}
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
        ) : filtered.length === 0 && !search ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 border border-zinc-800">
              <svg className="w-10 h-10 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-zinc-400 text-sm mb-4">Nenhum workflow ainda</p>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Criar primeiro workflow
            </button>
          </div>
        ) : filtered.length === 0 && search ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-zinc-500 text-sm">Nenhum workflow encontrado para &quot;{search}&quot;</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {/* Create New Card */}
            <button
              onClick={handleCreate}
              className="group flex flex-col items-center justify-center aspect-square bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-xl hover:border-purple-500 transition-colors"
            >
              <div className="w-10 h-10 bg-zinc-800 group-hover:bg-purple-600/20 rounded-xl flex items-center justify-center mb-2 transition-colors">
                <svg className="w-5 h-5 text-zinc-500 group-hover:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-xs text-zinc-500 group-hover:text-purple-400 transition-colors">Novo workflow</span>
            </button>

            {/* Workflow Cards */}
            {filtered.map((wf) => (
              <div
                key={wf.id}
                onClick={() => router.push(`/editor/${wf.id}`)}
                className="group relative flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer hover:border-zinc-600 transition-all hover:-translate-y-0.5"
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-zinc-800 flex items-center justify-center">
                  {wf.thumbnail ? (
                    <img src={wf.thumbnail} alt={wf.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-8 h-8 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="p-2.5">
                  {editingId === wf.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleRenameSubmit(wf.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSubmit(wf.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="w-full text-xs font-medium text-zinc-200 bg-zinc-800 border border-purple-500 rounded px-1.5 py-0.5 focus:outline-none"
                    />
                  ) : (
                    <p
                      className="text-xs font-medium text-zinc-200 truncate cursor-text hover:text-purple-300 transition-colors"
                      onDoubleClick={(e) => handleRenameStart(wf, e)}
                      title="Duplo clique para renomear"
                    >
                      {wf.name}
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-500 mt-0.5">Last edited {formatDate(wf.updatedAt)}</p>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(wf.id, e)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  title="Deletar"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
