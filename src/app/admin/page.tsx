"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  credits: number;
  role: string;
  plan: string;
  created_at: string;
}

interface Generation {
  id: string;
  model: string;
  prompt: string;
  result_urls: string[];
  cost: number;
  type: string;
  created_at: string;
  user_name: string;
}

interface WaitlistEntry {
  id: string;
  name: string;
  contact: string;
  created_at: string;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  min_purchase: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  waitlistCount: number;
  waitlistRemaining: number;
  totalGenerations: number;
  totalCreditsSpent: number;
  recentGenerations: Generation[];
  waitlistEntries: WaitlistEntry[];
  modelCounts: Record<string, number>;
}

const MODEL_LABELS: Record<string, string> = {
  "nano-banana-pro": "Nano Banana",
  "gpt-image-txt": "GPT Image",
  "gpt-image-img": "GPT Image",
  "flux-2-pro": "Flux 2 Pro",
  "flux-2-edit": "Flux 2 Edit",
  "bg-removal": "BG Removal",
  "upscale": "Upscale",
  veo3: "Veo 3.1",
  kling: "Kling 3.0",
  seedance: "Seedance 2.0",
  llm: "LLM",
  "custom-model": "Modelo Treinado",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  creator: "Creator",
  pro: "Pro",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-zinc-700/20 text-zinc-400",
  starter: "bg-blue-500/10 text-blue-400",
  creator: "bg-purple-500/10 text-purple-400",
  pro: "bg-orange-500/10 text-orange-400",
};

