"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  credits: number;
  role: string;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creditAmounts, setCreditAmounts] = useState<Record<string, string>>({});

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 403) {
        setError("Acesso negado. Voce nao e admin.");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Erro ao carregar usuarios");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">Fluxo AI</h1>
            </a>
            <span className="text-xs bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-semibold text-white mb-6">Gerenciar Usuarios</h2>

        {error && (
          <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-zinc-500 text-center py-20">Carregando...</div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">
                      {user.name || "Sem nome"}
                    </p>
                    {user.role === "admin" && (
                      <span className="text-[10px] bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded">
                        admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Cadastro: {new Date(user.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-purple-400">{user.credits}</p>
                    <p className="text-[10px] text-zinc-500">creditos</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      value={creditAmounts[user.id] || ""}
                      onChange={(e) =>
                        setCreditAmounts((prev) => ({ ...prev, [user.id]: e.target.value }))
                      }
                      placeholder="100"
                      className="w-20 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => handleAddCredits(user.id)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {users.length === 0 && !error && (
              <p className="text-zinc-500 text-center py-10">Nenhum usuario cadastrado</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
