"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UserCredits() {
  const router = useRouter();
  const [credits, setCredits] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("free");
  const [role, setRole] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || "");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("name, credits, role, plan")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("[UserCredits] error:", error.message);
        setName(user.email || "");
        return;
      }

      if (profile) {
        setCredits(profile.credits);
        setName(profile.name || user.email || "");
        setRole(profile.role);
        setPlan(profile.plan || "free");
      }
    }

    loadProfile();

    const handleCreditsUpdate = () => loadProfile();
    window.addEventListener("fluxo-credits-update", handleCreditsUpdate);

    const interval = setInterval(loadProfile, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("fluxo-credits-update", handleCreditsUpdate);
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const PLAN_LABELS: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    creator: "Creator",
    pro: "Pro",
  };

  return (
    <div className="flex items-center gap-2 relative">
      {/* Credits badge */}
      {credits !== null && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/90 backdrop-blur border border-zinc-700/50 rounded-xl">
          <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
          <span className="text-sm font-semibold text-zinc-100">{credits}</span>
        </div>
      )}

      {/* User avatar button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-900/90 backdrop-blur border border-zinc-700/50 rounded-xl hover:bg-zinc-800 transition-colors"
      >
        <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">
            {name ? name.charAt(0).toUpperCase() : "?"}
          </span>
        </div>
        <svg className={`w-3 h-3 text-zinc-400 transition-transform ${showMenu ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
            {/* User info header */}
            <div className="px-4 py-4 border-b border-zinc-800 bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-white">
                    {name ? name.charAt(0).toUpperCase() : "?"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-100 truncate">{name}</p>
                  <p className="text-xs text-zinc-500 truncate">{email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                  {PLAN_LABELS[plan] || plan}
                </span>
                {credits !== null && (
                  <span className="text-[10px] text-zinc-500">{credits} creditos</span>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="py-1.5">
              <a
                href="/dashboard"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                onClick={() => setShowMenu(false)}
              >
                <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
                </svg>
                Meus Workflows
              </a>

              <a
                href="/history"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                onClick={() => setShowMenu(false)}
              >
                <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Historico de Geracoes
              </a>
            </div>

            <div className="border-t border-zinc-800" />

            {/* Billing */}
            <div className="py-1.5">
              <a
                href="/pricing"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                onClick={() => setShowMenu(false)}
              >
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Comprar Creditos
              </a>

              <button
                onClick={async () => {
                  setShowMenu(false);
                  try {
                    const res = await fetch("/api/stripe/portal", { method: "POST" });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                  } catch { /* ignore */ }
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
                Gerenciar Assinatura
              </button>
            </div>

            {/* Admin */}
            {role === "admin" && (
              <>
                <div className="border-t border-zinc-800" />
                <div className="py-1.5">
                  <a
                    href="/admin"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                    </svg>
                    Painel Admin
                  </a>
                </div>
              </>
            )}

            {/* Logout */}
            <div className="border-t border-zinc-800" />
            <div className="py-1.5">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Sair da conta
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