export default function AdminPage() {
  const [tab, setTab] = useState<"overview" | "users" | "waitlist" | "generations" | "coupons" | "trained-models" | "templates">("overview");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creditAmounts, setCreditAmounts] = useState<Record<string, string>>({});
  const [searchUsers, setSearchUsers] = useState("");

  // Coupons state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "",
    discountType: "percent" as "percent" | "fixed",
    discountValue: "",
    maxUses: "",
    minPurchase: "",
    expiresAt: "",
  });
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponError, setCouponError] = useState("");

  // Trained models
  const [trainedModels, setTrainedModels] = useState<{ id: string; user_id: string; name: string; trigger_word: string; status: string; created_at: string; user_email?: string }[]>([]);
  const [trainedModelsLoading, setTrainedModelsLoading] = useState(false);

  // Templates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userWorkflows, setUserWorkflows] = useState<any[]>([]);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState("geral");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [newTemplateThumbnail, setNewTemplateThumbnail] = useState("");
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editThumbnailUploading, setEditThumbnailUploading] = useState(false);

  // Provider balances
  const [providerBalances, setProviderBalances] = useState<{ provider: string; balance: number | null; currency: string; error?: string; low?: boolean }[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);

  // User history modal
  const [historyUser, setHistoryUser] = useState<UserProfile | null>(null);
  const [historyLogs, setHistoryLogs] = useState<{ id: string; amount: number; reason: string; model: string | null; prompt: string | null; status: string | null; metadata: Record<string, unknown> | null; created_at: string }[]>([]);
  const [historyStats, setHistoryStats] = useState<{ totalSpent: number; totalAdded: number; modelCounts: Record<string, number>; statusCounts: Record<string, number> } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/stats"),
      ]);

      if (usersRes.status === 403 || statsRes.status === 403) {
        setError("Acesso negado. Voce nao e admin.");
        setLoading(false);
        return;
      }

      const usersData = await usersRes.json();
      const statsData = await statsRes.json();

      if (usersRes.ok) setUsers(usersData);
      if (statsRes.ok) setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBalances = useCallback(async () => {
    setBalancesLoading(true);
    try {
      const res = await fetch("/api/admin/provider-balances");
      if (res.ok) {
        const data = await res.json();
        setProviderBalances(data.providers || []);
      }
    } catch { /* ignore */ } finally {
      setBalancesLoading(false);
    }
  }, []);

  const fetchCoupons = useCallback(async () => {
    setCouponsLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      if (res.ok) {
        const data = await res.json();
        setCoupons(data);
      }
    } catch { /* ignore */ } finally {
      setCouponsLoading(false);
    }
  }, []);

  const handleCreateCoupon = async () => {
    setCouponSaving(true);
    setCouponError("");
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponForm.code,
          discountType: couponForm.discountType,
          discountValue: parseFloat(couponForm.discountValue),
          maxUses: couponForm.maxUses ? parseInt(couponForm.maxUses) : null,
          minPurchase: couponForm.minPurchase ? parseFloat(couponForm.minPurchase) : 0,
          expiresAt: couponForm.expiresAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error);
        return;
      }
      setCoupons((prev) => [data, ...prev]);
      setShowCouponForm(false);
      setCouponForm({ code: "", discountType: "percent", discountValue: "", maxUses: "", minPurchase: "", expiresAt: "" });
    } catch {
      setCouponError("Erro ao criar cupom");
    } finally {
      setCouponSaving(false);
    }
  };

  const handleToggleCoupon = async (id: string, active: boolean) => {
    const res = await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    if (res.ok) {
      setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, active } : c)));
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cupom?")) return;
    const res = await fetch("/api/admin/coupons", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    }
  };

  useEffect(() => {
    fetchData();
    fetchBalances();
  }, [fetchData, fetchBalances]);

  const fetchTrainedModels = useCallback(async () => {
    setTrainedModelsLoading(true);
    try {
      const res = await fetch("/api/admin/trained-models");
      if (res.ok) {
        const data = await res.json();
        setTrainedModels(data.models || []);
      }
    } catch { /* ignore */ } finally {
      setTrainedModelsLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/admin/templates");
      if (res.ok) setTemplates(await res.json());
    } catch { /* ignore */ } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const uploadThumbnail = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("files", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.urls && data.urls.length > 0) return data.urls[0];
    throw new Error("Upload falhou");
  };

  const fetchUserWorkflows = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows");
      if (res.ok) {
        const data = await res.json();
        setUserWorkflows(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (tab === "coupons" && coupons.length === 0) fetchCoupons();
    if (tab === "trained-models" && trainedModels.length === 0) fetchTrainedModels();
    if (tab === "templates" && templates.length === 0) { fetchTemplates(); fetchUserWorkflows(); }
  }, [tab, coupons.length, fetchCoupons, trainedModels.length, fetchTrainedModels, templates.length, fetchTemplates, fetchUserWorkflows]);

  const handleAddCredits = async (userId: string) => {
    const amount = parseInt(creditAmounts[userId] || "0");
    if (amount <= 0) return;

    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount }),
      });

      if (!res.ok) throw new Error("Erro ao adicionar creditos");

      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, credits: data.credits } : u))
      );
      setCreditAmounts((prev) => ({ ...prev, [userId]: "" }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    }
  };

  const openUserHistory = async (user: UserProfile, page = 1) => {
    setHistoryUser(user);
    setHistoryLoading(true);
    setHistoryPage(page);
    try {
      const res = await fetch(`/api/admin/user-history?userId=${user.id}&page=${page}&limit=30`);
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data.logs || []);
        setHistoryTotalPages(data.totalPages || 1);
        setHistoryStats(data.stats || null);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
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

    if (diffMin < 1) return "agora";
    if (diffMin < 60) return `${diffMin}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 30) return `${diffDays}d`;
    return d.toLocaleDateString("pt-BR");
  };

  const filteredUsers = searchUsers
    ? users.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(searchUsers.toLowerCase()) ||
          u.email.toLowerCase().includes(searchUsers.toLowerCase())
      )
    : users;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Carregando painel admin...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <Link href="/dashboard" className="text-sm text-purple-400 hover:text-purple-300">Voltar ao Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">Fluxo AI</h1>
            </Link>
            <span className="text-[10px] bg-red-600/20 text-red-400 px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">Admin</span>
          </div>

          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-8 w-fit">
          {[
            { id: "overview" as const, label: "Visao Geral" },
            { id: "users" as const, label: "Usuarios" },
            { id: "coupons" as const, label: "Cupons" },
            { id: "trained-models" as const, label: "Modelos LoRA" },
            { id: "templates" as const, label: "Templates" },
            { id: "waitlist" as const, label: "Waitlist" },
            { id: "generations" as const, label: "Geracoes" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                tab === t.id
                  ? "bg-purple-600 text-white font-medium"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {t.label}
              {t.id === "waitlist" && stats && (
                <span className="ml-1.5 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{stats.waitlistCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && stats && (
          <div className="space-y-8">
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Usuarios", value: stats.totalUsers, icon: "👥", color: "text-blue-400" },
                { label: "Waitlist", value: `${stats.waitlistCount}/50`, icon: "📋", color: "text-green-400" },
                { label: "Geracoes", value: stats.totalGenerations, icon: "🖼️", color: "text-purple-400" },
                { label: "Creditos gastos", value: stats.totalCreditsSpent, icon: "⚡", color: "text-yellow-400" },
              ].map((s) => (
                <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{s.icon}</span>
                  </div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Provider Balances */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-300">Saldo dos Provedores</h3>
                <button
                  onClick={fetchBalances}
                  disabled={balancesLoading}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
                >
                  {balancesLoading ? "Atualizando..." : "Atualizar"}
                </button>
              </div>
              {balancesLoading && providerBalances.length === 0 ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {providerBalances.map((p) => (
                    <div
                      key={p.provider}
                      className={`rounded-lg p-4 border ${
                        p.low
                          ? "bg-red-500/5 border-red-500/30"
                          : "bg-zinc-800/50 border-zinc-700/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-zinc-400">{p.provider}</span>
                        {p.low && (
                          <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-medium animate-pulse">
                            SALDO BAIXO
                          </span>
                        )}
                      </div>
                      {p.error ? (
                        <p className="text-xs text-red-400/70">{p.error}</p>
                      ) : (
                        <p className={`text-xl font-bold ${p.low ? "text-red-400" : "text-white"}`}>
                          {p.currency === "USD" ? "$" : ""}{p.balance !== null ? p.balance.toLocaleString("pt-BR") : "—"}
                          {p.currency !== "USD" && <span className="text-xs text-zinc-500 ml-1">{p.currency}</span>}
                        </p>
                      )}
                    </div>
                  ))}
                  {/* Replicate - manual */}
                  <div className="rounded-lg p-4 border bg-zinc-800/50 border-zinc-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-zinc-400">Replicate</span>
                    </div>
                    <a
                      href="https://replicate.com/account/billing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Ver no dashboard &rarr;
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Model usage */}
            {Object.keys(stats.modelCounts).length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4">Uso por modelo (ultimas 20 geracoes)</h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(stats.modelCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([model, count]) => (
                      <div key={model} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                        <span className="text-sm text-zinc-300">{MODEL_LABELS[model] || model}</span>
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Recent activity */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4">Atividade recente</h3>
              {stats.recentGenerations.length === 0 ? (
                <p className="text-zinc-600 text-sm">Nenhuma geracao ainda</p>
              ) : (
                <div className="space-y-2">
                  {stats.recentGenerations.slice(0, 10).map((gen) => (
                    <div key={gen.id} className="flex items-center gap-3 py-2 border-b border-zinc-800/50 last:border-0">
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                        {gen.result_urls[0] && (
                          <img src={gen.result_urls[0]} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-300 font-medium truncate">{gen.user_name}</span>
                          <span className="text-[10px] text-zinc-600">gerou com</span>
                          <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded">{MODEL_LABELS[gen.model] || gen.model}</span>
                        </div>
                        <p className="text-[11px] text-zinc-600 truncate">{gen.prompt || "Sem prompt"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-zinc-500">{formatRelative(gen.created_at)}</p>
                        <p className="text-[10px] text-yellow-400/60">{gen.cost} cred</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{users.length} usuarios</h2>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar usuario..."
                  value={searchUsers}
                  onChange={(e) => setSearchUsers(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-purple-500 w-64"
                />
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Usuario</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Plano</th>
                    <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Creditos</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Cadastro</th>
                    <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-white">{(user.name || user.email).charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-zinc-200 truncate">{user.name || "Sem nome"}</p>
                              {user.role === "admin" && (
                                <span className="text-[9px] bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded font-medium">admin</span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[user.plan] || PLAN_COLORS.free}`}>
                          {PLAN_LABELS[user.plan] || "Free"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-purple-400">{user.credits}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-zinc-500">{formatRelative(user.created_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openUserHistory(user)}
                            className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded transition-colors"
                            title="Ver historico de creditos"
                          >
                            Historico
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={creditAmounts[user.id] || ""}
                            onChange={(e) =>
                              setCreditAmounts((prev) => ({ ...prev, [user.id]: e.target.value }))
                            }
                            placeholder="100"
                            className="w-20 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                          />
                          <button
                            onClick={() => handleAddCredits(user.id)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded transition-colors"
                          >
                            +Add
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="py-10 text-center text-zinc-600 text-sm">
                  {searchUsers ? `Nenhum resultado para "${searchUsers}"` : "Nenhum usuario"}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── WAITLIST TAB ── */}
        {tab === "waitlist" && stats && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Lista de Espera</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {stats.waitlistCount} de 50 vagas preenchidas — {stats.waitlistRemaining} restantes
                </p>
              </div>
              {/* Progress bar */}
              <div className="w-48">
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                    style={{ width: `${(stats.waitlistCount / 50) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-600 text-right mt-1">{Math.round((stats.waitlistCount / 50) * 100)}%</p>
              </div>
            </div>

            {stats.waitlistEntries.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
                <p className="text-zinc-600 text-sm">Nenhuma entrada na lista de espera ainda</p>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">#</th>
                      <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Nome</th>
                      <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Contato</th>
                      <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.waitlistEntries.map((entry, i) => (
                      <tr key={entry.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-xs text-zinc-600 font-mono">#{stats.waitlistEntries.length - i}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-zinc-200">{entry.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-zinc-400">{entry.contact}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-zinc-500">{formatDate(entry.created_at)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── COUPONS TAB ── */}
        {tab === "coupons" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Cupons de Desconto</h2>
              <button
                onClick={() => setShowCouponForm(!showCouponForm)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {showCouponForm ? "Cancelar" : "+ Novo Cupom"}
              </button>
            </div>

            {/* Form */}
            {showCouponForm && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4">Criar Cupom</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Codigo</label>
                    <input
                      type="text"
                      value={couponForm.code}
                      onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                      placeholder="DESCONTO20"
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Tipo</label>
                    <select
                      value={couponForm.discountType}
                      onChange={(e) => setCouponForm((f) => ({ ...f, discountType: e.target.value as "percent" | "fixed" }))}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="percent">Percentual (%)</option>
                      <option value="fixed">Valor fixo (R$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">
                      Valor {couponForm.discountType === "percent" ? "(%)" : "(R$)"}
                    </label>
                    <input
                      type="number"
                      value={couponForm.discountValue}
                      onChange={(e) => setCouponForm((f) => ({ ...f, discountValue: e.target.value }))}
                      placeholder={couponForm.discountType === "percent" ? "20" : "10.00"}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Max usos (vazio = ilimitado)</label>
                    <input
                      type="number"
                      value={couponForm.maxUses}
                      onChange={(e) => setCouponForm((f) => ({ ...f, maxUses: e.target.value }))}
                      placeholder="100"
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Compra minima (R$)</label>
                    <input
                      type="number"
                      value={couponForm.minPurchase}
                      onChange={(e) => setCouponForm((f) => ({ ...f, minPurchase: e.target.value }))}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Expira em (opcional)</label>
                    <input
                      type="datetime-local"
                      value={couponForm.expiresAt}
                      onChange={(e) => setCouponForm((f) => ({ ...f, expiresAt: e.target.value }))}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                {couponError && <p className="text-red-400 text-xs mt-3">{couponError}</p>}
                <button
                  onClick={handleCreateCoupon}
                  disabled={couponSaving || !couponForm.code || !couponForm.discountValue}
                  className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {couponSaving ? "Criando..." : "Criar Cupom"}
                </button>
              </div>
            )}

            {/* Table */}
            {couponsLoading ? (
              <div className="text-center py-10 text-zinc-500 text-sm">Carregando cupons...</div>
            ) : coupons.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
                <p className="text-zinc-600 text-sm">Nenhum cupom criado ainda</p>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Codigo</th>
                      <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Desconto</th>
                      <th className="text-center px-4 py-3 text-xs text-zinc-500 font-medium">Usos</th>
                      <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Expira</th>
                      <th className="text-center px-4 py-3 text-xs text-zinc-500 font-medium">Status</th>
                      <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((coupon) => (
                      <tr key={coupon.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono font-semibold text-purple-400">{coupon.code}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-zinc-300">
                            {coupon.discount_type === "percent"
                              ? `${coupon.discount_value}%`
                              : `R$ ${Number(coupon.discount_value).toFixed(2).replace(".", ",")}`}
                          </span>
                          {coupon.min_purchase > 0 && (
                            <span className="text-[10px] text-zinc-600 ml-2">
                              min R$ {Number(coupon.min_purchase).toFixed(2).replace(".", ",")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-zinc-300">
                            {coupon.used_count}{coupon.max_uses ? `/${coupon.max_uses}` : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-zinc-500">
                            {coupon.expires_at
                              ? new Date(coupon.expires_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
                              : "Sem limite"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            coupon.active
                              ? "bg-green-500/10 text-green-400"
                              : "bg-zinc-700/20 text-zinc-500"
                          }`}>
                            {coupon.active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleCoupon(coupon.id, !coupon.active)}
                              className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                                coupon.active
                                  ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                                  : "bg-green-600/20 hover:bg-green-600/30 text-green-400"
                              }`}
                            >
                              {coupon.active ? "Desativar" : "Ativar"}
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon.id)}
                              className="px-2.5 py-1 text-[11px] bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded transition-colors"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── GENERATIONS TAB ── */}
        {tab === "generations" && stats && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Geracoes Recentes</h2>
                <p className="text-sm text-zinc-500 mt-1">{stats.totalGenerations} geracoes no total</p>
              </div>
            </div>

            {stats.recentGenerations.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
                <p className="text-zinc-600 text-sm">Nenhuma geracao ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {stats.recentGenerations.map((gen) => (
                  <div key={gen.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    {/* Preview */}
                    <div className="aspect-square bg-zinc-800 relative overflow-hidden">
                      {gen.result_urls[0] ? (
                        gen.type === "video" ? (
                          <video src={gen.result_urls[0]} className="w-full h-full object-cover" muted preload="metadata" />
                        ) : (
                          <img src={gen.result_urls[0]} alt="" className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159" />
                          </svg>
                        </div>
                      )}
                      {gen.type === "video" && (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[9px] text-white">Video</div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded">{MODEL_LABELS[gen.model] || gen.model}</span>
                        <span className="text-[10px] text-zinc-600">{gen.cost} cred</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate mb-1">{gen.prompt || "Sem prompt"}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-zinc-600 truncate">{gen.user_name}</p>
                        <p className="text-[10px] text-zinc-600">{formatRelative(gen.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trained Models Tab */}
        {tab === "templates" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Workflow Templates</h2>
                <p className="text-sm text-zinc-500 mt-1">{templates.length} templates no total</p>
              </div>
              <button
                onClick={() => { setShowCreateTemplate(true); fetchUserWorkflows(); }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg"
              >
                + Criar Template
              </button>
            </div>

            {/* Create template modal */}
            {showCreateTemplate && (
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 mb-6">
                <h3 className="text-sm font-medium text-white mb-4">Criar Template a partir de Workflow</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Workflow de origem</label>
                    <select
                      value={selectedWorkflowId}
                      onChange={(e) => setSelectedWorkflowId(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
                    >
                      <option value="">Selecionar workflow...</option>
                      {userWorkflows.map((w) => (
                        <option key={w.id} value={w.id}>{w.name || "untitled"}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Categoria</label>
                    <select
                      value={newTemplateCategory}
                      onChange={(e) => setNewTemplateCategory(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
                    >
                      <option value="geral">Geral</option>
                      <option value="imagem">Imagem</option>
                      <option value="video">Video</option>
                      <option value="avatar">Avatar</option>
                      <option value="lora">LoRA</option>
                      <option value="edicao">Edicao</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Nome do template</label>
                    <input
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Ex: Animar Foto"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Descricao</label>
                    <input
                      value={newTemplateDesc}
                      onChange={(e) => setNewTemplateDesc(e.target.value)}
                      placeholder="Descricao curta..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-xs text-zinc-500 mb-1 block">Foto de capa</label>
                  <div className="flex items-center gap-3">
                    {newTemplateThumbnail && (
                      <img src={newTemplateThumbnail} alt="Capa" className="w-20 h-14 object-cover rounded-lg border border-zinc-700" />
                    )}
                    <label className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${uploadingThumbnail ? "bg-zinc-700 text-zinc-500" : "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700"}`}>
                      {uploadingThumbnail ? "Enviando..." : newTemplateThumbnail ? "Trocar imagem" : "Upload imagem"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingThumbnail}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingThumbnail(true);
                          try {
                            const url = await uploadThumbnail(file);
                            setNewTemplateThumbnail(url);
                          } catch { alert("Erro ao enviar imagem"); }
                          setUploadingThumbnail(false);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {newTemplateThumbnail && (
                      <button onClick={() => setNewTemplateThumbnail("")} className="text-xs text-red-400 hover:text-red-300">Remover</button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!selectedWorkflowId || !newTemplateName) return;
                      await fetch("/api/admin/templates", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          workflowId: selectedWorkflowId,
                          name: newTemplateName,
                          description: newTemplateDesc,
                          category: newTemplateCategory,
                          thumbnail: newTemplateThumbnail || null,
                        }),
                      });
                      setShowCreateTemplate(false);
                      setNewTemplateName("");
                      setNewTemplateDesc("");
                      setSelectedWorkflowId("");
                      setNewTemplateThumbnail("");
                      fetchTemplates();
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg"
                  >
                    Criar
                  </button>
                  <button
                    onClick={() => setShowCreateTemplate(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {templatesLoading ? (
              <div className="text-center py-10 text-zinc-500 text-sm">Carregando...</div>
            ) : templates.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
                <p className="text-zinc-600 text-sm">Nenhum template criado ainda</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left">
                      <th className="py-3 px-4 text-xs font-medium text-zinc-500">Capa</th>
                      <th className="py-3 px-4 text-xs font-medium text-zinc-500">Nome</th>
                      <th className="py-3 px-4 text-xs font-medium text-zinc-500">Categoria</th>
                      <th className="py-3 px-4 text-xs font-medium text-zinc-500">Status</th>
                      <th className="py-3 px-4 text-xs font-medium text-zinc-500">Usos</th>
                      <th className="py-3 px-4 text-xs font-medium text-zinc-500">Data</th>
                      <th className="py-3 px-4 text-xs font-medium text-zinc-500">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((t: { id: string; name: string; description: string; category: string; thumbnail: string | null; is_published: boolean; featured: boolean; usage_count: number; created_at: string }) => (
                      <tr key={t.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-3 px-4">
                          {t.thumbnail ? (
                            <img src={t.thumbnail} alt="" className="w-14 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-14 h-10 bg-zinc-800 rounded flex items-center justify-center text-zinc-600 text-[10px]">Sem capa</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-zinc-300">{t.name}</div>
                          {t.description && <div className="text-xs text-zinc-500">{t.description}</div>}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400">{t.category}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            t.is_published
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                          }`}>
                            {t.is_published ? "publicado" : "rascunho"}
                          </span>
                          {t.featured && (
                            <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/20">
                              destaque
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-500">{t.usage_count}</td>
                        <td className="py-3 px-4 text-sm text-zinc-500">{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                await fetch("/api/admin/templates", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: t.id, is_published: !t.is_published }),
                                });
                                fetchTemplates();
                              }}
                              className={`text-xs ${t.is_published ? "text-yellow-400 hover:text-yellow-300" : "text-green-400 hover:text-green-300"}`}
                            >
                              {t.is_published ? "Despublicar" : "Publicar"}
                            </button>
                            <button
                              onClick={async () => {
                                await fetch("/api/admin/templates", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: t.id, featured: !t.featured }),
                                });
                                fetchTemplates();
                              }}
                              className="text-xs text-purple-400 hover:text-purple-300"
                            >
                              {t.featured ? "Remover destaque" : "Destacar"}
                            </button>
                            <button
                              onClick={() => setEditingTemplate({ ...t })}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              Editar
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm("Deletar este template?")) return;
                                await fetch(`/api/admin/templates?id=${t.id}`, { method: "DELETE" });
                                fetchTemplates();
                              }}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Deletar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Edit template modal */}
            {editingTemplate && (
              <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setEditingTemplate(null)}>
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-sm font-medium text-white mb-4">Editar Template</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Nome</label>
                      <input
                        value={editingTemplate.name}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Descricao</label>
                      <input
                        value={editingTemplate.description}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Categoria</label>
                      <select
                        value={editingTemplate.category}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200"
                      >
                        <option value="geral">Geral</option>
                        <option value="imagem">Imagem</option>
                        <option value="video">Video</option>
                        <option value="avatar">Avatar</option>
                        <option value="lora">LoRA</option>
                        <option value="edicao">Edicao</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Foto de capa</label>
                      <div className="flex items-center gap-3">
                        {editingTemplate.thumbnail && (
                          <img src={editingTemplate.thumbnail} alt="Capa" className="w-24 h-16 object-cover rounded-lg border border-zinc-700" />
                        )}
                        <label className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${editThumbnailUploading ? "bg-zinc-700 text-zinc-500" : "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700"}`}>
                          {editThumbnailUploading ? "Enviando..." : editingTemplate.thumbnail ? "Trocar" : "Upload"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={editThumbnailUploading}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setEditThumbnailUploading(true);
                              try {
                                const url = await uploadThumbnail(file);
                                setEditingTemplate({ ...editingTemplate, thumbnail: url });
                              } catch { alert("Erro ao enviar imagem"); }
                              setEditThumbnailUploading(false);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {editingTemplate.thumbnail && (
                          <button onClick={() => setEditingTemplate({ ...editingTemplate, thumbnail: null })} className="text-xs text-red-400 hover:text-red-300">Remover</button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={async () => {
                        await fetch("/api/admin/templates", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            id: editingTemplate.id,
                            name: editingTemplate.name,
                            description: editingTemplate.description,
                            category: editingTemplate.category,
                            thumbnail: editingTemplate.thumbnail,
                          }),
                        });
                        setEditingTemplate(null);
                        fetchTemplates();
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditingTemplate(null)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "trained-models" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Modelos Treinados (LoRA)</h2>
                <p className="text-sm text-zinc-500 mt-1">{trainedModels.length} modelos no total</p>
              </div>
            </div>

            {trainedModelsLoading ? (
              <div className="text-center py-10 text-zinc-500 text-sm">Carregando...</div>
            ) : trainedModels.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
                <p className="text-zinc-600 text-sm">Nenhum modelo treinado ainda</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left">
                      <th className="py-3 px-4 text-xs font-medium text-zinc-500">Usuario</th>
                      <th className="py-3 px-4 text-xs font-medium text-zinc-500">Nome</th>
                      <th className="py-3 px-4 text-xs font-medium text-zinc-500">Trigger</th>
                      <th className="py-3 px-4 text-xs font-medium text-zinc-500">Status</th>
                      <th className="py-3 px-4 text-xs font-medium text-zinc-500">Data</th>
                      <th className="py-3 px-4 text-xs font-medium text-zinc-500">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainedModels.map((m) => (
                      <tr key={m.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-3 px-4 text-sm text-zinc-400">{m.user_email || m.user_id.slice(0, 8)}</td>
                        <td className="py-3 px-4 text-sm text-zinc-300">{m.name}</td>
                        <td className="py-3 px-4 text-sm text-purple-400 font-mono">{m.trigger_word}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            m.status === "ready" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                            m.status === "training" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                            m.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-500">{new Date(m.created_at).toLocaleDateString("pt-BR")}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={async () => {
                              if (!confirm("Deletar este modelo?")) return;
                              await fetch("/api/admin/trained-models", {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: m.id }),
                              });
                              fetchTrainedModels();
                            }}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Deletar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* User History Modal */}
      {historyUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setHistoryUser(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <h3 className="text-lg font-semibold text-white">{historyUser.name || historyUser.email}</h3>
                <p className="text-xs text-zinc-500">{historyUser.email} — {historyUser.credits} creditos</p>
              </div>
              <button onClick={() => setHistoryUser(null)} className="text-zinc-500 hover:text-white transition-colors text-xl">&times;</button>
            </div>

            {/* Stats */}
            {historyStats && (
              <div className="px-6 py-3 border-b border-zinc-800 flex gap-6 text-xs">
                <div><span className="text-zinc-500">Total gasto:</span> <span className="text-red-400 font-semibold">{historyStats.totalSpent}</span></div>
                <div><span className="text-zinc-500">Total recebido:</span> <span className="text-green-400 font-semibold">{historyStats.totalAdded}</span></div>
                {Object.entries(historyStats.modelCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([model, count]) => (
                  <div key={model}><span className="text-zinc-500">{MODEL_LABELS[model] || model}:</span> <span className="text-zinc-300">{count}x</span></div>
                ))}
              </div>
            )}

            {/* Logs Table */}
            <div className="overflow-y-auto max-h-[60vh]">
              {historyLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="text-center py-16 text-zinc-600 text-sm">Nenhuma transacao</div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-zinc-900">
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-4 py-2 text-[10px] text-zinc-500 font-medium">Data/Hora</th>
                      <th className="text-left px-4 py-2 text-[10px] text-zinc-500 font-medium">Modelo</th>
                      <th className="text-left px-4 py-2 text-[10px] text-zinc-500 font-medium">Prompt</th>
                      <th className="text-center px-4 py-2 text-[10px] text-zinc-500 font-medium">Status</th>
                      <th className="text-right px-4 py-2 text-[10px] text-zinc-500 font-medium">Creditos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLogs.map((log) => {
                      const isDebit = log.amount < 0;
                      const statusColors: Record<string, string> = {
                        pending: "text-yellow-400 bg-yellow-500/10",
                        success: "text-green-400 bg-green-500/10",
                        fail: "text-red-400 bg-red-500/10",
                        refund: "text-blue-400 bg-blue-500/10",
                        cancel: "text-zinc-400 bg-zinc-500/10",
                        purchase: "text-emerald-400 bg-emerald-500/10",
                        admin: "text-purple-400 bg-purple-500/10",
                      };
                      const statusLabel: Record<string, string> = {
                        pending: "Pendente", success: "OK", fail: "Falha",
                        refund: "Reembolso", cancel: "Cancelado", purchase: "Compra", admin: "Admin",
                      };
                      const st = log.status || "success";
                      const modelLabel = log.model ? (MODEL_LABELS[log.model] || log.model) : log.reason.replace("generation_", "");

                      return (
                        <tr key={log.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                          <td className="px-4 py-2">
                            <span className="text-[11px] text-zinc-400">
                              {new Date(log.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                              {" "}
                              {new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-xs text-zinc-200">{modelLabel}</span>
                          </td>
                          <td className="px-4 py-2 max-w-[250px]">
                            <p className="text-[11px] text-zinc-500 truncate" title={log.prompt || ""}>{log.prompt || "-"}</p>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[st] || statusColors.success}`}>
                              {statusLabel[st] || st}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className={`text-xs font-semibold ${isDebit ? "text-red-400" : "text-green-400"}`}>
                              {isDebit ? "" : "+"}{log.amount}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {historyTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 px-6 py-3 border-t border-zinc-800">
                <button
                  onClick={() => openUserHistory(historyUser, Math.max(1, historyPage - 1))}
                  disabled={historyPage === 1}
                  className="px-2 py-1 text-[10px] bg-zinc-800 text-zinc-300 rounded disabled:opacity-30 hover:bg-zinc-700"
                >
                  Anterior
                </button>
                <span className="text-[10px] text-zinc-500">{historyPage} / {historyTotalPages}</span>
                <button
                  onClick={() => openUserHistory(historyUser, Math.min(historyTotalPages, historyPage + 1))}
                  disabled={historyPage === historyTotalPages}
                  className="px-2 py-1 text-[10px] bg-zinc-800 text-zinc-300 rounded disabled:opacity-30 hover:bg-zinc-700"
                >
                  Proxima
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
